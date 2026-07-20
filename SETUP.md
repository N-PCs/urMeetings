# urMeetings — self-hosted setup (zero Lovable services)

This app is engineered so that after you export the code, **nothing bills
you through Lovable**. You bring your own Supabase project and your own
Google Gemini key. All free tiers.

---

## 1. Get your keys (all free, no credit card)

### Supabase (auth + database)
1. Sign up at https://supabase.com and create a new project.
2. Wait ~2 minutes for it to provision.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` / `publishable` key → `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `Project ID` (from the URL) → `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID`
4. Apply the schema — open **SQL Editor** and paste the contents of
   the latest migration in `supabase/migrations/` and run it.
   (Or use the Supabase CLI: `supabase db push`.)

### Google Gemini (the AI)
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API key** → **Create in new project**.
3. Copy the key → `GEMINI_API_KEY`.

Free tier is ~15 requests/min on `gemini-2.5-flash`. Plenty for personal use.

---

## 2. Run locally

```bash
cp .env.example .env.local
# fill in the values from step 1
bun install
bun run dev
```

Open http://localhost:8080

---

## 3. Deploy — pick one

### Option A: Vercel (easiest, free Hobby tier)
1. Push this repo to GitHub.
2. Import into Vercel: https://vercel.com/new
3. Vercel picks up `vercel.json` automatically (build uses
   `NITRO_PRESET=vercel`).
4. In **Settings → Environment Variables**, paste every var from
   `.env.example` (with your real values). Do this for **Production**,
   **Preview**, and **Development**.
5. Deploy. Done.

### Option B: Google Cloud Run (free tier: 2M req/month)
1. Install `gcloud` and log in: `gcloud auth login`
2. Set your project: `gcloud config set project YOUR-GCP-PROJECT`
3. Build & push:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR-GCP-PROJECT/urmeetings
   ```
4. Deploy:
   ```bash
   gcloud run deploy urmeetings \
     --image gcr.io/YOUR-GCP-PROJECT/urmeetings \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --set-env-vars "GEMINI_API_KEY=...,SUPABASE_URL=...,SUPABASE_PUBLISHABLE_KEY=...,VITE_SUPABASE_URL=...,VITE_SUPABASE_PUBLISHABLE_KEY=..."
   ```
5. Cloud Run gives you a public HTTPS URL. Done.

### Option C: Any Docker host (Fly, Railway, your VPS)
```bash
docker build -t urmeetings .
docker run -p 8080:8080 --env-file .env.local urmeetings
```

---


## 4. Live transcription — no cost

Live transcription uses the browser's built-in Web Speech API. Works in
Chrome / Edge / Safari. No API key, no server round-trip, no bill.

---

## 5. Costs summary

| Service | Free tier | Overage risk |
|---|---|---|
| Supabase | 500 MB DB, 50k MAU | None unless you cross limits |
| Gemini (AI Studio) | ~15 rpm on Flash | Requests just 429 — no card on file |
| Vercel Hobby | 100 GB bandwidth / mo | None unless you upgrade |
| Cloud Run | 2M req + 360k GB-s / mo | Requires billing account but stays $0 at personal scale |

Total expected cost: **$0** for personal use.

---

Made by **N-PCs (Neel)** — https://github.com/N-PCs