'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

import {
  formatScoutLightBlock,
  getScoutLight,
} from '@/lib/celestial';
import {
  scoutingFormSchema,
  type ScoutingFormValues,
} from '@/lib/schemas/scouting';
import { buildShotExamples } from '@/lib/shot-examples';
import { fetchInspirationPhotos } from '@/lib/fetch-nearby-photos';
import {
  isQuotaError,
  parseApiKeys,
  resolveModelName,
} from '@/lib/gemini-pool';
import {
  forwardGeocodeLocation,
} from '@/app/actions/reverse-geocode';
import { needsCoordinateLookup } from '@/lib/coords';
import type { BriefingResult, LocationPhoto } from '@/types/scouting';

async function resolveScoutLocation(
  data: ScoutingFormValues,
): Promise<ScoutingFormValues | { error: string }> {
  if (!needsCoordinateLookup(data.latitude, data.longitude)) {
    return data;
  }

  const place = await forwardGeocodeLocation(data.locationName);
  if (!place.ok) {
    return {
      error:
        place.error ||
        'Could not place this location on the map. Click the map or enter coordinates.',
    };
  }

  return {
    ...data,
    latitude: place.latitude,
    longitude: place.longitude,
    locationName: data.locationName.trim() || place.displayName,
  };
}

function successResult(
  data: ScoutingFormValues,
  markdown: string,
  photos: LocationPhoto[],
): BriefingResult {
  return {
    ok: true,
    markdown,
    photos,
    latitude: data.latitude,
    longitude: data.longitude,
    locationName: data.locationName,
  };
}

function buildPrompt(data: ScoutingFormValues): string {
  const light = getScoutLight(data.latitude, data.longitude);
  const examples = buildShotExamples(light, data.tags, data.locationName);
  const exampleBlock = examples
    .map(
      (item, index) =>
        `${index + 1}. [${item.tag}] ${item.title}\n   When: ${item.when}\n   Angle: ${item.angle}\n   Tip: ${item.tip}`,
    )
    .join('\n');

  return [
    'You are Aruna, a photography location scouting assistant.',
    'Write a concise structured Markdown briefing for a professional photographer.',
    '',
    `Location: ${data.locationName}`,
    `Coordinates: ${data.latitude}, ${data.longitude}`,
    `Tags: ${data.tags.join(', ')}`,
    '',
    'Computed light data for this exact pin (use these times — do not invent different clock times):',
    formatScoutLightBlock(light),
    '',
    'Starter shot examples (expand with place-specific detail, keep the times/angles):',
    exampleBlock,
    '',
    'Include these sections with ## headings:',
    '1. Location Snapshot',
    '2. Light & Angles (use the computed windows; explain sun bearing and where to face)',
    '3. Shot Examples (3 concrete setups with time + camera angle for this location)',
    '4. Gear & Exposure Suggestions',
    '5. Risks & Access Notes',
    '',
    'Be specific to the coordinates, tags, and place name. Keep total length under 550 words.',
  ].join('\n');
}

function buildSimulatedBriefing(
  data: ScoutingFormValues,
  reason?: string,
): string {
  const light = getScoutLight(data.latitude, data.longitude);
  const examples = buildShotExamples(light, data.tags, data.locationName);
  const notice = reason
    ? `\n> **Offline fallback:** ${reason}\n`
    : '';

  const exampleMarkdown = examples
    .map(
      (item) =>
        `### ${item.title}\n- **When:** ${item.when}\n- **Angle:** ${item.angle}\n- **Tip:** ${item.tip}`,
    )
    .join('\n\n');

  return [
    `# Aruna Briefing — ${data.locationName}`,
    notice,
    `**Coordinates:** \`${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}\``,
    `**Focus:** ${data.tags.join(' · ')}`,
    `**Date:** ${light.dateLabel} (${light.timezoneNote})`,
    '',
    '## Location Snapshot',
    `Scout pin at ${data.locationName}. Live AI prose resumes when Gemini is available; times below are still computed for this pin.`,
    '',
    '## Light & Angles',
    formatScoutLightBlock(light)
      .split('\n')
      .map((line) => `- ${line}`)
      .join('\n'),
    '',
    '## Shot Examples',
    exampleMarkdown,
    '',
    '## Gear & Exposure Suggestions',
    '- Tripod + remote release for low-light stability.',
    '- Bracket ±1 EV around your base exposure for highlight recovery.',
    '',
    '## Risks & Access Notes',
    '- Confirm public access and local regulations before setup.',
    '- Pack a headlamp with a red mode; leave no trace.',
  ].join('\n');
}

export async function generateArunaBriefing(
  input: ScoutingFormValues,
): Promise<BriefingResult> {
  const parsed = scoutingFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid scouting payload.' };
  }

  const resolved = await resolveScoutLocation(parsed.data);
  if ('error' in resolved) {
    return { ok: false, error: resolved.error };
  }

  const photosPromise = fetchInspirationPhotos({
    locationName: resolved.locationName,
    tags: resolved.tags,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    limit: 8,
  });

  const apiKeys = parseApiKeys(process.env.GEMINI_API_KEY);
  if (apiKeys.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const photos = await photosPromise;
    return successResult(
      resolved,
      buildSimulatedBriefing(
        resolved,
        'No GEMINI_API_KEY set — using local preview.',
      ),
      photos,
    );
  }

  const modelName = resolveModelName();

  // ponytail: free-tier quota is per key, so walk the pool on 429 before falling back
  for (const apiKey of apiKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const [result, photos] = await Promise.all([
        model.generateContent(buildPrompt(resolved)),
        photosPromise,
      ]);
      const markdown = result.response.text().trim();

      if (!markdown) {
        return { ok: false, error: 'Gemini returned an empty briefing.' };
      }

      return successResult(resolved, markdown, photos);
    } catch (error) {
      if (isQuotaError(error)) {
        continue;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to generate briefing.';
      return { ok: false, error: message };
    }
  }

  // ponytail: every key exhausted → local briefing so scout flow stays usable
  const photos = await photosPromise;
  return successResult(
    resolved,
    buildSimulatedBriefing(
      resolved,
      `Gemini quota hit on \`${modelName}\` for all ${apiKeys.length} key(s). Retry later, add more free keys to GEMINI_API_KEY (comma-separated), or switch GEMINI_MODEL (e.g. gemini-3.5-flash).`,
    ),
    photos,
  );
}
