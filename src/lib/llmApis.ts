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
  /** Optional public flag — UI can hide generate when false */
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
  // Opt-in: unset/empty = disabled (upload still works without generator)
  if (raw == null || String(raw).trim() === '') return false;
  return /^(1|true|yes|on)$/i.test(String(raw).trim());
}

export function getLlmApi(id: LlmApiId): LlmApiEntry {
  return LLM_APIS[id];
}
