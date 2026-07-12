import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = readFileSync(resolve('.env.local'), 'utf8');
const key = env
  .split('\n')
  .find((l) => l.startsWith('GEMINI_API_KEY='))
  ?.split('=')
  .slice(1)
  .join('=')
  .trim()
  .split(',')[0];

if (!key) {
  console.error('no key');
  process.exit(1);
}

const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const prompt = `Find real photography references for scouting.
Location: Kuari Pass, India
Style tags: Astro

Return ONLY valid JSON array (max 6 items), no markdown:
[{"title":"","imageUrl":"https://...direct image...","pageUrl":"https://...","credit":"","why":"one sentence recreate tip","match":"exact-location|same-region|same-style"}]

Prefer Wikimedia Commons, Flickr, Unsplash, or news photo CDN direct image URLs of Kuari Pass night sky / milky way / Himalayan trek astrophotography near Kuari Pass / Joshimath / Garhwal.`;

const body = {
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  tools: [{ google_search: {} }],
};

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const json = await res.json();
console.log('status', res.status);
if (json.error) {
  console.log('error', JSON.stringify(json.error, null, 2));
  process.exit(1);
}
const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n');
console.log('text snippet:\n', text?.slice(0, 1500));
console.log(
  '\ngroundingChunks',
  JSON.stringify(json.candidates?.[0]?.groundingMetadata?.groundingChunks?.slice?.(0, 3), null, 2),
);
