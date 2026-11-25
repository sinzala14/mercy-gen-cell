import 'dotenv/config';
import assert from 'node:assert/strict';
import { analyze, searchScriptures, generatePrayer } from './services/selfguide';
import { verseById } from './data';
(async () => {
  const c: any = await analyze('I want to die'); assert.equal(c.crisis, true);
  const r: any = await analyze("I'm afraid I'm making the wrong decision about my future"); assert.equal(r.crisis, false);
  assert.ok(r.scriptures.length > 0 && r.themes.length > 0);
  for (const s of r.scriptures) assert.ok([...verseById.values()].some((v) => v.ref === s.ref && v.text === s.text), 'verse must come from dataset');
  assert.ok(searchScriptures('John 3:16').length === 1);
  assert.ok((await generatePrayer('fear'))?.prayer);
  assert.equal(await generatePrayer('nonsense'), null);
  console.log('all tests passed');
})();
