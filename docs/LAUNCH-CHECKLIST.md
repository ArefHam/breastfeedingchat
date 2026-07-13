# Launch checklist

## Blockers

- [ ] The exposed Supabase secret key is revoked and a redacted key listing confirms it is gone.
- [ ] The correct n8n instance is connected; the secured replacement is validated and the legacy public webhook is disabled.
- [ ] Legal privacy/terms text and a public support contact are approved and linked in the UI.

## Database and backend

- [ ] `npx supabase db lint --linked` passes.
- [ ] `npx supabase db push --dry-run` shows only the expected migration.
- [ ] The migration is applied and generated database types replace the checked-in pre-deployment types.
- [ ] Both Edge Functions are deployed with legacy gateway verification disabled and explicit in-function user JWT validation confirmed.
- [ ] Registration works without mandatory confirmation and password policy matches the UI.
- [ ] Two-user RLS verification passes with known UUIDs.
- [ ] New chat, distinct conversation IDs, cross-device history, rename, delete, and account deletion pass.
- [ ] Duplicate request, retry, ten-per-minute limit, timeout, and n8n error cases pass.

## Client and delivery

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, and `npm run build` pass.
- [ ] `npm run verify:bundle` confirms no server credential, database URI, or direct n8n webhook in `dist`.
- [ ] GitHub Actions variables contain only the Supabase URL and publishable key.
- [ ] Persian RTL and English LTR are visually reviewed on 360, 390, 412, tablet, and desktop widths.
- [ ] The Pages workflow succeeds from `main` and `https://arefham.github.io/breastfeedingchat/` is smoke-tested.
- [ ] The recovery tag and `legacy/index-static-backup.html` are rechecked before merging.
