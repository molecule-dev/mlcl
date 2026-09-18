---
name: full-text-search
intent: |
  - "Let users search"
  - "Search bar across my data"
  - "Search products / posts / users"
  - "Full-text search"
  - "Type-ahead / autocomplete search"
keywords: [search, find, lookup, filter, query, autocomplete, typeahead]
---

# Full-text search (typed query → ranked results)

**When to copy this example:** the user wants any "type → see
matching X" experience. Product search, user search, post search.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-search-meilisearch --workspace=api       # or -typesense
npm install @molecule/app-search-autocomplete-react --workspace=app # search input with typeahead popover
```

## Files in this example

| Path                              | What it does                                                                                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/bonds/search-meilisearch.ts` | Wires Meilisearch as the `search` bond.                                                                                                                                                                                                                                              |
| `api/lib/search-index.ts`         | The INDEX side — `indexProduct()`/`removeProduct()` to keep the index in sync on writes, `backfillProducts()` to seed existing rows. **Without this, search returns nothing** (an empty index). Wire it into your create/update/delete handlers + call the backfill once at startup. |
| `api/handlers/search.ts`          | `GET /search?q=...&index=products` — proxies to the search bond, flattening each hit's `document` fields to the shape the UI reads.                                                                                                                                                  |
| `app/pages/SearchPage.tsx`        | Debounced input + results list. URL-synced query.                                                                                                                                                                                                                                    |
| `app/locales/en/search.ts`        | Empty state, no-results, placeholders.                                                                                                                                                                                                                                               |

## Required env

```
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=...
```

## Anti-patterns

- Do not write search yourself with `LIKE '%foo%'` SQL queries —
  it's slow on big datasets and lacks ranking.
- Do not invent `@molecule/api-search` (without provider) or
  `@molecule/app-search` or `@molecule/app-search-input-react`. The packages are
  `@molecule/api-search-meilisearch` (or `-typesense`) +
  `@molecule/app-search-autocomplete-react`.
- Do not search-index private data without filtering by ACL on the
  query — Meilisearch supports filterable attributes; use them.
- Do not skip indexing on writes — this is the #1 reason search
  returns nothing. `handlers/search.ts` only QUERIES; the index stays
  EMPTY until you also index your rows (`api/lib/search-index.ts`).
  Wire create/update → `index()`, delete → `deleteDocument()` (there is
  NO `removeFromIndex()`), and backfill existing rows once at startup.

## Verify

Type "shoe" → results stream in within ~150ms → click a result →
detail page loads. Clear input → empty state.
