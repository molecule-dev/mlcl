---
name: file-attachments
intent: |
  - "Let users attach files to a record"
  - "PDF / document upload"
  - "Multiple files with download links"
  - "File library / asset library"
  - "Resume upload / contract upload"
keywords: [files, attachments, document, pdf, download, upload]
---

# File attachments (multiple files per record + downloads)

**When to copy this example:** the user wants users to attach
arbitrary files (PDFs, docs, etc.) to some other record (an order,
a ticket, a task). Different from `uploads/profile-photo-upload/` —
that one is single-image-per-user with image-only validation; this
one is multi-file per parent with broad MIME support and a download
endpoint.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-uploads-s3 --workspace=api        # OR -filesystem for local
npm install @molecule/app-file-dropzone-react --workspace=app
```

## Files in this example

| Path                                  | What it does                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/attachments.ts`         | `POST /attachments?parent_id=...` upload, `GET /attachments?parent_id=...` list, `GET /attachments/:id/download` authenticated ownership-checked stream, `DELETE /attachments/:id`. Every route scopes to a parent the caller owns (no IDOR).                                         |
| `api/connect-busboy.d.ts`             | Type stub for the untyped `connect-busboy` package — copy it so the handler's `import connectBusboy from 'connect-busboy'` + `req.busboy` type-check (TS7016 otherwise). `connect-busboy` itself is already installed (it ships with `@molecule/api-middleware-body-parser-express`). |
| `app/components/AttachmentsPanel.tsx` | Drag-and-drop `FileDropzone` (multi-file) + list of existing attachments with download links + delete.                                                                                                                                                                                |

## Anti-patterns

- Do not serve uploads from a public, guessable URL. Stream the
  download through an authenticated route that loads the row and 404s
  unless `row.user_id === session.userId`. The uploads bond exposes no
  signed-URL method — authenticated streaming via `getFile(id)` is the
  private-by-default path (and the only one that works for both the S3
  and `-filesystem` variants).
- Do not skip MIME + size validation server-side. Client validation
  can be bypassed.
- Do not invent `@molecule/api-attachments` — composition is
  `api-uploads-*` + a normal `attachments` table.
- Do not let users delete attachments belonging to another user's
  records — authorize on `parent.user_id === session.userId`.

## Verify

Drag a PDF onto the dropzone → file uploads → row appears in the
list → click "Download" → file streams from S3 / filesystem.
Delete → row removed, file removed from storage.
