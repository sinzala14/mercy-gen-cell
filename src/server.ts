import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { z } from 'zod';
import { config } from './config';
import { analyze, generatePrayer, searchScriptures, whatsappUrl } from './services/selfguide';
import { dailyEntries, verseById, prayerTopicVerse } from './data';

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));
app.use(express.json({ limit: '10kb' }));
app.use('/api', rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests in a short time. Please wait a moment and try again.' },
})); // in-memory counters only

const api = express.Router();
api.post('/selfguide/analyze', async (req, res, next) => {
  try {
    const p = z.object({ situation: z.string().trim().min(3).max(2000) }).safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'Please describe your situation (at least 3 characters, up to 2000).' });
    res.json(await analyze(p.data.situation));
  } catch (err) {
    next(err);
  }
});
api.get('/scriptures/search', (req, res) => res.json({ results: searchScriptures(String(req.query.q || '').slice(0, 80)) }));
api.get('/daily', (_req, res) => {
  const d = dailyEntries[Math.floor(Date.now() / 864e5) % dailyEntries.length], v = verseById.get(d.v)!;
  res.json({ scripture: { ref: v.ref, text: v.text, translation: v.translation, why: v.why }, reflection: d.r, askYourself: d.a, action: d.x, prayerPrompt: d.p });
});
api.get('/prayer/topics', (_req, res) => res.json({ topics: Object.keys(prayerTopicVerse) }));
api.post('/prayer/generate', async (req, res, next) => {
  try {
    const p = z.object({ topic: z.string().max(40) }).safeParse(req.body);
    const r = p.success ? await generatePrayer(p.data.topic) : null;
    r ? res.json(r) : res.status(400).json({ error: 'Please choose a valid prayer topic.' });
  } catch (err) {
    next(err);
  }
});
api.post('/escalation/whatsapp', (_req, res) => res.json({ url: whatsappUrl() })); // link only; nothing the user typed is sent or kept
api.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use('/api', api);
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json({ error: 'Something went wrong on our end. Please try again.' }));
app.listen(config.port, () => console.log(`Mercy Gen Cell SelfGuide on :${config.port} (AI: ${config.geminiKey ? `Gemini [${config.geminiModels.join(' -> ')}]` : 'keyword fallback'})`));
