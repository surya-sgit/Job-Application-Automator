# Job Application Automator

Paste a job description → get a cleanly-formatted, JD-tailored one-page resume (PDF) → email it to HR in one click. Runs locally for free, or deploy it to Vercel (also free) to use it from your phone.

## Features
- **Tailor Resume** from any pasted JD, with AI clarifying questions first.
- **Multiple projects** in your profile — the tool auto-selects the ones that match each JD (locally, **zero API tokens**).
- **Any AI provider** — Claude, OpenAI, Gemini, Groq, or local Ollama. Pick in Settings.
- **One-page PDF** with auto-fit spacing (never overflows).
- **One-click Gmail send** with the resume attached + an AI-drafted email.
- Keys/creds entered in the UI, stored **encrypted**.
- Optional **password gate** for when it's deployed on the internet.

## Token-efficient pipeline
1. **Analyze** (cheap model) — extracts skills/keywords from the JD only.
2. **Match** (local, 0 tokens) — scores your stored projects, keeps the top few.
3. **Tailor** (main model) — sees only the JD analysis + matched projects, not your whole profile.

## Run locally
```bash
npm install
cp .env.example .env   # optional; set APP_SECRET to a long random string
npm run dev
```
Open http://localhost:3000. No `APP_PASSWORD` locally → no login screen. Profile/settings are stored in `./data` (gitignored).

1. **Settings** — pick a provider, paste its API key, add your Gmail + App Password.
2. **Profile** — fill your details and add all your projects.
3. **Tailor** — paste a JD, answer the questions, preview, download PDF, and/or email HR.

### Gmail App Password
Requires 2-Step Verification on your Google account. Create one at
https://myaccount.google.com/apppasswords and paste it in Settings.

## Deploy to Vercel (free)

Local file storage doesn't survive on a serverless host, so deployment uses a free **Upstash Redis** instance (attached from the Vercel Marketplace with a few clicks) instead of `./data/*.json`, and Puppeteer switches to a serverless-friendly Chromium build automatically — no code changes needed, this is already wired up.

1. **Push this repo to GitHub** (Vercel deploys from a Git repo).
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
   Create a new repo on https://github.com/new, then:
   ```bash
   git remote add origin <your-repo-url>
   git branch -M main
   git push -u origin main
   ```

2. **Import the repo on Vercel**
   - Go to https://vercel.com/new, sign in with GitHub, import this repo.
   - Framework preset: Next.js (auto-detected). Click **Deploy** once (it will fail to actually *work* until the env vars below are set — that's fine).

3. **Attach free Redis storage**
   - In the Vercel project → **Storage** tab → **Marketplace Database Providers** → choose a Redis / Upstash option (free tier) → connect it to this project.
   - This automatically injects the Redis env vars (`UPSTASH_REDIS_REST_URL`/`_TOKEN` or `KV_REST_API_URL`/`_TOKEN` depending on the integration) — you don't set these by hand.

4. **Set environment variables** (Project → Settings → Environment Variables):
   | Variable | Value |
   |---|---|
   | `APP_SECRET` | any long random string (encrypts your stored keys) |
   | `APP_PASSWORD` | the password you'll use to log into the app |

   (AI provider keys and Gmail creds are entered later in the app's Settings page — you don't need to set them here.)

5. **Redeploy** (Deployments tab → ⋯ → Redeploy) so the new env vars and KV binding take effect.

6. Open your `*.vercel.app` URL → log in with `APP_PASSWORD` → fill in **Settings** and **Profile** → use it from any device.

### Notes on the free tier
- Vercel Hobby plan, Upstash's free Redis tier, and your chosen AI provider's free/pay-as-you-go tier are all $0 to start.
- PDF generation on serverless uses `@sparticuz/chromium` + `puppeteer-core`; if it ever fails after a Vercel platform update, the fix is usually bumping that package's version to match — see its README's Chromium/Vercel compatibility notes.
- Anyone with your `APP_PASSWORD` can use the app (and whatever AI/Gmail keys you've configured in it) — keep it private, and treat it as sensitive as the keys themselves.

## Notes
- Local dev data lives in `./data` (gitignored). Delete it to reset.
- Puppeteer downloads a local Chromium build on first `npm install` (used for local dev only).
