import { findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface ScheduledIssueRow {
  id: string
  scheduled_at?: string | null
}

/**
 * Publish any scheduled issues whose time has arrived.
 *
 * An issue scheduled for future delivery is stored with `status='scheduled'` + `scheduled_at`,
 * but nothing promotes it — and every public read gates on `status='published'`, so without this
 * the issue would sit in the "Scheduled" tab forever and never reach subscribers. Call this lazily
 * at the top of the reads that surface issues (public archive, the creator's issue list, and the
 * RSS/JSON feeds): any issue whose `scheduled_at` has passed is flipped to `published` (its
 * `publish_at` set to the intended time) and delivered — sends rows are fanned out to subscribed
 * subscribers by `publishIssue`. Idempotent — the `status='scheduled'` filter excludes
 * already-promoted rows, so concurrent reads are safe — and best-effort: a failure is logged,
 * never fatal to the read.
 */
export async function promoteDueScheduledIssues(): Promise<void> {
  try {
    const nowIso = new Date().toISOString()
    const due = (await findMany('issues', {
      where: [
        { field: 'status', operator: '=', value: 'scheduled' },
        { field: 'scheduled_at', operator: '<=', value: nowIso },
      ],
    })) as ScheduledIssueRow[]
    if (due.length === 0) return
    // Imported lazily to keep _scheduled ↔ issues/_deliver free of an import
    // cycle at module-eval time (issues.ts imports this module at top level).
    const { publishIssue } = await import('./_deliver.js')
    for (const issue of due) {
      await publishIssue(issue.id, issue.scheduled_at ?? nowIso)
    }
  } catch (error) {
    logger.warn('promoteDueScheduledIssues failed; scheduled issues may be delayed', { error })
  }
}
