# n8n hardening handoff

The legacy browser calls `https://n8n.eveai.cloud/webhook/...`. The n8n MCP connection available during implementation resolves to `https://mindn8n.eveai.cloud`, where the breastfeeding workflow is not present. Those are different instances, so no live workflow was edited.

## Verified state on 2026-07-15

- The remote Supabase project has no deployed Edge Functions, no configured Edge Function secrets, and no `conversations` table. The browser therefore stops at the missing Supabase `chat` endpoint and cannot call n8n.
- Remote database lint passes. `supabase db push --dry-run` would apply only `20260713190000_create_private_chat.sql`; no migration has been applied.
- The supplied nine-node workflow fails runtime validation with two errors: the `Output Json` raw expression is not valid JSON, and the Webhook response-node flow does not guarantee a response on error.
- The supplied workflow still uses Redis memory, ignores the `history`, `requestId`, and `lang` fields sent by Supabase, exposes an unauthenticated production webhook, has no fallback for invalid input, and has no structured upstream error response.
- The available n8n administration connection still targets `mindn8n.eveai.cloud`, not the workflow's `n8n.eveai.cloud` instance.

Apply the following changes on the instance that owns the breastfeeding workflow. Duplicate the existing workflow first and keep the replacement inactive until every check passes.

## Required input and output

The Supabase Edge Function sends:

```json
{
  "msg": "the current user message",
  "sessionId": "the Supabase conversation UUID",
  "requestId": "an idempotency UUID",
  "lang": "fa",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

The only successful response contract is:

```json
{ "answer": "the assistant response" }
```

## Workflow changes

1. Duplicate the current workflow as `Breastfeeding Chat — Supabase Secure` and leave it inactive.
2. Configure the Webhook node for `POST`, response-via-Respond-to-Webhook, and n8n Header Auth. Create the credential in n8n—not in a Set/Code field—with header name `X-Chat-Secret` and the same random value stored in Supabase Function secrets.
3. Validate that `body.msg` is a non-empty string no longer than 4,000 characters; `body.sessionId` and `body.requestId` are UUIDs; `body.lang` is `fa` or `en`; `body.history` is an array of at most 12 role/content objects. Return a generic 400 JSON error for caller faults.
4. Remove `Redis Chat Memory1` and its `ai_memory` connection. Do not replace it with another persistent n8n memory node.
5. Build the agent input from the supplied history followed by a clearly delimited current user message. Treat retrieved material and message content as data, never as instructions that override the clinical/system prompt.
6. Keep the conversation UUID as the `sessionId` for tracing, but never use it as authentication. The header credential authenticates the caller.
7. Enable retry-on-fail for transient RAG/model operations with a small bounded policy (three attempts with backoff). Do not retry validation failures.
8. Route missing retrieval, invalid model output, model timeout, and upstream failure to sanitized error responses. Do not return node names, stack traces, prompts, retrieved documents, credential details, or provider payloads.
9. Ensure the final Respond-to-Webhook node returns exactly `{ "answer": "..." }` on success.
10. Set successful execution-body retention to none. Retain failed executions only long enough to troubleshoot, with the instance pruning policy set to 24 hours (`EXECUTIONS_DATA_PRUNE=true`, `EXECUTIONS_DATA_MAX_AGE=24`) where instance configuration is available.
11. Replace the generated RAG parameter `parameters0_Value` with a descriptive `query` parameter and explain the expected language, baby age, and clinical context in its `$fromAI()` description.
12. Remove the blank assignment from `Get Text1`, disable `returnIntermediateSteps`, and upgrade the HTTP Request Tool, Switch, and AI Agent node versions using the live instance's node schemas.
13. Return validation failures as HTTP 400 and sanitized RAG/model failures as HTTP 502/504. Every branch must terminate at a Respond-to-Webhook node.

## Activation order

1. Validate the inactive replacement in n8n and inspect its connections directly.
2. Test valid Persian and English messages plus invalid body, missing auth, missing retrieval, malformed model output, timeout, and provider failure.
3. Store the new n8n URL and header secret in Supabase Function secrets.
4. Deploy and test the Supabase `chat` Edge Function.
5. Activate the secured workflow.
6. Deactivate the public legacy workflow immediately, then verify its old webhook no longer responds.

Never paste the header secret into GitHub variables, browser environment variables, workflow text fields, issue comments, or chat.
