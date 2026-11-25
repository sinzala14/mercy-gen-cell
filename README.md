# Mercy Gen Cell SelfGuide

Bible-guided reflection app. **Stateless: no database, no accounts, no journal, nothing saved.** Node.js + TypeScript (Express) backend, plain HTML/CSS/JS frontend, white and orange theme. AI: Google Gemini.

## Run
```
npm install
cp .env.example .env     # then fill in GEMINI_API_KEY and SPIRITUAL_GUIDE_WHATSAPP_NUMBER
npm run dev              # http://localhost:3000
```
Production: `npm run build && npm start`. Tests: `npm test`.

## How it works
1. Crisis wording (self-harm, abuse, danger) is caught on the server **before** any AI call and gets a safety message plus the human WhatsApp option.
2. Gemini receives the person's text (as untrusted data) plus the list of verified verses, and may only pick verses **by id**. It writes themes, a short explanation, reflection questions, a next step and a prayer starter.
3. Verse references and text always come from `src/data/scriptures.json`, never from the model. Unknown ids are dropped; replies using forbidden phrases ("God told me…") are discarded.
4. If Gemini is not configured or fails, the app falls back to keyword matching so it still works.

## Configuration (.env)
- `GEMINI_API_KEY`: your Google AI key. Stays on the server, never sent to the browser.
- `GEMINI_MODEL`: defaults to `gemini-3.5-flash`. Change to any model your key can use.
- `SPIRITUAL_GUIDE_WHATSAPP_NUMBER`: digits only with country code, e.g. 260971234567.

## Privacy
Nothing the person types is stored or logged. Rate limiting uses in-memory counters only. Do not add request-body logging.

## Growing the Bible data
`src/data/scriptures.json` holds 18 KJV verses (`id: [reference, text, why]`). Add more verified verses and list their ids in `themes.json`. For a full Bible, load a licensed/public-domain dataset read-only at start-up.

## API
POST `/api/selfguide/analyze` `{situation}` · GET `/api/scriptures/search?q=` · GET `/api/daily` · GET `/api/prayer/topics` · POST `/api/prayer/generate` `{topic}` · POST `/api/escalation/whatsapp`
