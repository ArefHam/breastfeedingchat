# Breastfeeding Chat

A Persian and English assistant that answers mothers' breastfeeding and infant-feeding questions from a curated knowledge base.
Live at **[chat.eveai.cloud](https://chat.eveai.cloud)**.

## How it works

- **Answers:** a retrieval-augmented (RAG) agent in n8n looks up the knowledge base and writes the reply.
  Answers were checked against multiple-choice and open-ended question sets during development.
- **This branch (`main`):** the original single-file app, `index.html`. Persian right-to-left by default, with an
  English toggle; the reading direction follows the language of each message.
- **Next version** ([`codex/supabase-auth-history`](https://github.com/ArefHam/breastfeedingchat/tree/codex/supabase-auth-history)),
  in launch testing: accounts and saved conversations with Supabase Auth and Postgres row-level security,
  an Edge Function between the browser and the agent (so the browser never holds a secret or the agent's
  address), a build check that fails if a secret reaches the bundle, and Playwright tests in Persian RTL and
  English LTR at five screen widths.

## Run it

Open `index.html` in a browser. It needs a running n8n agent behind the webhook set in the file.

## Note

This assistant gives general information. It does not replace a doctor, midwife or lactation consultant.

Built by [Aref Hammadi](https://aref.eveai.cloud) at [EveAI](https://eveai.cloud).
