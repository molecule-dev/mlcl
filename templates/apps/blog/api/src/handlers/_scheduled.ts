import { findMany, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface ScheduledPostRow {
  id: string
  scheduled_at?: string | null
}

/**
 * Publish any scheduled posts whose time has arrived.
 *
 * A post scheduled for future publication is stored with `status='scheduled'` + `scheduled_at`,
 * but nothing promotes it — and every public read gates on `status='published'`, so without this
 * the post would sit in the "Scheduled" tab forever and never go live. Call this lazily at the top
 * of the reads that surface posts (public list, by-slug, the author's dashboard, and the RSS/JSON
 * feeds): any post whose `scheduled_at` has passed is flipped to `published` (its `published_at`
 * set to the intended time). Idempotent — the `status='scheduled'` filter excludes already-promoted
 * rows, so concurrent reads are safe — and best-effort: a failure is logged, never fatal to the read.
 */
export async function promoteDueScheduledPosts(): Promise<void> {
  try {
    const nowIso = new Date().toISOString()
    const due = (await findMany('posts', {
      where: [
        { field: 'status', operator: '=', value: 'scheduled' },
        { field: 'scheduled_at', operator: '<=', value: nowIso },
      ],
    })) as ScheduledPostRow[]
    for (const post of due) {
      await updateById('posts', post.id, {
        status: 'published',
        published_at: post.scheduled_at ?? nowIso,
        updated_at: nowIso,
      })
    }
  } catch (error) {
    logger.warn('promoteDueScheduledPosts failed; scheduled posts may be delayed', { error })
  }
}
