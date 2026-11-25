// Runs BEFORE any AI call. Crisis input never gets a Scripture-only response.
const CRISIS = /(suicid|kill myself|end my life|want to die|self.?harm|hurt myself|abus|beat me|beats me|rape|molest|violen|in danger|unsafe)/i;
export const isCrisis = (t: string) => CRISIS.test(t);
const FORBIDDEN = [/god told me/i, /god has revealed/i, /proves that god wants/i, /god (is telling|wants) you to/i];
export const violatesTone = (s: string) => FORBIDDEN.some((r) => r.test(s));
