---
name: version-history
intent: |
  - "Version history"
  - "Revisions"
  - "Undo / restore previous version"
  - "Change history"
  - "Track changes over time"
keywords: [version, history, revision, undo, restore, snapshot, edit-log]
---

# Version history (snapshot-on-write + restore)

**When to copy this example:** the user wants per-record version
history — every save creates a snapshot, users can view and
restore old versions. Common for docs, CMS, design tools.

## What you'll install

Nothing extra — this is a `revisions` table + a write-through
helper.

## Files in this example

| Path                               | What it does                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/lib/snapshot.ts`              | `await snapshot('documents', record)` — copies current state into `revisions` table with `revision_number` increment. Call before every update. |
| `api/handlers/documents.ts`        | PUT handler calls `snapshot()` first, then `updateById()`.                                                                                      |
| `app/pages/VersionHistoryPage.tsx` | List of revisions for a record + diff view + Restore button.                                                                                    |

## Anti-patterns

- Do not store the FULL document on every save if it's huge.
  Diff-store (jsondiffpatch) for >100KB payloads.
- Do not invent `@molecule/api-versioning` — no such package
  exists. This example hand-rolls versioning with a `revisions`
  table + a `snapshot()` helper so you can see the moving parts.
  If you'd rather not, `@molecule/api-resource-version-history`
  is a ready-made drop-in (append-only `versions` table,
  `createVersion`/`restoreVersion`/`diffVersions`, ownership
  resolvers).
- Do not let the revision count grow unbounded. After 50
  revisions, drop the oldest. Or compact: keep most recent 10
  - monthly snapshots before that.
- Do not skip the audit-log hook. Restoring an old version is
  itself an audit-worthy action.
- Do not silently re-renumber when restoring. Restoring v3 should
  create v6 (a NEW revision) so v4 and v5 remain intact.

## Verify

Edit a doc 3 times → version history shows 3 revisions → click
"Restore v1" → doc reverts to v1's content → a 4th revision is
created capturing what was live _just before_ the restore (the
latest edit) → so nothing is lost: restoring that 4th revision
undoes the rollback.
