import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * Client-safe catalog of LLM / AI integrations used by the platform.
 * Secrets never live here — they are Edge Function env secrets.
 *
 * Add new providers here as we wire more LLM tools.
 */
export type LlmApiId = 'image_generator';

export type LlmApiEntry = {
  id: LlmApiId;
  /** Human label (English key; UI uses locale) */
  name: string;
  /** Supabase Edge Function name that proxies the provider */
  edgeFunction: string;
  /** Optional public flag — disables Generate only; upload UI stays visible */
  clientEnabledEnv?: string;
};

export const LLM_APIS: Record<LlmApiId, LlmApiEntry> = {
  image_generator: {
    id: 'image_generator',
    name: 'Event image generator',
    edgeFunction: 'generate-event-image',
    clientEnabledEnv: 'VITE_IMAGE_GENERATOR_ENABLED',
  },
};

export function isLlmApiEnabled(id: LlmApiId): boolean {
  const entry = LLM_APIS[id];
  if (!entry.clientEnabledEnv) return true;
  const raw = import.meta.env[entry.clientEnabledEnv] as string | undefined;
  // Opt-out: unset/empty = Generate on; set false/0/off/no to hide Generate (upload stays)
  if (raw == null || String(raw).trim() === '') return true;
  return !/^(0|false|no|off)$/i.test(String(raw).trim());
}

export function getLlmApi(id: LlmApiId): LlmApiEntry {
  return LLM_APIS[id];
}

/** Prefer edge `{ error }` / `{ message }` over generic non-2xx text. */
export async function readEdgeFunctionError(
  error: unknown,
  fallback: string,
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      /* ignore parse errors */
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: string }).message);
    if (msg && !msg.includes('non-2xx')) return msg;
  }
  return fallback;
}
