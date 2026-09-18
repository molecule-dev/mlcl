/**
 * Document type returned by `/api/documents`.
 *
 * Mirrors the shape produced by `api/src/handlers/documents.ts`. Frontend
 * components import this as the canonical row contract so we never drift
 * from server semantics.
 */
export interface DocumentRow {
  id: string
  owner_id: string
  folder_id: string | null
  title: string
  body_md: string
  excerpt: string | null
  word_count: number
  character_count: number
  reading_time: number
  status: 'draft' | 'published'
  pinned: boolean
  tags_json: ReadonlyArray<string> | Record<string, never>
  position: number | string
  trashed_at: string | null
  created_at: string
  updated_at: string
}

/** Folder type returned by `/api/folders`. */
export interface FolderRow {
  id: string
  owner_id: string
  parent_id: string | null
  name: string
  position: number | string
  created_at: string
  updated_at: string
}

/** Document version snapshot returned by `/api/documents/:id/versions`. */
export interface DocumentVersionRow {
  id: string
  document_id: string
  version_number: number
  body_md: string
  snapshot_size: number
  created_at: string
}

/** Tag list helper — `tags_json` is sometimes an array, sometimes an empty object. */
export function tagsOf(doc: Pick<DocumentRow, 'tags_json'>): ReadonlyArray<string> {
  return Array.isArray(doc.tags_json) ? doc.tags_json : []
}

/** Pretty relative-time label (e.g. "2 hours ago"). */
export function relativeLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diffMs = Date.now() - ts
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  if (day < 30) return `${Math.round(day / 7)}w ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** First non-empty line of a markdown body, trimmed to ~140 chars. */
export function makeExcerpt(md: string | null | undefined): string {
  if (!md) return ''
  const trimmed = md
    .split('\n')
    .map((l) => l.replace(/^[#>*\-\s]+/, '').trim())
    .find((l) => l.length > 0)
  if (!trimmed) return ''
  return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed
}
