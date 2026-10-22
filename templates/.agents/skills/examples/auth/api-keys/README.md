---
name: api-keys
intent: |
  - "API keys"
  - "Personal access tokens"
  - "Let users build integrations against my API"
  - "Programmatic access"
  - "Service tokens"
keywords: [api-key, token, pat, integration, programmatic, service-account]
---

# API keys (personal access tokens)

**When to copy this example:** the user wants to expose programmatic
access to their app — third-party integrations, CLI tools, webhooks.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-resource-api-key --workspace=api  # hashed tokens, verify, revoke, rotate
```

Run the resource's `src/__setup__/api_keys.sql` migration through the app's migration runner before using its handlers. The table is not created by installing the package.

## Files in this example

| Path                             | What it does                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/middleware/api-key-auth.ts` | Reads `Authorization: Bearer <token>`, calls `verifyApiKey()`, sets `res.locals.session` if valid, records use fire-and-forget.                                                                   |
| `api/handlers/api-keys.ts`       | List active keys (`masked` display only), create (returns `plaintext` once), revoke. Uses `@molecule/api-resource-api-key` for create/revoke and `@molecule/api-database` `findMany` for listing. |
| `app/pages/ApiKeysPage.tsx`      | Table of keys + "New key" button. After create, shows the plaintext token with a "Copy it now" warning (never shown again).                                                                       |

## Key shape

`@molecule/api-resource-api-key` stores:

| Field          | Notes                                                       |
| -------------- | ----------------------------------------------------------- |
| `name`         | Human-readable label (e.g. `"CI deploy key"`)               |
| `masked`       | Display-safe token (`sk_…ABCD`) — safe to surface in the UI |
| `hashed_token` | SHA-256 of the plaintext — **never returned to the client** |
| `scopes`       | Optional string array                                       |
| `last_used_at` | Updated fire-and-forget by `recordApiKeyUse()`              |
| `revoked_at`   | Non-null means the key is revoked                           |

## Anti-patterns

- Do not store API keys in plaintext. `createApiKey()` hashes with SHA-256 internally;
  `verifyApiKey()` rehashes and compares in constant time.
- Do not reveal a key after creation. Show the plaintext token
  exactly once in the response and warn the user.
- Do not invent `@molecule/api-tokens`, `@molecule/api-pat`, or
  `@molecule/api-auth-api-key`. The correct package is
  `@molecule/api-resource-api-key`.
- Do not use API keys as session tokens for the web app. They
  bypass MFA and have longer lifetimes; restrict to programmatic
  endpoints (often `/api/v1/*` separate from web routes).
- Do not skip rate-limit per-key. Without it, a leaked key DoSes
  your service before you notice.

## Verify

User creates a key → plaintext shown once → copies → curls
`/api/v1/me` with `Authorization: Bearer <key>` → 200 with their
profile. User revokes → next curl returns 401.
