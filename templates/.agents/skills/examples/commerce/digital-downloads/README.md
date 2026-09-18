---
name: digital-downloads
intent: |
  - "Sell digital products"
  - "Downloadable files after purchase"
  - "PDFs / fonts / templates / e-books for sale"
  - "License keys"
  - "Buy and download"
keywords: [digital, download, ebook, license, file-product, gumroad]
---

# Digital downloads (sell digital files; deliver via signed URL)

**When to copy this example:** the user sells digital goods (PDFs,
fonts, design templates, e-books). Different from
`commerce/stripe-checkout/` (which is the payment); this is the
post-payment file delivery.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-uploads-s3 --workspace=api  # for the file storage
# Stripe assumed already wired (see commerce/stripe-checkout/).
```

## Bond wiring (api/bonds.ts or api/index.ts)

The handlers below call `getProvider()`/`hasProvider()` from `@molecule/api-uploads`,
so the S3 bond must be wired at startup — without this, every upload/download hits
the `hasProvider()` guard and returns `503`.

```typescript
import { setProvider } from '@molecule/api-uploads'
import { provider } from '@molecule/api-uploads-s3'

setProvider(provider)
```

## Files in this example

| Path                            | What it does                                                                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/products.ts`      | Public storefront (`GET /`, `GET /:id`) + admin `POST /` that streams the deliverable file to the uploads bond and records a catalog row (title + price cents + storage key). Never exposes `storage_key`.                                                                            |
| `api/handlers/downloads.ts`     | `GET /downloads/:order_id` — verifies the caller owns a **paid** order and hasn't spent the download cap, then streams the file through an authenticated route (increments a per-order counter). `GET /downloads` lists the caller's purchases.                                       |
| `api/connect-busboy.d.ts`       | Type stub for the untyped `connect-busboy` package — copy it so the handler's `import connectBusboy from 'connect-busboy'` + `req.busboy` type-check (TS7016 otherwise). `connect-busboy` itself is already installed (it ships with `@molecule/api-middleware-body-parser-express`). |
| `app/pages/MyDownloadsPage.tsx` | Buyer's purchased-downloads list with an authenticated Download button per item (shows downloads remaining; disables when the cap is spent).                                                                                                                                          |

## Anti-patterns

- Do not put the file on a public/guessable path or hand out a
  permanent link. The uploads bond exposes no signed-URL method —
  serve the file ONLY through the ownership-checked `/downloads`
  route (load the order, 404 if it isn't the caller's, then
  `getProvider().getFile(storage_key)` → `stream.pipe(res)`).
- Do not invent `@molecule/api-digital-downloads`. Composition
  is `api-uploads-*` (file storage) + `api-payments-*` (the charge,
  wired by `commerce/stripe-checkout/`) + your handler logic.
- Do not skip a download counter / cap if the file is high-value.
  3 downloads per purchase is a sane default (enforced in
  `downloads.ts`).
- Do not return `storage_key` to the storefront. It's the internal
  uploads-bond file id; the buyer never needs it and leaking it
  (plus a misconfigured bucket) is a way to grab the file unpaid.
- Do not deliver the file on Stripe's success page. The user
  hasn't returned to YOUR app yet — webhooks finalize the
  purchase, then the user finds the file in My Downloads.

## Verify

Admin uploads a product (file + price + title) → user buys it
(see `commerce/stripe-checkout/`) → webhook flips the order to
`paid` → user opens My Downloads → the item is listed → click
Download → the file downloads. After 3 downloads the button
disables and a 4th request returns `429`.
