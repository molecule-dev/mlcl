// Phase 1 baseline — verbatim JSX of design-lms-discussions.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-react'

import DiscussionFilters from '../components/DiscussionFilters.js'
import DiscussionsHeader from '../components/DiscussionsHeader.js'
import DiscussionsSideNavBar from '../components/DiscussionsSideNavBar.js'
import DiscussionThreadList from '../components/DiscussionThreadList.js'

interface CourseRow {
  id: string
  name: string
}

const unwrapList = <T,>(res: unknown): T[] => {
  if (Array.isArray(res)) return res as T[]
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  )
    return (res as { data: T[] }).data
  return []
}

/**
 * Normalize the API response shape into the props expected by the
 * thread-list component. When `rows` is empty the list renders its
 * own empty state — we never inject demo data into a logged-in user's
 * view.
 */
function normalizeDiscussions(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const replyCount = Number(row.reply_count ?? row.replyCount ?? row.replies ?? 0)
    const excerpt = String(row.content ?? row.body ?? row.excerpt ?? '').trim()
    return {
      ...row,
      replyCount: Number.isFinite(replyCount) ? replyCount : 0,
      excerpt,
      authorName: String(row.authorName ?? row.author_name ?? row.author ?? ''),
      category: row.category ?? 'general',
      title: String(row.title ?? ''),
      updatedAt: row.updatedAt ?? row.updated_at ?? row.createdAt ?? row.created_at ?? null,
    }
  })
}

function Discussions() {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [rawDiscussions, setRawDiscussions] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [myCourses, setMyCourses] = useState<CourseRow[]>([])
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerCourseId, setComposerCourseId] = useState('')
  const [composerTitle, setComposerTitle] = useState('')
  const [composerContent, setComposerContent] = useState('')
  const [composerError, setComposerError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  const loadDiscussions = useCallback(
    () =>
      http
        .get('/api/discussions')
        .then((res: unknown) => setRawDiscussions(unwrapList<Record<string, unknown>>(res)))
        .catch(() =>
          setError(t('discussions.loadError', {}, { defaultValue: 'Failed to load discussions' })),
        ),
    [http, t],
  )

  useEffect(() => {
    Promise.all([
      loadDiscussions(),
      http
        .get('/api/courses?my=true')
        .then((res: unknown) => setMyCourses(unwrapList<CourseRow>(res)))
        .catch(() => setMyCourses([])),
    ]).finally(() => setLoading(false))
  }, [http, loadDiscussions])

  const discussions = useMemo(() => normalizeDiscussions(rawDiscussions), [rawDiscussions])

  const filtered = discussions
    .filter((d) => activeFilter === 'all' || String(d.category ?? '') === activeFilter)
    .filter(
      (d) =>
        !search ||
        String(d.title ?? '')
          .toLowerCase()
          .includes(search.toLowerCase()),
    )

  const openComposer = () => {
    setComposerError(null)
    setComposerCourseId((prev) => prev || myCourses[0]?.id || '')
    setComposerOpen(true)
  }

  const submitThread = async (): Promise<void> => {
    if (!composerCourseId || !composerTitle.trim() || !composerContent.trim()) {
      setComposerError(
        t(
          'discussions.composerValidation',
          {},
          { defaultValue: 'Pick a course and fill in both the title and your question.' },
        ),
      )
      return
    }
    setPosting(true)
    setComposerError(null)
    try {
      await http.post('/api/discussions', {
        course_id: composerCourseId,
        title: composerTitle.trim(),
        content: composerContent.trim(),
      })
      track({ name: 'discussion.created', properties: { courseId: composerCourseId } })

      setComposerTitle('')
      setComposerContent('')
      await loadDiscussions()
    } catch (err) {
      setComposerError(
        (err as Error)?.message ||
          t('discussions.createError', {}, { defaultValue: 'Failed to create discussion' }),
      )
    } finally {
      setPosting(false)
    }
  }

  const fieldClass = cm.cn(
    cm.w('full'),
    cm.sp('p', 3),
    cm.textSize('sm'),
    'rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none text-on-surface',
  )

  return (
    <div
      className={cm.cn(
        cm.flex(),
        cm.minH('screen'),
        'bg-background text-on-surface flex-col md:flex-row',
      )}
    >
      {/* SideNavBar Component */}
      <DiscussionsSideNavBar onNewThread={openComposer} />
      {/* Main Content Canvas */}
      <main
        className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, cm.minH('screen'), 'min-w-0')}
      >
        {/* TopNavBar Component */}
        <DiscussionsHeader search={search} onSearchChange={setSearch} />
        {/* Content Area */}
        <div
          className={cm.cn(cm.sp('p', 8), cm.maxW('6xl'), cm.mxAuto, cm.w('full'), cm.stack(10))}
        >
          {/* Filters */}
          <DiscussionFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          {/* Thread List (Bento-lite Layout) */}
          <DiscussionThreadList discussions={filtered} loading={loading} error={error} />
        </div>
      </main>
      {/* New-thread composer (opened from the sidebar's New Thread button) */}
      <Modal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title={t('discussions.composerTitle', {}, { defaultValue: 'Start a new thread' })}
        data-mol-id="discussion-composer"
      >
        <div className={cm.cn(cm.stack(4), cm.sp('p', 2))}>
          {myCourses.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'discussions.composerNoCourses',
                {},
                { defaultValue: 'Enroll in a course first — threads belong to a course forum.' },
              )}
            </p>
          ) : (
            <>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-foreground-secondary',
                  )}
                >
                  {t('discussions.composerCourse', {}, { defaultValue: 'Course' })}
                </span>
                <select
                  className={fieldClass}
                  data-mol-id="composer-course"
                  value={composerCourseId}
                  onChange={(e) => setComposerCourseId(e.target.value)}
                >
                  {myCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-foreground-secondary',
                  )}
                >
                  {t('discussions.composerTitleLabel', {}, { defaultValue: 'Title' })}
                </span>
                <input
                  className={fieldClass}
                  data-mol-id="composer-title"
                  type="text"
                  maxLength={255}
                  placeholder={t(
                    'discussions.composerTitlePlaceholder',
                    {},
                    { defaultValue: 'What do you want to ask or share?' },
                  )}
                  value={composerTitle}
                  onChange={(e) => setComposerTitle(e.target.value)}
                />
              </label>
              <label className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider text-foreground-secondary',
                  )}
                >
                  {t('discussions.composerContent', {}, { defaultValue: 'Details' })}
                </span>
                <textarea
                  className={cm.cn(fieldClass, 'min-h-32 resize-y')}
                  data-mol-id="composer-content"
                  maxLength={10000}
                  placeholder={t(
                    'discussions.composerContentPlaceholder',
                    {},
                    { defaultValue: 'Add context, code, or links so classmates can help.' },
                  )}
                  value={composerContent}
                  onChange={(e) => setComposerContent(e.target.value)}
                />
              </label>
              {composerError ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
                  {composerError}
                </p>
              ) : null}
              <div className={cm.cn(cm.flex({ justify: 'end', gap: 3 }))}>
                <button
                  type="button"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-xl text-foreground-secondary hover:bg-surface-secondary transition-colors',
                  )}
                  onClick={() => setComposerOpen(false)}
                >
                  {t('form.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="button"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50',
                  )}
                  data-mol-id="composer-submit"
                  disabled={posting}
                  onClick={() => void submitThread()}
                >
                  {posting
                    ? t('discussions.composerPosting', {}, { defaultValue: 'Posting…' })
                    : t('discussions.composerSubmit', {}, { defaultValue: 'Post thread' })}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default Discussions
export { Discussions, Discussions as DiscussionsPage }
