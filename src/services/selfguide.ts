import { z } from 'zod';
import { ai } from '../ai/gemini';
import { SELFGUIDE_SYSTEM, PRAYER_SYSTEM } from '../ai/prompts';
import { verses, verseById, themes, themeById, prayerTopicVerse } from '../data';
import { isCrisis, violatesTone } from './safety';
import { config } from '../config';

const aiShape = z.object({
  themes: z.array(z.string()).max(5),
  experiencing: z.string().max(600),
  scriptures: z.array(z.object({ id: z.string(), why: z.string().max(400) })).max(6),
  reflection_questions: z.array(z.string().max(300)).max(5),
  next_step: z.string().max(500),
  prayer: z.string().max(900),
  needs_human: z.boolean().optional(),
});

export const whatsappUrl = () =>
  config.whatsapp ? `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hello, I came through Mercy Gen Cell SelfGuide and I'd like to speak with a spiritual guide about something I'm going through.")}` : null;

function keywordThemes(text: string): string[] {
  const l = text.toLowerCase();
  const ranked = themes.map((t) => ({ id: t.id, s: t.keywords.filter((k) => l.includes(k)).length })).filter((x) => x.s).sort((a, b) => b.s - a.s);
  return (ranked.length ? ranked.map((r) => r.id) : ['decision']).slice(0, 3);
}
const verseOut = (id: string, why?: string) => { const v = verseById.get(id)!; return { ref: v.ref, text: v.text, translation: v.translation, why: why || v.why }; };

function fallback(text: string) {
  const ids = keywordThemes(text), main = themeById.get(ids[0])!;
  const vids = [...new Set(ids.flatMap((i) => themeById.get(i)!.verseIds))].slice(0, 4);
  return {
    themes: ids.map((i) => ({ id: i, name: themeById.get(i)!.name })), experiencing: main.experiencing,
    scriptures: vids.map((id) => verseOut(id)), reflection_questions: main.questions, next_step: main.nextStep,
    prayer: 'Here is a prayer you can use as a starting point: Lord, I bring this situation to you. Give me wisdom, peace and the courage to take the next step. Amen.',
    needsHuman: false, aiUsed: false, modelUsed: 'keyword-fallback', aiWarning: null as string | null,
  };
}

export async function analyze(text: string) {
  if (isCrisis(text)) return { crisis: true as const, whatsappUrl: whatsappUrl() };
  let body: ReturnType<typeof fallback> = fallback(text);
  if (ai.available()) {
    try {
      const candidates = verses.map((v) => ({ id: v.id, reference: v.ref, text: v.text }));
      const raw = await ai.generateJson(SELFGUIDE_SYSTEM, `THEME_IDS: ${themes.map((t) => `${t.id} (${t.name})`).join(', ')}\nCANDIDATE_SCRIPTURES: ${JSON.stringify(candidates)}\n<situation>\n${text}\n</situation>`);
      const p = aiShape.parse(raw);
      const picked = p.scriptures.filter((s) => verseById.has(s.id)); // drop any hallucinated id
      const all = [p.experiencing, p.next_step, p.prayer, ...p.reflection_questions, ...picked.map((s) => s.why)].join(' ');
      if (picked.length && !violatesTone(all)) {
        const ids = p.themes.filter((t) => themeById.has(t));
        body = {
          themes: (ids.length ? ids : keywordThemes(text)).map((i) => ({ id: i, name: themeById.get(i)!.name })),
          experiencing: p.experiencing, scriptures: picked.map((s) => verseOut(s.id, s.why)),
          reflection_questions: p.reflection_questions, next_step: p.next_step, prayer: p.prayer,
          needsHuman: !!p.needs_human, aiUsed: true, modelUsed: 'Gen Spiritual Guide', aiWarning: null,
        };
      }
    } catch {
      /* fall back to keyword retrieval; never log user text */
      body.aiWarning = 'Gen Spiritual Guide was temporarily unavailable; showing verified KJV Scripture guidance matched by theme.';
    }
  }
  return { crisis: false as const, ...body, whatsappUrl: whatsappUrl() };
}

export async function generatePrayer(topic: string) {
  const vid = prayerTopicVerse[topic];
  if (!vid) return null;
  const v = verseById.get(vid)!;
  let prayer = `Lord, I bring ${topic} to you. Thank you for your word, ${v.ref}. Help me to trust you and take the next step in peace. Amen.`;
  let aiUsed = false;
  let modelUsed = 'keyword-fallback';
  if (ai.available()) {
    try {
      const r: any = await ai.generateJson(PRAYER_SYSTEM, `Topic: ${topic}\nPassage (${v.ref}, ${v.translation}): ${v.text}`);
      if (typeof r?.prayer === 'string' && !violatesTone(r.prayer)) {
        prayer = r.prayer;
        aiUsed = true;
        modelUsed = 'Gen Spiritual Guide';
      }
    } catch { /* keep template */ }
  }
  return { topic, prayer, scripture: verseOut(vid), aiUsed, modelUsed };
}

export function searchScriptures(q: string) {
  const s = q.toLowerCase().trim();
  const hit = (id: string) => { const v = verseById.get(id)!; return !s || v.ref.toLowerCase().includes(s) || v.text.toLowerCase().includes(s) || v.why.toLowerCase().includes(s) || themes.some((t) => t.verseIds.includes(id) && (t.name.toLowerCase().includes(s) || t.keywords.some((k) => k.startsWith(s)))); };
  return verses.filter((v) => hit(v.id)).map((v) => verseOut(v.id));
}
