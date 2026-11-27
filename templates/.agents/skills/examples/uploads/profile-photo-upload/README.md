---
name: profile-photo-upload
intent: |
  - "Let users upload a profile photo"
  - "User avatar upload"
  - "Pick + crop + upload an image"
  - "Photo upload with preview"
keywords: [upload, photo, image, avatar, profile, picture, file]
---

# Profile photo upload

**When to copy this example:** the user wants any image-upload flow
into their account. Same pattern works for product photos, document
attachments, etc. — change the storage destination + database column.

## What you'll install

```bash
cd /workspace
npm install @molecule/api-uploads-s3 --workspace=api          # OR -filesystem for local dev
npm install @molecule/app-file-dropzone-react @molecule/app-filesystem --workspace=app
# Optional: @molecule/app-image-crop-cropperjs --workspace=app  # only if you add client-side cropping (this example doesn't)
```

## Files in this example

| Path                             | What it does                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/bonds/uploads-s3.ts`        | Wires S3 as the `uploads` bond. Use `-filesystem` for local dev.                                                                                                                                     |
| `api/handlers/upload.ts`         | `POST /upload/avatar` streams a file to the `uploads` bond and saves a **serve URL** on `users.avatar`; `GET /upload/avatar/:fileId` streams the private object back (authenticated, avatar-scoped). |
| `app/pages/ProfilePhotoPage.tsx` | `FileDropzone` widget (`@molecule/app-file-dropzone-react`) → posts the file to `/upload/avatar`, renders the returned serve URL.                                                                    |

The uploaded photo is saved to the **framework `users.avatar` column** (a text column,
not `avatar_url`) — as the `/api/upload/avatar/<id>` serve URL, not the raw bucket URL.

## Mount the upload router with the others

Register it in `api/src/handlers/index.ts`, which `App/router.ts` mounts after session verification.

```ts
import uploadRouter from './upload.js'

router.use('/upload', uploadRouter)
```

The app-wide body parser leaves `multipart/form-data` bodies unread, so
`receiveUploads` (`@molecule/api-uploads`) reads the file on this route: it
checks the field, the type and the size, stores the file in the `uploads` bond,
and answers a refusal with a translated `{ error, errorKey }` before the handler
runs. Read the stored file with `getUploads(req, 'file')`. The parser also
removes stored files when the handler returns an error status.

Reserve `/api/upload/avatar/` URLs for the upload handler. In `App/router.ts`,
use `isManagedAvatar` from the example when wiring user updates. This keeps a
normal profile edit from registering an arbitrary file as an avatar.

```ts
import { t } from '@molecule/api-i18n'
import { isManagedAvatar } from '../handlers/upload.js'

mountDefaultUserCrudRoutes(router, {
  ...User,
  update: (req, res, next) => {
    if (isManagedAvatar(req.body?.avatar)) {
      res.status(400).json({
        error: t('upload.useAvatarRoute', {}, { defaultValue: 'Upload the avatar to set it.' }),
      })
      return
    }
    return User.update(req, res, next)
  },
})
```

## Required env (S3 variant)

The `@molecule/api-uploads-s3` bond reads these EXACT names (AWS-prefixed) — not `S3_*`:

```
AWS_S3_BUCKET=...
AWS_S3_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# optional: AWS_S3_ENDPOINT=... (S3-compatible services), AWS_S3_FORCE_PATH_STYLE=true
```

## Anti-patterns

- Do not store image bytes in the database. Use the `uploads` bond.
- Do not skip MIME type + file size validation server-side. Client
  validation can be bypassed: pass `types` and `maxFileBytes` to `receiveUploads`.
- Do not parse multipart yourself (busboy, multer, formidable). `receiveUploads`
  already refuses bad requests and removes partial files.
- **Do not render the provider's raw `location` URL as an `<img src>`.**
  Upload buckets are PRIVATE by default (a public bucket leaks every user's
  files), so a raw S3 URL 403s in the browser — it only "works" on the local
  filesystem bond, then silently breaks in production on S3. Save a serve URL
  and stream the object back through an authenticated route (`getFile`), as
  this example does. The `uploads` bond exposes no signed-URL method.
- **`getFile(id)` is unscoped — never expose it as a bare `/file/:id` route.**
  Every object shares one bucket, so an authenticated user could pass someone
  else's private file id. The `GET /upload/avatar/:fileId` route only streams a
  fileId that is registered as some user's `avatar` (avatars are shown to other
  users anyway) — that check is what stops the IDOR.
- Do not invent `@molecule/api-images` — image processing is
  `@molecule/api-image-sharp` (or `-jimp`); upload storage is
  `@molecule/api-uploads-*`. Two separate concerns.

## Verify

Upload a JPG → the bond stores it → `users.avatar` holds `/api/upload/avatar/<id>`
→ that route renders the image (works identically on S3 and filesystem) → the
avatar still shows after a page reload (it was persisted, not just echoed once).
