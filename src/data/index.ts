import scriptureRaw from './scriptures.json';
import themesRaw from './themes.json';
import daily from './daily.json';
import prayerTopics from './prayer-topics.json';

export interface Verse { id: string; ref: string; text: string; why: string; translation: string }
export interface Theme { id: string; name: string; keywords: string[]; verseIds: string[]; experiencing: string; questions: string[]; nextStep: string }

// Scripture text comes ONLY from this verified dataset (KJV, public domain). The AI never supplies verse text.
export const verses: Verse[] = Object.entries(scriptureRaw as Record<string, string[]>).map(([id, [ref, text, why]]) => ({ id, ref, text, why, translation: 'KJV' }));
export const verseById = new Map(verses.map((v) => [v.id, v]));
export const themes: Theme[] = Object.entries(themesRaw as Record<string, any>).map(([id, t]) => ({ id, name: t.n, keywords: t.k, verseIds: t.v, experiencing: t.e, questions: t.q, nextStep: t.s }));
export const themeById = new Map(themes.map((t) => [t.id, t]));
export const dailyEntries = daily as { v: string; r: string; a: string; x: string; p: string }[];
export const prayerTopicVerse = prayerTopics as Record<string, string>;
