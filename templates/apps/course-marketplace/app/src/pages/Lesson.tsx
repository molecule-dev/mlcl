/**
 * Lesson — single-lesson playback view.
 *
 * Reads the lesson via `/api/lessons/:id`, the parent course via
 * `/api/courses/:courseId`, and the full curriculum via
 * `/api/lessons/course/:courseId`. Mark-complete + watched-seconds
 * progress are POSTed to `/api/lessons/:id/progress`, which also
 * recomputes enrollment.progress on the server. Notes are persisted
 * per-lesson in localStorage (lesson_notes:<lessonId>) so they
 * survive reload without needing a notes table.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LessonRow } from '../components/LessonRow.js'
import { UserMenu } from '../components/UserMenu.js'
import { api, type CourseSummary, type Lesson as ApiLesson } from '../lib/api.js'

const TABS = ['overview', 'notes', 'transcript', 'discussion'] as const
type Tab = (typeof TABS)[number]

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function loadNotes(lessonId: string): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(`lesson_notes:${lessonId}`) ?? ''
}

function saveNotes(lessonId: string, value: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(`lesson_notes:${lessonId}`, value)
}

export function Lesson() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams<{ id?: string; lessonId?: string }>()
  const [search] = useSearchParams()
  const { user } = useAuth<UserProfile>()
  const lessonId = params.lessonId ?? params.id ?? search.get('lesson') ?? ''

  const [lesson, setLesson] = useState<ApiLesson | null>(null)
  const [course, setCourse] = useState<CourseSummary | null>(null)
  const [siblingLessons, setSiblingLessons] = useState<ApiLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [notes, setNotes] = useState('')
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [watchedSec, setWatchedSec] = useState(0)
  const watchedRef = useRef(0)

  useEffect(() => {
    if (!lessonId) return
    let alive = true
    setLoading(true)
    setLoadError(null)
    api<ApiLesson>(`/lessons/${lessonId}`)
      .then(async (l) => {
        if (!alive) return
        setLesson(l)
        setNotes(loadNotes(l.id))
        const courseId = String(l.course_id)
        const [c, siblings] = await Promise.all([
          api<CourseSummary>(`/courses/${courseId}`).catch(() => null),
          api<ApiLesson[]>(`/lessons/course/${courseId}`).catch(() => [] as ApiLesson[]),
        ])
        if (!alive) return
        setCourse(c)
        setSiblingLessons(Array.isArray(siblings) ? siblings : [])
      })
      .catch((err) => {
        if (!alive) return
        const message = err instanceof Error ? err.message : 'Lesson unavailable'
        setLoadError(message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [lessonId])

  // Save notes to localStorage on every keystroke (debounced via React batching).
  useEffect(() => {
    if (lesson) saveNotes(lesson.id, notes)
  }, [lesson, notes])

  const ordered = useMemo(
    () =>
      [...siblingLessons].sort(
        (a, b) =>
          Number(a.sort_order ?? a.order_index ?? 0) - Number(b.sort_order ?? b.order_index ?? 0),
      ),
    [siblingLessons],
  )
  const currentIdx = useMemo(() => ordered.findIndex((l) => l.id === lesson?.id), [ordered, lesson])
  const prev = currentIdx > 0 ? ordered[currentIdx - 1] : null
  const next = currentIdx >= 0 && currentIdx < ordered.length - 1 ? ordered[currentIdx + 1] : null

  const onMarkComplete = async () => {
    if (!lesson || completing) return
    setCompleting(true)
    setCompleteError(null)
    try {
      await api(`/lessons/${lesson.id}/progress`, {
        method: 'POST',
        body: {
          watched_seconds: Number(lesson.duration_sec ?? watchedRef.current ?? 0),
          progress_percent: 100,
          completed: true,
        },
      })
      // Optimistic local update, then push the user to the next lesson if any.
      setLesson((prevLesson) => (prevLesson ? { ...prevLesson, is_completed: true } : prevLesson))
      setSiblingLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, is_completed: true } : l)),
      )
      track({
        name: 'lesson.completed',
        properties: {
          lessonId: String(lesson.id),
          courseId: String(lesson.course_id),
        },
      })
      if (next) navigate(`/lesson/${next.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark complete'
      setCompleteError(message)
    } finally {
      setCompleting(false)
    }
  }

  // Simulated playback timer: tick once per second while the player is "playing".
  // Real video integration would come from the HLS bond; until then this lets
  // the progress bar move so the UI is honest about playback state.
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing || !lesson) return
    const interval = setInterval(() => {
      setWatchedSec((s) => {
        const next = Math.min(Number(lesson.duration_sec ?? 0), s + 1)
        watchedRef.current = next
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [playing, lesson])

  const tabLabels: Record<Tab, string> = {
    overview: t('lesson.tab.overview', {}, { defaultValue: 'Overview' }),
    notes: t('form.notes', {}, { defaultValue: 'Notes' }),
    transcript: t('lesson.tab.transcript', {}, { defaultValue: 'Transcript' }),
    discussion: t('lesson.tab.discussion', {}, { defaultValue: 'Discussion' }),
  }

  const completedCount = ordered.filter((l) => l.is_completed === true).length

  if (loading) {
    return (
      <div className={cm.cn('min-h-screen flex items-center justify-center bg-background')}>
        <p data-mol-id="lesson-loading" className={cm.cn('text-on-surface-variant text-sm')}>
          {t('lesson.loading', {}, { defaultValue: 'Loading lesson…' })}
        </p>
      </div>
    )
  }

  if (loadError || !lesson) {
    return (
      <div
        className={cm.cn(
          'min-h-screen flex flex-col items-center justify-center gap-4 bg-background',
        )}
      >
        <p data-mol-id="lesson-error" className={cm.cn('text-on-surface text-base')}>
          {loadError ?? t('lesson.notFound', {}, { defaultValue: 'Lesson not available.' })}
        </p>
        <Link to="/my-learning" className={'text-primary font-bold'}>
          {t('lesson.backToLearning', {}, { defaultValue: 'Back to My Learning' })}
        </Link>
      </div>
    )
  }

  const courseId = String(lesson.course_id)
  const totalSeconds = Number(lesson.duration_sec ?? 0)
  const progress = totalSeconds === 0 ? 0 : Math.round((watchedSec / totalSeconds) * 100)

  return (
    <div className={cm.cn('min-h-screen bg-background flex flex-col')}>
      <header
        className={cm.cn(
          'bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0 z-40',
        )}
      >
        <div
          className={cm.cn(
            cm.sp('px', 6),
            'h-16 flex items-center justify-between max-w-screen-2xl mx-auto',
          )}
        >
          <div className={cm.cn('flex items-center gap-4 min-w-0')}>
            <Link
              to={`/courses/${courseId}`}
              data-mol-id="lesson-back"
              className={
                'flex items-center gap-1 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_back</span>
              {t('lesson.back', {}, { defaultValue: 'Course detail' })}
            </Link>
            <span className={cm.cn('hidden md:block w-px h-5 bg-outline-variant/30')}></span>
            <div className={cm.cn('hidden md:block min-w-0')}>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('lesson.eyebrow', {}, { defaultValue: 'Now playing' })}
              </p>
              <p
                data-mol-id="lesson-title"
                className={cm.cn('text-sm font-bold text-on-surface truncate')}
              >
                {lesson.title}
              </p>
            </div>
          </div>
          <div className={cm.cn('flex items-center gap-3')}>
            <span
              data-mol-id="lesson-progress-text"
              className={cm.cn('hidden md:inline text-xs text-on-surface-variant')}
            >
              {t(
                'lesson.progress',
                { done: completedCount, total: ordered.length },
                { defaultValue: '{{done}} / {{total}} lessons' },
              )}
            </span>
            {user && (
              <button
                onClick={onMarkComplete}
                type="button"
                disabled={completing || lesson.is_completed === true}
                data-mol-id="mark-complete"
                className={cm.cn(
                  'px-4 py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  lesson.is_completed
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-primary text-on-primary hover:bg-primary-container',
                )}
              >
                {lesson.is_completed
                  ? t('common.completed', {}, { defaultValue: 'Completed' })
                  : completing
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('lesson.markComplete', {}, { defaultValue: 'Mark complete' })}
              </button>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      {completeError && (
        <div className={cm.cn('max-w-screen-2xl mx-auto w-full px-6 pt-4')}>
          <p
            role="alert"
            data-mol-id="lesson-complete-error"
            className={cm.cn(
              'px-4 py-3 rounded-xl bg-error-container text-on-error-container text-sm',
            )}
          >
            {completeError}
          </p>
        </div>
      )}

      <div className={cm.cn('flex-1 grid lg:grid-cols-[1fr_340px]')}>
        <main className={cm.cn(cm.sp('p', 6), 'space-y-6')}>
          <div
            className={cm.cn(
              'rounded-2xl overflow-hidden shadow-2xl aspect-video relative bg-[var(--color-video-well)]',
            )}
          >
            <img
              src={
                lesson.thumbnail_url ?? `https://picsum.photos/seed/lesson-${lesson.id}/1280/720`
              }
              alt={lesson.title}
              className={cm.cn('w-full h-full object-cover opacity-70')}
            />
            <button
              onClick={() => setPlaying((p) => !p)}
              type="button"
              data-mol-id="lesson-play"
              className={cm.cn(
                'absolute inset-0 flex items-center justify-center bg-foreground/30 hover:bg-foreground/40 transition-colors',
              )}
              aria-label={
                playing
                  ? t('common.pause', {}, { defaultValue: 'Pause' })
                  : t('common.play', {}, { defaultValue: 'Play' })
              }
            >
              <span
                className={cm.cn(
                  'w-20 h-20 bg-surface/95 rounded-full flex items-center justify-center shadow-2xl',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-4xl text-primary filled-icon')}
                >
                  {playing ? 'pause' : 'play_arrow'}
                </span>
              </span>
            </button>
            <div
              className={cm.cn(
                'absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4',
              )}
            >
              <div className={cm.cn('h-1 w-full bg-surface/20 rounded-full overflow-hidden')}>
                <div
                  data-mol-id="lesson-progressbar"
                  className={cm.cn('h-full bg-primary-container rounded-full')}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div
                className={cm.cn(
                  'flex justify-between text-xs text-white/85 font-medium mt-2 tabular-nums',
                )}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                <span data-mol-id="lesson-current-time">{formatDuration(watchedSec)}</span>
                <span data-mol-id="lesson-total-time">{formatDuration(totalSeconds)}</span>
              </div>
            </div>
          </div>

          <div className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm')}>
            <nav
              className={cm.cn(
                'flex gap-1 border-b border-outline-variant/15 px-6 overflow-x-auto',
              )}
            >
              {TABS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-mol-id={`lesson-tab-${id}`}
                  onClick={() => setTab(id)}
                  className={cm.cn(
                    'px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors',
                    tab === id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {tabLabels[id]}
                </button>
              ))}
            </nav>
            <div className={cm.cn('p-6')}>
              {tab === 'overview' && (
                <article className={cm.cn('prose prose-sm max-w-none text-on-surface')}>
                  <p
                    data-mol-id="lesson-overview-body"
                    className={cm.cn('text-on-surface leading-relaxed')}
                  >
                    {lesson.description ??
                      t(
                        'lesson.overview.empty',
                        {},
                        { defaultValue: 'This lesson does not have a written summary yet.' },
                      )}
                  </p>
                </article>
              )}
              {tab === 'notes' && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-mol-id="lesson-notes"
                  placeholder={t(
                    'lesson.notes.placeholder',
                    {},
                    {
                      defaultValue:
                        'Capture your thoughts. Notes are private and saved per-lesson.',
                    },
                  )}
                  className={
                    'w-full min-h-[240px] resize-y bg-surface-container-low rounded-xl px-5 py-4 text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(75,8,201,0.4)] transition-all'
                  }
                />
              )}
              {tab === 'transcript' && (
                <p className={cm.cn('text-on-surface-variant text-sm leading-relaxed')}>
                  {t(
                    'lesson.transcript.placeholder',
                    {},
                    { defaultValue: 'Auto-generated transcript appears here as the lesson plays.' },
                  )}
                </p>
              )}
              {tab === 'discussion' && (
                <p className={cm.cn('text-on-surface-variant text-sm leading-relaxed')}>
                  {t(
                    'lesson.discussion.placeholder',
                    {},
                    {
                      defaultValue: 'Discussion threads load here. Be the first to ask a question.',
                    },
                  )}
                </p>
              )}
            </div>
          </div>

          <div className={cm.cn('flex justify-between gap-3')}>
            {prev ? (
              <Link
                to={`/lesson/${prev.id}`}
                data-mol-id="prev-lesson"
                className={
                  'flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-container-lowest text-on-surface font-bold text-sm shadow-sm hover:bg-surface-container-low transition-colors'
                }
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>arrow_back</span>
                {t('lesson.previous', {}, { defaultValue: 'Previous lesson' })}
              </Link>
            ) : (
              <span></span>
            )}
            {next && (
              <Link
                to={`/lesson/${next.id}`}
                data-mol-id="next-lesson"
                className={
                  'flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-container text-on-primary font-bold text-sm shadow-md hover:bg-primary transition-colors'
                }
              >
                {t('lesson.next', {}, { defaultValue: 'Next lesson' })}
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                  arrow_forward
                </span>
              </Link>
            )}
          </div>
        </main>

        <aside
          className={cm.cn(
            'bg-background border-l border-outline-variant/20 w-full lg:w-[340px] lg:max-h-screen lg:overflow-y-auto',
          )}
        >
          <div
            className={cm.cn(
              'px-6 py-5 border-b border-outline-variant/20 sticky top-16 bg-background z-10',
            )}
          >
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1',
              )}
            >
              {t('lesson.curriculum', {}, { defaultValue: 'Course curriculum' })}
            </p>
            <p
              data-mol-id="lesson-course-title"
              className={cm.cn('text-sm font-bold text-on-surface line-clamp-2')}
            >
              {course?.title ?? '—'}
            </p>
          </div>
          <nav>
            {ordered.map((sib, i) => (
              <LessonRow
                key={sib.id}
                courseId={courseId}
                lessonId={sib.id}
                index={i + 1}
                title={sib.title}
                durationLabel={formatDuration(Number(sib.duration_sec ?? 0))}
                kind="video"
                completed={!!sib.is_completed}
                active={sib.id === lesson.id}
              />
            ))}
          </nav>
        </aside>
      </div>
    </div>
  )
}

export default Lesson
