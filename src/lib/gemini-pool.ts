import { GoogleGenerativeAI } from '@google/generative-ai';

/** Free-tier friendly default; override with GEMINI_MODEL in .env.local */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

/** GEMINI_API_KEY accepts one key or a comma-separated pool of free-tier keys. */
export function parseApiKeys(
  raw: string | undefined = process.env.GEMINI_API_KEY,
): string[] {
  return (raw ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
}

export function resolveModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('429') ||
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('too many requests') ||
    message.includes('RESOURCE_EXHAUSTED')
  );
}

/**
 * JSON-mode Gemini call that walks the free-key pool on quota errors.
 * Returns null on any failure (no key, all keys exhausted, bad JSON) —
 * callers must have a non-AI fallback.
 */
export async function generateJsonWithPool<T>(
  prompt: string,
  validate: (value: unknown) => value is T,
): Promise<T | null> {
  const apiKeys = parseApiKeys();
  if (apiKeys.length === 0) {
    return null;
  }

  const modelName = resolveModelName();

  for (const apiKey of apiKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (!text) {
        return null;
      }
      const parsed: unknown = JSON.parse(text);
      return validate(parsed) ? parsed : null;
    } catch (error) {
      if (isQuotaError(error)) {
        continue;
      }
      return null;
    }
  }

  return null;
}
