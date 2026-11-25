import { AIProvider } from './provider';
import { config } from '../config';

function parseJsonSafe(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Invalid JSON from model');
  }
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  lastModel: string | null = null;
  lastError: string | null = null;
  private preferredModel: string | null = null;
  private unsupportedModels = new Set<string>();

  available() {
    return !!config.geminiKey;
  }

  private getModelChain(): string[] {
    const base = config.geminiModels.filter((m) => !this.unsupportedModels.has(m));
    const list = base.length ? base : config.geminiModels;
    if (this.preferredModel && list.includes(this.preferredModel)) {
      return [this.preferredModel, ...list.filter((m) => m !== this.preferredModel)];
    }
    return list;
  }

  private async callModel(model: string, system: string, user: string): Promise<unknown> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 1500 },
      }),
      signal: AbortSignal.timeout(18000),
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errBody: any = await res.json();
        if (errBody?.error?.message) detail += ` (${errBody.error.message.slice(0, 120)})`;
      } catch { /* ignore */ }
      if (res.status === 404) {
        this.unsupportedModels.add(model);
      }
      const err: any = new Error(`${model}: ${detail}`);
      err.status = res.status;
      throw err;
    }

    const data: any = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') ?? '';
    if (!text) throw new Error(`${model}: Empty response`);
    return parseJsonSafe(text);
  }

  async generateJson(system: string, user: string): Promise<unknown> {
    const models = this.getModelChain();
    const errors: string[] = [];

    for (const model of models) {
      try {
        const parsed = await this.callModel(model, system, user);
        this.preferredModel = model;
        this.lastModel = model;
        this.lastError = null;
        return parsed;
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(msg);
        // If API key itself is invalid (401/403 with API_KEY_INVALID), no other Gemini model will succeed
        if (err?.status === 401 || (err?.status === 400 && /API_KEY_INVALID/i.test(msg))) {
          break;
        }
      }
    }

    this.lastModel = null;
    this.lastError = errors.join(' | ');
    throw new Error(`All Gemini models failed: ${this.lastError}`);
  }
}

export const ai: AIProvider = new GeminiProvider();
