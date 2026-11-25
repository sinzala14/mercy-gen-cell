const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

export interface EnvSource {
  PORT?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_MODELS?: string;
  SPIRITUAL_GUIDE_WHATSAPP_NUMBER?: string;
}

function buildModels(src: EnvSource): string[] {
  const envModels = (src.GEMINI_MODELS || src.GEMINI_MODEL || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([...envModels, ...DEFAULT_FALLBACK_MODELS])];
}

const initialEnv: EnvSource = typeof process !== 'undefined' && process.env ? (process.env as EnvSource) : {};
const initialModels = buildModels(initialEnv);

export const config = {
  port: Number(initialEnv.PORT || 3000),
  geminiKey: initialEnv.GEMINI_API_KEY || '',
  geminiModel: initialModels[0],
  geminiModels: initialModels,
  // Digits only, with country code. Set in .env or Cloudflare secrets, never in code.
  whatsapp: (initialEnv.SPIRITUAL_GUIDE_WHATSAPP_NUMBER || '').replace(/\D/g, ''),
};

export function applyEnv(src: EnvSource) {
  const models = buildModels(src);
  if (src.PORT) config.port = Number(src.PORT);
  if (src.GEMINI_API_KEY !== undefined) config.geminiKey = src.GEMINI_API_KEY || '';
  config.geminiModel = models[0];
  config.geminiModels = models;
  if (src.SPIRITUAL_GUIDE_WHATSAPP_NUMBER !== undefined) {
    config.whatsapp = (src.SPIRITUAL_GUIDE_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  }
}
