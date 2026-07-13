# Breastfeeding Chat

A private Persian/English breastfeeding support app built with React, TypeScript, Vite, Supabase Auth/Postgres/Edge Functions, and an n8n RAG agent.

The original single-file app is preserved byte-for-byte in [`legacy/index-static-backup.html`](legacy/index-static-backup.html). The remote tag `pre-react-supabase-2026-07-13` points to the original `main` commit, and the implementation remains isolated on `codex/supabase-auth-history` until launch verification is complete.

## Architecture

```mermaid
flowchart LR
  B["React app on GitHub Pages"] -->|"Supabase Auth + user JWT"| E["Supabase Edge Function"]
  E -->|"service-only RPCs"| P[("Postgres with RLS")]
  E -->|"authenticated private webhook"| N["n8n RAG agent"]
  N -->|"answer response"| E
  E -->|"persist response"| P
  P -->|"owned conversations/messages only"]| B
```

The browser never receives the database password, a Supabase secret/service-role key, the n8n URL, or the n8n header credential. Supabase is the sole persistent conversation-memory store; n8n receives only the previous 12 completed messages for the current conversation UUID.

## Local development

Requirements: Node.js 22+, npm, Supabase CLI through `npx supabase`, and Chrome for the local Playwright suite.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Set only these public browser values in `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://amqdiqqlleqctezkfhcb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:bundle
npm run test:e2e
```

The E2E suite runs Persian RTL and English LTR at 360, 390, 412, 768, and 1440 pixels. `verify:bundle` fails if a Supabase secret, database URI, service-role text, or direct n8n webhook appears in `dist`.

## Supabase deployment

Do not continue while any key pasted into chat or source control remains active. Revoke it in Supabase Dashboard → Project Settings → API Keys. No replacement key needs to be given to Codex or committed: Supabase injects backend key material into hosted functions automatically.

```powershell
npx supabase link --project-ref amqdiqqlleqctezkfhcb
npx supabase db lint --linked
npx supabase db push --dry-run
npx supabase db push
npx supabase gen types typescript --linked --schema public > src/lib/database.types.ts
```

Create a gitignored `supabase/.env.functions` locally:

```dotenv
N8N_WEBHOOK_URL=https://your-correct-n8n-host/webhook/your-secured-path
N8N_WEBHOOK_SECRET=generate-a-long-random-secret
# Optional when the Supabase server key is not named "default":
SUPABASE_SECRET_KEY_NAME=edge-functions
```

Then apply secrets and deploy only after the correct n8n workflow is secured and validated:

```powershell
npx supabase secrets set --env-file supabase/.env.functions
npx supabase functions deploy chat
npx supabase functions deploy delete-account
```

In the remote Supabase Auth settings, enable Email/Password, disable mandatory email confirmation for v1, set the site URL to `https://arefham.github.io/breastfeedingchat/`, and keep the minimum password policy aligned with `supabase/config.toml` (10 characters with letters and digits). The functions deliberately disable the gateway's legacy JWT check because the app uses new publishable keys; each function extracts and validates the user's JWT before doing any work.

## Two-user RLS proof

After two test accounts each have a known conversation UUID, set the eight `RLS_*` environment variables listed by `scripts/verify-rls.mjs` and run:

```powershell
npm run test:rls
```

The script proves that both users can read their own conversation and cannot read, rename, or delete the other user's conversation.

## Deployment

Repository Actions variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The CI workflow verifies type safety, lint, unit tests, five responsive browser projects, the production build, and the bundle secret scan. The Pages workflow deploys only from `main`, so this feature branch cannot replace the current site prematurely.

See [`docs/N8N-HARDENING.md`](docs/N8N-HARDENING.md), [`docs/SECURITY.md`](docs/SECURITY.md), and [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md) before launch.
