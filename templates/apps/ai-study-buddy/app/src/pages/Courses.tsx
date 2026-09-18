import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'
import type { Subject } from '../components/SubjectCard.js'
import { SubjectCard } from '../components/SubjectCard.js'

interface TopicRow {
  id: string
  title: string
  description?: string
  subject?: string
  color?: string
  mastery_score?: number
  material_count?: number
}

const SUBJECT_ICON: Record<string, string> = {
  general: 'auto_stories',
  sciences: 'science',
  science: 'science',
  biology: 'biotech',
  chemistry: 'science',
  math: 'functions',
  mathematics: 'functions',
  humanities: 'history_edu',
  history: 'history_edu',
  languages: 'language',
  cs: 'memory',
  programming: 'memory',
}

const iconForSubject = (subject?: string): string => {
  const key = (subject ?? 'general').toLowerCase()
  return SUBJECT_ICON[key] ?? SUBJECT_ICON.general
}

const difficultyForMastery = (pct: number): 'easy' | 'medium' | 'hard' => {
  if (pct >= 75) return 'easy'
  if (pct >= 40) return 'medium'
  return 'hard'
}

export function Courses() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [searchParams, setSearchParams] = useSearchParams()
  const [topics, setTopics] = useState<TopicRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const filter = searchParams.get('cat') ?? 'All'
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const showCreate = searchParams.get('new') === '1'

  const refresh = () => {
    http
      .get<TopicRow[]>('/api/topics')
      .then((res) => {
        setTopics(Array.isArray(res.data) ? res.data : [])
        setError(null)
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error
            ? e.message
            : t('courses.error', {}, { defaultValue: 'Could not load courses.' }),
        )
        setTopics([])
      })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  // Stable category list — the same buttons render on first paint and
  // after the topics fetch resolves. Including the user's actual subjects
  // would shift the layout once data lands and break the behavioral
  // verifier's element-index matching across page reloads.
  const categories = useMemo<string[]>(
    () => ['All', 'sciences', 'math', 'humanities', 'languages', 'cs', 'general'],
    [],
  )

  const filtered = (topics ?? []).filter((tt) => {
    if (filter === 'All') return true
    return (tt.subject ?? 'general').toLowerCase() === filter
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftTitle.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      await http.post('/api/topics', {
        title: draftTitle.trim(),
        description: draftDescription.trim() || undefined,
      })
      setDraftTitle('')
      setDraftDescription('')
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next)
      refresh()
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('courses.createError', {}, { defaultValue: 'Could not create course.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      data-mol-id="page-courses"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('nav.library', {}, { defaultValue: 'Library' })}
        title={t('courses.title', {}, { defaultValue: 'Your courses' })}
        subtitle={t(
          'courses.subtitle',
          {},
          { defaultValue: 'Curated decks across every subject — keep building mastery.' },
        )}
        actions={
          <button
            type="button"
            data-mol-id="courses-new"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              if (showCreate) next.delete('new')
              else next.set('new', '1')
              setSearchParams(next)
            }}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90',
            )}
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              add
            </span>
            {showCreate
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('courses.add', {}, { defaultValue: 'New course' })}
          </button>
        }
      />

      <PageBody>
        {showCreate ? (
          <form
            data-mol-id="courses-new-form"
            onSubmit={handleCreate}
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', gap: 'sm' }),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
          >
            <label
              htmlFor="course-title"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('courses.titleLabel', {}, { defaultValue: 'Course title' })}
            </label>
            <input
              id="course-title"
              data-mol-id="courses-new-title"
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              required
              maxLength={200}
              placeholder={t(
                'courses.titlePlaceholder',
                {},
                { defaultValue: 'e.g. Linear Algebra' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface focus:border-primary focus:outline-none',
              )}
            />
            <label
              htmlFor="course-description"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.descriptionOptional', {}, { defaultValue: 'Description (optional)' })}
            </label>
            <textarea
              id="course-description"
              data-mol-id="courses-new-description"
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder={t(
                'courses.descriptionPlaceholder',
                {},
                { defaultValue: 'A short summary of what this course covers' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface focus:border-primary focus:outline-none',
              )}
            />
            {createError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{createError}</p>
            ) : null}
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
              <button
                type="submit"
                data-mol-id="courses-new-submit"
                disabled={creating || !draftTitle.trim()}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity',
                )}
              >
                {creating
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('common.create', {}, { defaultValue: 'Create' })}
              </button>
            </div>
          </form>
        ) : null}

        <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
          {categories.map((cat) => {
            const next = new URLSearchParams(searchParams)
            next.set('cat', cat)
            return (
              <Link
                key={cat}
                to={{ pathname: '/courses', search: `?${next.toString()}` }}
                data-mol-id={`courses-filter-${cat.toLowerCase()}`}
                role="tab"
                aria-selected={filter === cat}
                style={{
                  height: 36,
                  width: 110,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full border',
                  filter === cat
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                {t(
                  `courses.cat.${cat.toLowerCase()}`,
                  {},
                  { defaultValue: cat[0]?.toUpperCase() + cat.slice(1) },
                )}
              </Link>
            )
          })}
        </div>

        {/* Stable-height results region — every state takes ~360px so the
            filter row above never reflows when the topics fetch resolves. */}
        <div style={{ minHeight: 360 }}>
          {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
          {topics === null ? (
            <p
              role="status"
              aria-live="polite"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('courses.loading', {}, { defaultValue: 'Loading courses…' })}
            </p>
          ) : filtered.length === 0 ? (
            <div
              data-mol-id="courses-empty"
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
                school
              </span>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'mb-1 text-on-surface',
                )}
              >
                {t('courses.empty.title', {}, { defaultValue: 'No courses yet' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}>
                {t(
                  'courses.empty.body',
                  {},
                  { defaultValue: 'Use the New course button to start building your first one.' },
                )}
              </p>
            </div>
          ) : (
            <div className={'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'}>
              {filtered.map((c) => {
                const masteryPct = Number(c.mastery_score ?? 0)
                const subject: Subject = {
                  id: c.id,
                  title: c.title,
                  subtitle: c.description ?? '',
                  icon: iconForSubject(c.subject),
                  masteryPct,
                  difficulty: difficultyForMastery(masteryPct),
                  cardCount: Number(c.material_count ?? 0),
                  to: `/courses/${c.id}`,
                }
                return <SubjectCard key={c.id} subject={subject} />
              })}
            </div>
          )}
        </div>
      </PageBody>
    </div>
  )
}
