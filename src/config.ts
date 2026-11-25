import 'dotenv/config';

const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

const envModels = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || '')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 3000),
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: envModels[0] || DEFAULT_FALLBACK_MODELS[0],
  geminiModels: [...new Set([...envModels, ...DEFAULT_FALLBACK_MODELS])],
  // Digits only, with country code. Set in .env, never in code.
  whatsapp: (process.env.SPIRITUAL_GUIDE_WHATSAPP_NUMBER || '').replace(/\D/g, ''),
};
