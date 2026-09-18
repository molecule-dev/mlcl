---
name: pdf-invoices
intent: |
  - "Generate PDF invoices"
  - "Invoice download"
  - "Receipt PDF"
  - "Tax invoice"
  - "Printable invoice"
keywords: [pdf, invoice, receipt, tax, billing, document]
---

# PDF invoices (server-side render → download)

**When to copy this example:** the user wants downloadable invoice
PDFs. Pairs with `commerce/stripe-checkout/`. For B2B, tax compliance
often requires this.

## What you'll install

```bash
cd /workspace
# The PDF bond (core) + a rendering engine. Puppeteer = full HTML/CSS
# fidelity; -pdfkit is lighter but only approximates HTML as text.
npm install @molecule/api-pdf @molecule/api-pdf-puppeteer --workspace=api
```

## Bond wiring (api/bonds.ts or api/index.ts)

```typescript
import { setProvider } from '@molecule/api-pdf'
import { provider } from '@molecule/api-pdf-puppeteer' // or @molecule/api-pdf-pdfkit

setProvider(provider)
```

## Files in this example

| Path                        | What it does                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/lib/render-invoice.ts` | `renderInvoice(input) => Buffer`. Builds an escaped HTML invoice and renders it with `fromHTML` from the `@molecule/api-pdf` bond — no raw PDF library, so the engine is swappable. |
| `api/handlers/invoices.ts`  | `GET /invoices/:order_id.pdf` — looks up order, authorizes (must be the customer or an admin), renders, streams.                                                                    |

## Anti-patterns

- Do not render invoices on the client. Even a "for my eyes only"
  invoice must be server-rendered for legal validity.
- Do not import a PDF library (pdfkit/puppeteer) directly. Use the
  `@molecule/api-pdf` bond (`fromHTML` / `fromTemplate` / `merge` /
  `addWatermark`) so the engine is swappable — the concrete library
  is wired once in `bonds.ts`, never imported in handler/render code.
- Do not interpolate user data into the invoice HTML unescaped.
  `fromHTML` renders whatever markup it's given, so escape names,
  addresses, and line-item text first (this example's `esc()`).
- Do not skip tax fields. EU/UK invoices require seller VAT,
  buyer VAT (B2B), invoice number, issue date, line item tax %.
- Do not regenerate the PDF on every download. Generate once at
  order creation, store the file in the `uploads` bond, return a
  signed URL on subsequent requests.
- Do not forget to include the order number in the filename:
  `invoice-#1234.pdf` — easier for accountants.

## Verify

After purchase, user opens order detail → clicks Download invoice →
PDF downloads with seller info, line items, tax, totals, order
number → opens in any PDF reader.
