# AI Meeting Assistant — Final Plan

Free-tier, Supabase + Vercel, Playful Geometric design, guest-mode onboarding.

## UX principle: easy for everyone

- **Guest mode first.** Land straight on the Live Meeting console with a big "Start recording" button. No sign-up wall. Sign-up only prompted when the user tries to save a meeting, ask a question about notes, or connect Google Meet.
- **Progressive disclosure.** Settings + Google Meet sync hidden until the user has an account.
- **Plain-language empty states** with a single primary action per screen.
- **Mobile-first.** Bottom tab bar on phones, sidebar on desktop.
- **Reduced-motion respected**, min 48px tap targets, AAA contrast per the design spec.

## Design system: Playful Geometric (per your spec)

Tokens go into `src/styles.css` under `@theme`:

- Colors: off-white bg (`#FBF9F4`), slate-800 fg, violet/pink/yellow/mint accents
- Fonts loaded via `<link>` in `__root.tsx` head: display + body per your spec
- Chunky borders, hard offset shadows, rounded-2xl cards, bouncy easing `cubic-bezier(0.34,1.56,0.64,1)`
- Lucide icons at `strokeWidth={2.5}`, enclosed in colored circles
- Section decorations (giant circles, dashed SVG lines, rotated badges) as background layers

Composition: stable grid + wild decoration — no drifting into generic SaaS.

## Stack (all free at runtime)

| Piece              | Choice                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| Framework          | TanStack Start + Tailwind v4 + shadcn/ui                                   |
| Auth + DB          | **Supabase** (free tier)                                                   |
| LLM                | **Google Gemini API** direct (`gemini-2.5-flash`, free tier via AI Studio) |
| Google Meet        | Native Google OAuth 2.0, refresh token encrypted in Supabase               |
| Live transcription | Web Speech API (browser, free)                                             |
| Search             | Postgres FTS (`tsvector`) — no embeddings                                  |
| Host               | **Vercel Hobby** (retargeted from Cloudflare Workers)                      |

Only cost = Lovable build credits (5/day free) to generate the code.

## Routes

- `/` — Live Meeting console (works in guest mode; local-only state)
- `/notes` — locked until sign-in; shows "Sign up to save your meetings" CTA when guest
- `/settings` — Google Meet connect/disconnect, account, sign out
- `/auth` — email/password + Google sign-in
- `/api/auth/google/callback` — TSS server route, exchanges Meet OAuth code, encrypts + stores refresh token

Mobile: bottom tab bar (Live / Notes / Settings). Desktop: left rail sidebar.

## Backend (`createServerFn`)

- `askMeetingNotes({ query })` — pulls user's meeting summaries within a token budget, one Gemini call, returns `{ answer, citations }`
- `saveLiveMeeting({ transcript })` — insert + one Gemini call for title/summary/action items
- `listMeetings`, `getMeeting`, `deleteMeeting`, `searchMeetings` (FTS, no AI)
- `syncGoogleMeetTranscripts()` — decrypt refresh token → mint access token → Meet API v2 → save meetings
- `disconnectGoogleMeet()`

## Database (Supabase migration)

- `meetings(id, user_id refs auth.users, title, source, meet_conference_id, started_at, transcript, summary, action_items jsonb, search tsvector generated, created_at)` + GIN index on `search`
- `google_connections(user_id pk refs auth.users, refresh_token_ciphertext, scopes text[], updated_at)` — service-role only
- RLS: users own their `meetings`; `google_connections` locked to service_role
- Explicit `GRANT`s per table

## Setup you'll do once (all free, no card)

1. Create Supabase project → paste URL + anon key + service_role key
2. Create Google OAuth Web client in Google Cloud (scopes: `openid email profile meetings.space.readonly drive.readonly`) → paste client id + secret
3. Get Gemini API key from AI Studio → paste
4. Generate a 32-byte token encryption key locally (`openssl rand -base64 32`) → paste as `TOKEN_ENC_KEY`
5. Push to GitHub, import into Vercel Hobby, paste the env vars

I'll ship a `SETUP.md` with copy-pasteable commands for each step.

## Steps I'll do

1. Design system: tokens, fonts, decorative primitives (circle blobs, dashed connectors, bouncy button variants)
2. Retarget Vite adapter Cloudflare → Vercel; `vercel.json`
3. Supabase migration (tables, RLS, grants, FTS)
4. Auth pages (email + Google) + `_authenticated` route gate + guest-mode router logic
5. App shell: mobile bottom tabs, desktop sidebar, chunky Playful Geometric chrome
6. Live Meeting page: Web Speech API hook, live transcript view, "Save" flow (prompts sign-up if guest)
7. Notes page: meetings list, FTS search bar, Ask chat with token-budgeted Gemini call, detail view with summary + action items + full transcript
8. Settings: Google Meet connect (native OAuth popup), sync button, disconnect, sign out
9. SEO/meta, error/notFound boundaries, `prefers-reduced-motion` polish
10. `SETUP.md` + verify prod build locally

## Caveats

- Google Meet transcript API requires the connected account to be **Google Workspace** with transcripts enabled. Personal `@gmail.com` users get everything except historical Meet sync.
- Gemini free tier: ~15 requests/min on Flash. The Ask chat surfaces a friendly retry message on 429.
- Your Google OAuth client shows an "unverified app" warning until you submit for verification. Fine for personal use.
