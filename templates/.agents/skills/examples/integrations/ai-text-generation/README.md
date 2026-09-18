---
name: ai-text-generation
intent: |
  - "Add AI"
  - "Summarize with AI"
  - "AI writing assistant"
  - "Generate text with an LLM"
  - "Rewrite / draft / explain with AI"
keywords: [ai, llm, gpt, claude, anthropic, openai, generate, summarize, rewrite, completion]
---

# Add an AI text feature (generate / summarize / rewrite)

**When to copy this example:** the user wants to add a single AI action to an
existing app — a "Summarize" button, a "Draft with AI" box, a "Rewrite" helper —
that sends a prompt to an LLM and shows the result. For a full conversational,
token-by-token streaming chat, use the `@molecule/app-ai-chat` feature package
instead (do not hand-roll a chat UI).

## What you'll install

```bash
cd /workspace
# AI core interface + the Anthropic provider bond:
npm install @molecule/api-ai @molecule/api-ai-anthropic --workspace=api
# Throttle the metered LLM call (any provider bond works; memory is fine for one node):
npm install @molecule/api-rate-limit @molecule/api-rate-limit-memory --workspace=api
```

`@molecule/app-ui`, `@molecule/app-i18n-react-i18next`, and `@molecule/api-bond`
are already present in a scaffolded app.

## Files in this example

| Path                                  | What it does                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/generate.ts`            | `POST /generate { prompt, mode? }` — throttles per user, calls the bonded AI provider via `@molecule/api-ai`, consumes the streamed `ChatEvent`s into one string, returns `{ text }`. Server-side so the API key is never exposed; forwards an abort signal so a client disconnect stops the metered upstream call. |
| `app/components/AiGenerateButton.tsx` | A prompt box + "Generate" button. POSTs to `/api/generate` and renders the returned text with loading/error states. Never calls the model directly from the browser.                                                                                                                                                |

## Required env

```
ANTHROPIC_API_KEY=...   # server-side, read by @molecule/api-ai-anthropic
# or OPENAI_API_KEY=... if you wire setupAiOpenai() instead
```

## Bond wiring (api/bonds.ts or api/index.ts)

```typescript
import { setupAiAnthropic } from '@molecule/api-bonds-default-express'
import { setupRateLimitMemory } from '@molecule/api-bonds-default-express'

// Registers @molecule/api-ai-anthropic as the named 'anthropic' AI provider
// (reads ANTHROPIC_API_KEY). getProviderByName('anthropic') then resolves it.
await setupAiAnthropic()
// A rate-limit provider must be bonded for consume() to work.
await setupRateLimitMemory()
```

Prefer these setup helpers — they wire the provider under the correct bond name.
To swap providers, call `setupAiOpenai()` instead; the handler is unchanged
because it resolves the provider by name through `@molecule/api-ai`.

## Anti-patterns

- Do not import a vendor SDK (`@anthropic-ai/sdk`, `openai`) directly in a
  handler. Go through the `@molecule/api-ai` bond so the provider is swappable
  and the key stays in the bond's config. The registered core package is
  `@molecule/api-ai`; the providers are `@molecule/api-ai-anthropic` /
  `@molecule/api-ai-openai`. Do not invent names like `@molecule/api-claude`.
- Do not call the model from the browser. The API key would be exposed and
  usage would be unthrottleable. Always proxy through your API.
- Do not leave the LLM endpoint unthrottled. It is a metered, slow call — a
  runaway loop or abuse runs up the token bill and starves everyone else.
  Rate-limit per user with `consume()`. For a hard per-plan quota ("20
  generations/month on free, unlimited on pro"), wrap the route in
  `enforceLimit` from `@molecule/api-entitlements` — it reads the user's tier
  limit and blocks at the cap.
- Do not accept a client-supplied `system` prompt. Keep system instructions
  server-side; a caller-controlled system prompt is a jailbreak / cost-abuse
  vector on your metered key.
- Do not treat `provider.chat()` as returning a string. It returns an
  `AsyncIterable<ChatEvent>` even for a one-shot completion — you must
  `for await` it and accumulate the `{ type: 'text' }` events. Read final token
  usage from the `{ type: 'done' }` event.
- Do not ignore client disconnects. Forward an `AbortSignal` into `chat()` so a
  closed connection cancels the upstream request instead of billing tokens
  nobody reads.
- Do not hand-roll a streaming chat UI. If the user wants a conversational
  assistant with token-by-token output and history, use the
  `@molecule/app-ai-chat` feature package — it already handles the SSE stream,
  message list, and stop/retry.

## Verify

User types a prompt → clicks **Generate** → button shows "Generating…" →
the model's response renders in the result card. A rapid burst of clicks
returns HTTP 429 (rate-limited) rather than dispatching every call.
