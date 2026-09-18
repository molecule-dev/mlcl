import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MasteryRing } from '../components/MasteryRing.js'
import { PageBody, PageHeader } from '../components/PageHeader.js'

interface TopicRow {
  id: string
  title: string
  description?: string
  subject?: string
  mastery_score?: number
  material_count?: number
}

interface MaterialRow {
  id: string
  title: string
  content?: string
  material_type?: string
  embedding_status?: string
  created_at?: string
}

const STATUS_TONE = (
  idx: number,
  total: number,
  mastery: number,
): { bg: string; fg: string; labelKey: string; labelDefault: string; icon: string } => {
  // Distribute lessons across statuses based on overall topic mastery.
  const ratio = total > 0 ? idx / total : 0
  const masteredThreshold = mastery / 100
  if (ratio < masteredThreshold * 0.6) {
    return {
      bg: 'bg-success-light/60',
      fg: 'text-success',
      labelKey: 'courseDetail.status.mastered',
      labelDefault: 'Mastered',
      icon: 'check_circle',
    }
  }
  if (ratio < masteredThreshold) {
    return {
      bg: 'bg-primary-container/15',
      fg: 'text-primary',
      labelKey: 'courseDetail.status.reviewing',
      labelDefault: 'Reviewing',
      icon: 'autorenew',
    }
  }
  if (ratio < masteredThreshold + 0.2) {
    return {
      bg: 'bg-info-container/30',
      fg: 'text-info',
      labelKey: 'courseDetail.status.learning',
      labelDefault: 'Learning',
      icon: 'bolt',
    }
  }
  return {
    bg: 'bg-surface-container-high',
    fg: 'text-on-surface-variant',
    labelKey: 'courseDetail.status.notStarted',
    labelDefault: 'Not started',
    icon: 'lock',
  }
}

export function CourseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [topic, setTopic] = useState<TopicRow | null>(null)
  const [materials, setMaterials] = useState<MaterialRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      http.get<TopicRow>(`/api/topics/${id}`),
      http.get<MaterialRow[]>(`/api/topics/${id}/materials`),
    ])
      .then(([topicRes, matRes]) => {
        if (cancelled) return
        setTopic(topicRes.data ?? null)
        setMaterials(Array.isArray(matRes.data) ? matRes.data : [])
        setError(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('courseDetail.error', {}, { defaultValue: 'Could not load course.' }),
        )
        setMaterials([])
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const mastery = Number(topic?.mastery_score ?? 0)
  const totalLessons = (materials ?? []).length

  const segments = (() => {
    const masteredFrac = mastery / 100
    const masteredCount = Math.round(totalLessons * masteredFrac * 0.6)
    const reviewingCount = Math.round(totalLessons * masteredFrac * 0.4)
    const learningCount = Math.round(totalLessons * 0.2)
    const notStarted = Math.max(0, totalLessons - masteredCount - reviewingCount - learningCount)
    return {
      mastered: masteredCount,
      reviewing: reviewingCount,
      learning: learningCount,
      notStarted,
    }
  })()

  return (
    <div
      data-mol-id="page-course-detail"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('nav.course', {}, { defaultValue: 'Course' })}
        title={topic?.title ?? t('nav.course', {}, { defaultValue: 'Course' })}
        subtitle={
          topic
            ? t(
                'courseDetail.summary',
                { count: totalLessons, mastery: mastery },
                { defaultValue: '{{count}} lessons · {{mastery}}% mastery' },
              )
            : undefined
        }
        actions={
          id ? (
            <Link
              to={`/study/${id}`}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2.5),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 transition-opacity',
              )}
            >
              <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                play_arrow
              </span>
              {t('common.continue', {}, { defaultValue: 'Continue' })}
            </Link>
          ) : null
        }
      />

      <PageBody>
        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {topic === null && !error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('courseDetail.loading', {}, { defaultValue: 'Loading course…' })}
          </p>
        ) : topic ? (
          <>
            {topic.description ? (
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  'serif-text leading-relaxed text-on-surface-variant',
                )}
              >
                {topic.description}
              </p>
            ) : null}

            <section className={'grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]'}>
              <aside
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-[2rem] bg-surface-container-lowest shadow-ambient flex flex-col items-center',
                )}
              >
                <MasteryRing size={180} segments={segments} />
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'mt-4 serif-text italic text-center text-on-surface-variant',
                  )}
                >
                  {t(
                    'courseDetail.masteryHint',
                    {},
                    {
                      defaultValue:
                        "Pace yourself — review what you know before learning what you don't.",
                    },
                  )}
                </p>
              </aside>

              {(materials ?? []).length === 0 ? (
                <div
                  className={cm.cn(
                    cm.sp('p', 12),
                    cm.textCenter,
                    'rounded-3xl border border-dashed border-outline-variant/30',
                  )}
                >
                  <span
                    className={
                      'material-symbols-outlined text-5xl mb-3 opacity-50 text-on-surface-variant'
                    }
                    aria-hidden="true"
                  >
                    collections_bookmark
                  </span>
                  <p
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('semibold'),
                      'mb-1 text-on-surface',
                    )}
                  >
                    {t('courseDetail.empty.title', {}, { defaultValue: 'No lessons yet' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'serif-text italic text-on-surface-variant',
                    )}
                  >
                    {t(
                      'courseDetail.empty.body',
                      {},
                      { defaultValue: 'Add a study material to start mastering this topic.' },
                    )}
                  </p>
                </div>
              ) : (
                <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                  {(materials ?? []).map((lesson, i) => {
                    const tone = STATUS_TONE(i, totalLessons, mastery)
                    return (
                      <li key={lesson.id}>
                        <div
                          className={cm.cn(
                            cm.sp('p', 5),
                            cm.flex({ align: 'center', gap: 'md' }),
                            'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container-low transition-colors',
                          )}
                        >
                          <span
                            className={cm.cn(
                              cm.w(8),
                              cm.h(8),
                              cm.flex({ align: 'center', justify: 'center' }),
                              cm.fontWeight('bold'),
                              cm.textSize('sm'),
                              'rounded-full bg-surface-container-high text-on-surface-variant tabular-nums',
                            )}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className={cm.flex1}>
                            <p
                              className={cm.cn(
                                cm.textSize('base'),
                                cm.fontWeight('semibold'),
                                'text-on-surface',
                              )}
                            >
                              {lesson.title}
                            </p>
                            <p
                              className={cm.cn(
                                cm.textSize('xs'),
                                'mt-0.5 text-on-surface-variant tabular-nums',
                              )}
                            >
                              {(lesson.material_type ?? 'notes').toUpperCase()}
                            </p>
                          </div>
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', gap: 'xs' }),
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'rounded-full uppercase tracking-wider',
                              tone.bg,
                              tone.fg,
                            )}
                          >
                            <span
                              className={'material-symbols-outlined text-sm'}
                              aria-hidden="true"
                            >
                              {tone.icon}
                            </span>
                            {t(tone.labelKey, {}, { defaultValue: tone.labelDefault })}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          </>
        ) : null}
      </PageBody>
    </div>
  )
}
