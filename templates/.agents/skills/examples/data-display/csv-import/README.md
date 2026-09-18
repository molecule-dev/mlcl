---
name: csv-import
intent: |
  - "Import data from CSV"
  - "Upload a spreadsheet"
  - "Bulk add records"
  - "Migrate from another tool via CSV"
  - "Excel import"
keywords: [csv, import, upload, bulk, migrate, excel, spreadsheet]
---

# CSV import (upload spreadsheet → preview → commit)

**When to copy this example:** the user wants to bulk-add records
from a spreadsheet — onboarding migrations, list uploads.

## What you'll install

```bash
cd /workspace
npm install csv-parse --workspace=api
```

## Files in this example

| Path                       | What it does                                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/handlers/import.ts`   | `POST /import/preview` parses + validates the first 50 rows; `POST /import/commit` re-validates every row and upserts each valid one scoped to the user (create new / update existing by email), returning a summary of imported / updated / skipped counts. |
| `app/pages/ImportPage.tsx` | File picker → preview table with errors highlighted → Cancel / Confirm buttons → busy indicator during commit → import summary.                                                                                                                              |

## Anti-patterns

- Do not commit invalid rows silently. Show every parse + validation
  error on the preview page so the user can fix the source file.
- Do not import everything in one transaction if it's >5k rows.
  Chunk into batches and stream progress.
- Do not invent `@molecule/api-csv-import`. CSV is a serialization
  format — `csv-parse` is the standard library.
- Do not skip duplicate detection. Prefer upserts on a natural
  key (email, SKU) and report counts (created vs updated).
- Do not upsert on the natural key ALONE in a multi-user app. A
  natural key like email is only unique WITHIN one user's rows —
  scope both the lookup AND the insert by `user_id`, or importing a
  common address overwrites another user's row (cross-tenant
  corruption) and new rows end up unowned.
- Do not trust uploaded CSVs to be UTF-8. Detect encoding and
  re-decode if BOM or alternate codepage is present.

## Verify

Upload `customers.csv` → preview shows 50 rows with 3 marked as
invalid (bad email format) → user clicks Confirm → a busy indicator
shows during the commit → final summary: "Imported 247, updated 0,
skipped 3."
