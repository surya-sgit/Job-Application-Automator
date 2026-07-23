# Job Application Automator

**Live Demo:** [job-application-automator-git-main-surya-sgits-projects.vercel.app](https://job-application-automator-git-main-surya-sgits-projects.vercel.app/)

Paste a job description → get a cleanly-formatted, JD-tailored one-page resume (PDF) → email it to HR in one click. Runs locally for free, or deploy it to Vercel (also free) to use it from your phone — with real per-user accounts.

## Features
- **Premium UI/UX:** Built with a stunning dark-mode glassmorphic aesthetic and fluid `framer-motion` animations for a sleek, modern feel.
- **Tailor Resume** from any pasted JD, with AI clarifying questions first.
- **Multiple projects** in your profile — the tool auto-selects the ones that match each JD (locally, **zero API tokens**).
- **Any AI provider** — Claude, OpenAI, Gemini, Groq, or local Ollama. Pick in Settings.
- **One-page PDF** with auto-fit spacing (never overflows).
- **One-click Gmail send** with the resume attached + an AI-drafted email.
- **Bank-Grade Security:** Keys/creds entered in the UI are stored using AES-256-GCM encryption, scoped strictly to your account.
- **Abuse Prevention:** Built-in PostgreSQL rate limiting on all AI endpoints and strict payload size constraints.
- **Real sign-up/login** (email + password) when deployed with a database — not a single shared password. Each account has its own profile, projects, and settings.

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
Open http://localhost:3000.

- **No `DATABASE_URL`**: single-user mode, no login screen, data in `./data` (gitignored). Fastest way to try it out.
- **With `DATABASE_URL`** (e.g. pointed at a free Neon Postgres db): real accounts — you'll be asked to sign up on first visit, and each account's data is isolated.

Either way:
1. **Settings** — pick a provider, paste its API key, add your Gmail + App Password.
2. **Profile** — fill your details and add all your projects.
3. **Tailor** — paste a JD, answer the questions, preview, download PDF, and/or email HR.

### Gmail App Password
Requires 2-Step Verification on your Google account. Create one at
https://myaccount.google.com/apppasswords and paste it in Settings.

## Deploy to Vercel (free)

Local file storage doesn't survive on a serverless host, and multiple people need isolated data, so deployment uses **Postgres** — `users` (email + hashed password) and `user_data` (per-user profile/settings) tables, auto-created on first use. Puppeteer also switches to a serverless-friendly Chromium build automatically — no code changes needed, this is already wired up. [Neon](https://neon.tech) has a free Postgres tier and is what this was built/tested against, but any Postgres `DATABASE_URL` works.

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

3. **Get a free Postgres database**
   - Easiest: in the Vercel project → **Storage** tab → **Marketplace Database Providers** → add a Neon/Postgres integration (free tier) → connect it to this project. This auto-injects `DATABASE_URL`.
   - Or create one yourself at https://neon.tech (free tier) and copy its connection string.
   - ⚠️ Use a **dedicated** database for this app — it creates and only ever touches its own `users`/`user_data` tables, but a dedicated database avoids any confusion with unrelated projects.

4. **Set environment variables** (Project → Settings → Environment Variables):
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | your Postgres connection string (skip if the Marketplace integration already injected it) |
   | `APP_SECRET` | any long random string (signs session tokens + encrypts stored keys) |

   (AI provider keys and Gmail creds are entered later in the app's Settings page, per account — you don't need to set them here.)

5. **Redeploy** (Deployments tab → ⋯ → Redeploy) so the new env vars take effect.

6. Open your `*.vercel.app` URL → **Sign up** for an account → fill in **Settings** and **Profile** → use it from any device.

### Notes on the free tier
- Vercel Hobby plan, Neon's free Postgres tier, and your chosen AI provider's free/pay-as-you-go tier are all $0 to start.
- PDF generation on serverless uses `@sparticuz/chromium` + `puppeteer-core`; if it ever fails after a Vercel platform update, the fix is usually bumping that package's version to match — see its README's Chromium/Vercel compatibility notes.
- Passwords are hashed with bcrypt before storage; sessions are signed JWTs in an httpOnly cookie. Each account's AI/Gmail keys are only ever accessible to that account.

## Notes
- Local dev data (no `DATABASE_URL`) lives in `./data` (gitignored). Delete it to reset.
- Puppeteer downloads a local Chromium build on first `npm install` (used for local dev only).
