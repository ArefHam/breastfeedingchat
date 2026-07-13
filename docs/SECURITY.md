# Security model

## Assets and trust boundaries

- User identity is established by Supabase Auth; the browser sends a short-lived user JWT to the Edge Function.
- The Edge Function revalidates the JWT and is the only component allowed to create messages or call n8n.
- Postgres row-level security restricts reads, title updates, and conversation deletion to the owning `auth.users` ID.
- Message write RPCs are executable only by `service_role`; a browser cannot fabricate assistant messages.
- The Edge Function validates ownership, message length, UUIDs, idempotency, language, and a rolling ten-requests-per-minute account limit before calling n8n.
- n8n receives only the current message and 12 prior completed messages. The browser never sees the webhook URL or credential.

## Abuse and privacy controls

- Request UUID uniqueness prevents replayed messages from creating duplicate records; an active duplicate returns 409, while a stale/failed request can be retried.
- A conversation deletion cascades to all messages. Account deletion removes the Auth user and cascades all conversations and messages.
- Safe Markdown permits a small element allowlist, skips raw HTML, blocks active URL protocols, and opens links with `noopener noreferrer`.
- Browser responses use no-store, strict CORS, and a restrictive Content Security Policy.
- The interface warns that the assistant is educational support, not emergency or diagnostic care. The clinical prompt must retain emergency-escalation and uncertainty behavior.

## Known pre-launch requirements

- Revoke every previously exposed Supabase secret and rotate any credential that may have been copied alongside it.
- Connect Codex/n8n administration to the correct `n8n.eveai.cloud` instance and apply `docs/N8N-HARDENING.md`.
- Have qualified counsel/clinical governance approve the privacy notice, terms, retention statement, crisis language, and public support contact.
- Review the RAG corpus for currency, provenance, and breastfeeding guidance appropriate to the target countries and languages.
- Define incident response, access logging, abuse reporting, and deletion-support processes before accepting real patient information.
