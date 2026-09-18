---
name: csv-export
intent: |
  - "Export to CSV / Excel"
  - "Download data as a spreadsheet"
  - "Bulk export"
  - "Let me download my data"
  - "GDPR data export"
keywords: [csv, export, download, excel, spreadsheet, bulk, gdpr]
---

# CSV export (download filtered data as a spreadsheet)

**When to copy this example:** the user wants any "download my data
as a spreadsheet" feature — sales reports, customer exports,
GDPR data downloads.

## What you'll install

Nothing extra — Node's built-in CSV generation is fine for small to
medium exports. For very large exports (>100k rows), consider
streaming via `csv-stringify`.

## Files in this example

| Path                              | What it does                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `api/handlers/orders-export.ts`   | `GET /orders/export.csv?status=paid` streams CSV with `Content-Disposition: attachment`. |
| `app/components/ExportButton.tsx` | Triggers download via `<a href download>` so the browser handles save-as.                |

## Anti-patterns

- Do not buffer the entire result in memory before writing the
  response. For large datasets, stream rows as they're queried.
- Do not invent `@molecule/api-csv-export` — CSV is a serialization
  format, not a feature package.
- Do not skip column quoting. Values containing `,`, `"`, or
  newlines must be quoted with embedded `"` doubled to `""`.
- **Do not skip formula-injection escaping (CWE-1236).** A cell whose
  value starts with `=`, `+`, `-`, `@`, or a leading tab/CR executes as a
  formula in Excel/Sheets/LibreOffice — an attacker plants `=HYPERLINK(...)`
  or `=IMPORTXML(...)` in any field that reaches an export (a name, an email,
  a note) and it runs on the victim's machine when they open the file. Prefix
  such a cell with a single quote, but never a plain number (`-5` must stay
  numeric) — see `csvEscape`. The canonical `@molecule/api-import-export-csv`
  bond already guards this; if you roll your own, keep the guard.
- Do not ignore authorization. If the page is gated, the export
  endpoint must apply the same gate.
- Do not let users export records they can't see. The same
  `where` filters that limit list views must also limit exports.

## Verify

Click "Export CSV" with `status=paid` filter → file downloads named
`orders-2026-04-25.csv` → opens in Excel/Numbers with one column
per field → only paid orders, formatted dates, escaped commas.
