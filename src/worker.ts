import { z } from 'zod';
import { applyEnv, EnvSource } from './config';
import { analyze, generatePrayer, searchScriptures, whatsappUrl } from './services/selfguide';
import { dailyEntries, verseById, prayerTopicVerse } from './data';

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface WorkerEnv extends EnvSource {
  ASSETS: AssetsBinding;
}

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; img-src 'self' data:",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...SECURITY_HEADERS,
    },
  });
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 10_240) throw new Error('PAYLOAD_TOO_LARGE');
  return text ? JSON.parse(text) : {};
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    applyEnv(env);
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/')) {
      try {
        if (request.method === 'POST' && path === '/api/selfguide/analyze') {
          const body = await readJson(request);
          const p = z.object({ situation: z.string().trim().min(3).max(2000) }).safeParse(body);
          if (!p.success) {
            return json({ error: 'Please describe your situation (at least 3 characters, up to 2000).' }, 400);
          }
          return json(await analyze(p.data.situation));
        }

        if (request.method === 'GET' && path === '/api/scriptures/search') {
          const q = String(url.searchParams.get('q') || '').slice(0, 80);
          return json({ results: searchScriptures(q) });
        }

        if (request.method === 'GET' && path === '/api/daily') {
          const d = dailyEntries[Math.floor(Date.now() / 864e5) % dailyEntries.length];
          const v = verseById.get(d.v)!;
          return json({
            scripture: { ref: v.ref, text: v.text, translation: v.translation, why: v.why },
            reflection: d.r,
            askYourself: d.a,
            action: d.x,
            prayerPrompt: d.p,
          });
        }

        if (request.method === 'GET' && path === '/api/prayer/topics') {
          return json({ topics: Object.keys(prayerTopicVerse) });
        }

        if (request.method === 'POST' && path === '/api/prayer/generate') {
          const body = await readJson(request);
          const p = z.object({ topic: z.string().max(40) }).safeParse(body);
          const r = p.success ? await generatePrayer(p.data.topic) : null;
          return r ? json(r) : json({ error: 'Please choose a valid prayer topic.' }, 400);
        }

        if (request.method === 'POST' && path === '/api/escalation/whatsapp') {
          return json({ url: whatsappUrl() });
        }

        return json({ error: 'Endpoint not found.' }, 404);
      } catch (err: any) {
        if (err?.message === 'PAYLOAD_TOO_LARGE') {
          return json({ error: 'Request is too large.' }, 413);
        }
        return json({ error: 'Something went wrong on our end. Please try again.' }, 500);
      }
    }

    const assetRes = await env.ASSETS.fetch(request);
    const headers = new Headers(assetRes.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      if (!headers.has(k)) headers.set(k, v);
    }
    return new Response(assetRes.body, {
      status: assetRes.status,
      statusText: assetRes.statusText,
      headers,
    });
  },
};
