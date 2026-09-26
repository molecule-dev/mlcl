/**
 * InstructorCourseEditor — owner-only authoring view.
 *
 * Loads /api/courses/:id and /api/lessons/course/:id, then exposes:
 *   - reorder/edit/delete lectures (lessons table)
 *   - add new lecture (POST /api/lessons)
 *   - edit course details (PATCH /api/courses/:id)
 *   - publish updates (PATCH /api/courses/:id with status='published')
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { api, type CourseSummary, type Lesson } from '../lib/api.js'

const TABS = ['curriculum', 'details', 'pricing'] as const
type Tab = (typeof TABS)[number]

function formatDuration(sec: number): string {
  const minutes = Math.floor(sec / 60)
  const seconds = sec % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function InstructorCourseEditor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const id = params.id ?? ''

  const [course, setCourse] = useState<CourseSummary | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('curriculum')

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftCategory, setDraftCategory] = useState('')
  const [draftPrice, setDraftPrice] = useState('0')
  const [savingDetails, setSavingDetails] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonDuration, setNewLessonDuration] = useState('5')
  const [newLessonFreePreview, setNewLessonFreePreview] = useState(false)
  const [creatingLesson, setCreatingLesson] = useState(false)

  const totalLectures = lessons.length
  const totalSeconds = useMemo(
    () => lessons.reduce((acc, l) => acc + (l.duration_sec ?? 0), 0),
    [lessons],
  )
  const totalHours = (totalSeconds / 3600).toFixed(1)

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([
      api<CourseSummary>(`/courses/${id}`),
      api<Lesson[]>(`/lessons/course/${id}`).catch(() => []),
    ])
      .then(([c, l]) => {
        if (!alive) return
        setCourse(c)
        setLessons(Array.isArray(l) ? l : [])
        setDraftTitle(c.title ?? '')
        setDraftDescription(c.description ?? '')
        setDraftCategory(c.category ?? '')
        setDraftPrice(((c.price_cents ?? 0) / 100).toFixed(2))
      })
      .catch((err) => {
        if (!alive) return
        const message = err instanceof Error ? err.message : 'Course not found'
        setError(message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id])

  const reload = async () => {
    const [c, l] = await Promise.all([
      api<CourseSummary>(`/courses/${id}`),
      api<Lesson[]>(`/lessons/course/${id}`).catch(() => [] as Lesson[]),
    ])
    setCourse(c)
    setLessons(Array.isArray(l) ? l : [])
  }

  const saveDetails = async () => {
    setSavingDetails(true)
    setStatusMessage(null)
    try {
      const priceCents = Math.max(0, Math.round(Number(draftPrice) * 100))
      await api<CourseSummary>(`/courses/${id}`, {
        method: 'PATCH',
        body: {
          title: draftTitle,
          description: draftDescription,
          category: draftCategory,
          price_cents: priceCents,
        },
      })
      await reload()
      setStatusMessage(t('common.saved', {}, { defaultValue: 'Saved' }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setStatusMessage(message)
    } finally {
      setSavingDetails(false)
    }
  }

  const publish = async () => {
    setPublishing(true)
    setStatusMessage(null)
    try {
      await api<CourseSummary>(`/courses/${id}`, {
        method: 'PATCH',
        body: { status: 'published' },
      })
      track({ name: 'course.published', properties: { courseId: String(id) } })
      await reload()
      setStatusMessage(t('status.published', {}, { defaultValue: 'Published' }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish'
      setStatusMessage(message)
    } finally {
      setPublishing(false)
    }
  }

  const addLesson = async () => {
    if (!newLessonTitle.trim()) return
    setCreatingLesson(true)
    setStatusMessage(null)
    try {
      const durationSec = Math.max(0, Math.round(Number(newLessonDuration) * 60))
      await api<Lesson>('/lessons', {
        method: 'POST',
        body: {
          course_id: id,
          title: newLessonTitle.trim(),
          duration_sec: durationSec,
          sort_order: lessons.length,
          free_preview: newLessonFreePreview,
        },
      })
      setNewLessonTitle('')
      setNewLessonDuration('5')
      setNewLessonFreePreview(false)
      await reload()
      setStatusMessage(t('instructorEditor.addedLesson', {}, { defaultValue: 'Lesson added' }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add lesson'
      setStatusMessage(message)
    } finally {
      setCreatingLesson(false)
    }
  }

  const removeLesson = async (lessonId: string) => {
    try {
      await api(`/lessons/${lessonId}`, { method: 'DELETE' })
      await reload()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      setStatusMessage(message)
    }
  }

  const tabLabels: Record<Tab, string> = {
    curriculum: t('instructorEditor.tab.curriculum', {}, { defaultValue: 'Curriculum' }),
    details: t('nav.details', {}, { defaultValue: 'Details' }),
    pricing: t('nav.pricing', {}, { defaultValue: 'Pricing' }),
  }

  if (loading) {
    return (
      <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
        <Header />
        <main className={cm.cn('flex-1 flex items-center justify-center')}>
          <p
            data-mol-id="course-editor-loading"
            className={cm.cn('text-on-surface-variant text-sm')}
          >
            {t('instructorEditor.loading', {}, { defaultValue: 'Loading course…' })}
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!course || error) {
    return (
      <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
        <Header />
        <main className={cm.cn('flex-1 flex flex-col items-center justify-center gap-4 px-6')}>
          <h1
            data-mol-id="course-editor-error"
            className={cm.cn('text-2xl font-extrabold text-on-surface')}
          >
            {t('instructorEditor.notFound', {}, { defaultValue: 'Course not found or not yours' })}
          </h1>
          <button
            type="button"
            onClick={() => navigate('/instructor')}
            className={cm.cn(
              'bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold',
            )}
          >
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </button>
        </main>
        <Footer />
      </div>
    )
  }

  const isPublished = course.status === 'published'

  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main className={cm.cn('flex-1')}>
        <section
          className={cm.cn('bg-surface-container-lowest border-b border-outline-variant/20')}
        >
          <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), 'max-w-7xl mx-auto')}>
            <div className={cm.cn('flex flex-wrap justify-between items-end gap-6 mb-8')}>
              <div>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2',
                  )}
                >
                  {isPublished
                    ? t(
                        'instructorEditor.eyebrowPublished',
                        {},
                        { defaultValue: 'Course editor · Published' },
                      )
                    : t('instructorEditor.eyebrow', {}, { defaultValue: 'Course editor · Draft' })}
                </p>
                <h1
                  data-mol-id="course-editor-title"
                  className={cm.cn(
                    'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2',
                  )}
                >
                  {course.title}
                </h1>
                <p
                  data-mol-id="course-editor-totals"
                  className={cm.cn('text-on-surface-variant text-sm')}
                >
                  {t(
                    'instructorEditor.totals',
                    { sections: 1, lectures: totalLectures, hours: totalHours },
                    {
                      defaultValue:
                        '{{sections}} sections · {{lectures}} lectures · {{hours}}h total',
                    },
                  )}
                </p>
              </div>
              <div className={cm.cn('flex gap-3 items-center')}>
                {statusMessage && (
                  <span
                    data-mol-id="course-editor-status"
                    className={cm.cn('text-sm text-on-surface-variant')}
                  >
                    {statusMessage}
                  </span>
                )}
                <Link
                  to={`/courses/${course.id}`}
                  className={cm.cn(
                    'px-5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container-high transition-colors',
                  )}
                  data-mol-id="preview-course"
                >
                  {t('instructorEditor.preview', {}, { defaultValue: 'Preview' })}
                </Link>
                <button
                  onClick={publish}
                  disabled={publishing}
                  type="button"
                  data-mol-id="publish-course"
                  className={cm.cn(
                    'px-6 py-2.5 rounded-xl bg-primary-container text-on-primary font-bold text-sm shadow-[0px_8px_24px_rgba(99,54,224,0.2)] hover:bg-primary transition-colors disabled:opacity-60',
                  )}
                >
                  {publishing
                    ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
                    : isPublished
                      ? t(
                          'instructorEditor.publishUpdates',
                          {},
                          { defaultValue: 'Publish updates' },
                        )
                      : t('instructorEditor.publish', {}, { defaultValue: 'Publish course' })}
                </button>
              </div>
            </div>
            <nav className={cm.cn('flex gap-2 overflow-x-auto -mb-px')}>
              {TABS.map((tabId) => (
                <button
                  key={tabId}
                  type="button"
                  data-mol-id={`tab-${tabId}`}
                  onClick={() => setTab(tabId)}
                  className={cm.cn(
                    'px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors',
                    tab === tabId
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface',
                  )}
                  aria-pressed={tab === tabId}
                >
                  {tabLabels[tabId]}
                </button>
              ))}
            </nav>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'max-w-7xl mx-auto')}>
          {tab === 'curriculum' && (
            <div className={cm.cn('space-y-5')}>
              <article
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden',
                )}
              >
                <div
                  className={cm.cn(
                    'flex items-center justify-between px-6 py-5 bg-surface-container-low',
                  )}
                >
                  <div className={cm.cn('flex items-center gap-3')}>
                    <h3 className={cm.cn('font-bold text-on-surface')}>
                      {t('instructorEditor.allLessons', {}, { defaultValue: 'All lessons' })}
                    </h3>
                  </div>
                  <span
                    data-mol-id="course-editor-lecture-count"
                    className={cm.cn('text-xs text-on-surface-variant')}
                  >
                    {t(
                      'instructorEditor.lectureCount',
                      { count: lessons.length },
                      { defaultValue: '{{count}} lectures' },
                    )}
                  </span>
                </div>
                {lessons.length === 0 ? (
                  <p
                    data-mol-id="course-editor-empty"
                    className={cm.cn('px-6 py-8 text-on-surface-variant text-sm')}
                  >
                    {t(
                      'instructorEditor.emptyLessons',
                      {},
                      { defaultValue: 'No lessons yet — add your first lecture below.' },
                    )}
                  </p>
                ) : (
                  <ul
                    data-mol-id="course-editor-lessons"
                    className={cm.cn('divide-y divide-outline-variant/15')}
                  >
                    {lessons.map((lesson, idx) => (
                      <li
                        key={lesson.id}
                        data-mol-id={`course-editor-lesson-${lesson.id}`}
                        className={cm.cn(
                          'flex items-center gap-3 px-6 py-3 hover:bg-surface-container-low transition-colors',
                        )}
                      >
                        <span
                          className={cm.cn('text-on-surface-variant text-sm w-8 tabular-nums')}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={cm.cn('material-symbols-outlined text-primary text-[20px]')}
                          aria-hidden="true"
                        >
                          play_circle
                        </span>
                        <span className={cm.cn('flex-1 text-sm text-on-surface')}>
                          {lesson.title}
                          {lesson.free_preview && (
                            <span
                              className={cm.cn(
                                'ml-2 text-[10px] font-black uppercase tracking-widest text-primary',
                              )}
                            >
                              {t('instructorEditor.preview', {}, { defaultValue: 'Preview' })}
                            </span>
                          )}
                        </span>
                        <span
                          className={cm.cn('text-xs text-on-surface-variant tabular-nums')}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatDuration(lesson.duration_sec ?? 0)}
                        </span>
                        <ConfirmButton
                          onConfirm={() => removeLesson(lesson.id)}
                          label={t(
                            'instructorEditor.deleteLecture',
                            {},
                            { defaultValue: 'Delete lecture' },
                          )}
                          confirmLabel={t(
                            'instructorEditor.confirmDelete',
                            {},
                            { defaultValue: 'Delete this lesson?' },
                          )}
                          disarmSeconds={6}
                          size="sm"
                          variant="ghost"
                          data-mol-id={`delete-lesson-${lesson.id}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm p-6')}>
                <h3 className={cm.cn('text-lg font-extrabold text-on-surface mb-4')}>
                  {t('instructorEditor.addLesson', {}, { defaultValue: 'Add lesson' })}
                </h3>
                <div className={cm.cn('grid sm:grid-cols-[2fr_1fr_auto_auto] gap-3 items-end')}>
                  <label className={cm.cn('flex flex-col gap-1')}>
                    <span
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('form.title', {}, { defaultValue: 'Title' })}
                    </span>
                    <input
                      type="text"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      data-mol-id="new-lesson-title"
                      className={cm.cn(
                        'px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface',
                      )}
                      placeholder={t(
                        'instructorEditor.lessonTitlePlaceholder',
                        {},
                        { defaultValue: 'e.g. Intro to systems' },
                      )}
                    />
                  </label>
                  <label className={cm.cn('flex flex-col gap-1')}>
                    <span
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('instructorEditor.durationMin', {}, { defaultValue: 'Duration (min)' })}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={newLessonDuration}
                      onChange={(e) => setNewLessonDuration(e.target.value)}
                      data-mol-id="new-lesson-duration"
                      className={cm.cn(
                        'px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface',
                      )}
                    />
                  </label>
                  <label className={cm.cn('flex items-center gap-2 mb-2')}>
                    <input
                      type="checkbox"
                      checked={newLessonFreePreview}
                      onChange={(e) => setNewLessonFreePreview(e.target.checked)}
                      data-mol-id="new-lesson-preview"
                    />
                    <span className={cm.cn('text-sm text-on-surface')}>
                      {t('instructorEditor.freePreview', {}, { defaultValue: 'Free preview' })}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={addLesson}
                    disabled={creatingLesson || !newLessonTitle.trim()}
                    data-mol-id="add-lesson"
                    className={cm.cn(
                      'px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-bold text-sm hover:bg-primary transition-colors disabled:opacity-60',
                    )}
                  >
                    {creatingLesson
                      ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                      : t('instructorEditor.addLesson', {}, { defaultValue: 'Add lesson' })}
                  </button>
                </div>
              </article>
            </div>
          )}

          {tab === 'details' && (
            <div
              className={cm.cn(
                'bg-surface-container-lowest rounded-2xl shadow-sm p-6 space-y-4 max-w-3xl',
              )}
            >
              <label className={cm.cn('flex flex-col gap-1')}>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.title', {}, { defaultValue: 'Title' })}
                </span>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  data-mol-id="course-edit-title"
                  className={cm.cn(
                    'px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface',
                  )}
                />
              </label>
              <label className={cm.cn('flex flex-col gap-1')}>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.description', {}, { defaultValue: 'Description' })}
                </span>
                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={6}
                  data-mol-id="course-edit-description"
                  className={cm.cn(
                    'px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface',
                  )}
                />
              </label>
              <label className={cm.cn('flex flex-col gap-1')}>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.category', {}, { defaultValue: 'Category' })}
                </span>
                <input
                  type="text"
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                  data-mol-id="course-edit-category"
                  className={cm.cn(
                    'px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface',
                  )}
                />
              </label>
              <button
                type="button"
                onClick={saveDetails}
                disabled={savingDetails}
                data-mol-id="save-course-details"
                className={cm.cn(
                  'px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-bold text-sm hover:bg-primary transition-colors disabled:opacity-60',
                )}
              >
                {savingDetails
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('instructorEditor.saveDetails', {}, { defaultValue: 'Save details' })}
              </button>
            </div>
          )}

          {tab === 'pricing' && (
            <div
              className={cm.cn(
                'bg-surface-container-lowest rounded-2xl shadow-sm p-6 space-y-4 max-w-md',
              )}
            >
              <label className={cm.cn('flex flex-col gap-1')}>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('instructorEditor.fieldPriceUsd', {}, { defaultValue: 'Price (USD)' })}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draftPrice}
                  onChange={(e) => setDraftPrice(e.target.value)}
                  data-mol-id="course-edit-price"
                  className={cm.cn(
                    'px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface',
                  )}
                />
              </label>
              <button
                type="button"
                onClick={saveDetails}
                disabled={savingDetails}
                data-mol-id="save-course-pricing"
                className={cm.cn(
                  'px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-bold text-sm hover:bg-primary transition-colors disabled:opacity-60',
                )}
              >
                {savingDetails
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('instructorEditor.savePricing', {}, { defaultValue: 'Save pricing' })}
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default InstructorCourseEditor
