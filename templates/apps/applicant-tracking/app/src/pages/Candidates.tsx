import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type Stage = 'sourced' | 'screening' | 'interview' | 'offer' | 'hired'

interface Candidate {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  role?: string
  job_id?: string
  job_title?: string
  stage?: Stage
  // Backend serialises numeric(5,2) to string; tolerate both forms.
  ai_score?: number | string
  source?: string
  days_in_stage?: number
  applied_at?: string
  created_at?: string
}

interface NormalizedCandidate {
  id: string
  name: string
  role: string
  job_id: string
  job_title: string
  stage: Stage
  ai_score: number
  source: string
  days_in_stage: number
  applied_at: string
}

function normalizeCandidate(c: Candidate): NormalizedCandidate {
  const full = c.name ?? (`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || (c.email ?? ''))
  return {
    id: c.id,
    name: full,
    role: c.role ?? '',
    job_id: c.job_id ?? '',
    job_title: c.job_title ?? '',
    stage: c.stage ?? 'sourced',
    ai_score: typeof c.ai_score === 'number' ? c.ai_score : Number(c.ai_score ?? 0) || 0,
    source: c.source ?? '',
    days_in_stage: c.days_in_stage ?? 0,
    applied_at: c.applied_at ?? c.created_at ?? new Date().toISOString(),
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-error'
}

const STAGE_BG_COLOR: Record<Stage, string> = {
  sourced: 'var(--color-stage-sourced-bg)',
  screening: 'var(--color-stage-screening-bg)',
  interview: 'var(--color-stage-interview-bg)',
  offer: 'var(--color-stage-offer-bg)',
  hired: 'var(--color-stage-hired-bg)',
}

const STAGE_FG_COLOR: Record<Stage, string> = {
  sourced: 'var(--color-stage-sourced)',
  screening: 'var(--color-stage-screening)',
  interview: 'var(--color-stage-interview)',
  offer: 'var(--color-stage-offer)',
  hired: 'var(--color-stage-hired)',
}

const STAGE_DEFAULT_LABEL: Record<Stage, string> = {
  sourced: 'Sourced',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
}

export function Candidates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  // JobDetail links here with `?job=<id>` — scope the table to that job.
  const [searchParams] = useSearchParams()
  const jobFilter = searchParams.get('job') ?? ''
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('LinkedIn')

  function refresh() {
    return http
      .get('/api/candidates')
      .then((res) => setCandidates(unwrapList<Candidate>(res)))
      .catch(() =>
        setError(t('candidates.loadError', {}, { defaultValue: 'Failed to load candidates.' })),
      )
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!first.trim() || !last.trim() || !email.trim()) {
      setAddError(
        t(
          'candidates.addMissing',
          {},
          { defaultValue: 'First name, last name, and email are required.' },
        ),
      )
      return
    }
    setAdding(true)
    setAddError(null)
    try {
      await http.post('/api/candidates', {
        first_name: first.trim(),
        last_name: last.trim(),
        email: email.trim(),
        source: source.trim() || undefined,
      })
      setFirst('')
      setLast('')
      setEmail('')
      setSource('LinkedIn')
      setShowAdd(false)
      await refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setAddError(
        message || t('candidates.addError', {}, { defaultValue: 'Could not add candidate.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/candidates')
      .then((res) => {
        if (!cancelled) setCandidates(unwrapList<Candidate>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('candidates.loadError', {}, { defaultValue: 'Failed to load candidates.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const normalized = useMemo(() => candidates.map((c) => normalizeCandidate(c)), [candidates])

  const filtered = useMemo(() => {
    const scoped = jobFilter ? normalized.filter((c) => c.job_id === jobFilter) : normalized
    if (!query.trim()) return scoped
    const q = query.toLowerCase().trim()
    return scoped.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.job_title.toLowerCase().includes(q),
    )
  }, [normalized, query, jobFilter])

  return (
    <div
      data-mol-id="page-candidates"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}
    >
      <header className={cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('candidates.heading', {}, { defaultValue: 'Candidates' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'candidates.subheading',
              {},
              {
                defaultValue:
                  'Cross-job candidate database with AI scoring and source attribution.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="candidates-add-toggle"
          onClick={() => setShowAdd((s) => !s)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90',
          )}
        >
          {showAdd
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('candidates.addCta', {}, { defaultValue: 'Add candidate' })}
        </button>
      </header>

      {showAdd ? (
        <form
          onSubmit={handleAdd}
          data-mol-id="candidates-add-form"
          className={cm.cn(cm.card(), cm.sp('p', 4), 'space-y-3')}
        >
          {addError ? (
            <p
              role="alert"
              data-mol-id="candidates-add-error"
              className={cm.cn(cm.textSize('sm'), 'text-error')}
            >
              {addError}
            </p>
          ) : null}
          <div className={cm.grid({ cols: 4, gap: 'sm' })}>
            <input
              type="text"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              placeholder={t('form.firstName', {}, { defaultValue: 'First name' })}
              aria-label={t('form.firstName', {}, { defaultValue: 'First name' })}
              data-mol-id="candidates-add-first"
              required
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md bg-surface-container-lowest',
              )}
            />
            <input
              type="text"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              placeholder={t('form.lastName', {}, { defaultValue: 'Last name' })}
              aria-label={t('form.lastName', {}, { defaultValue: 'Last name' })}
              data-mol-id="candidates-add-last"
              required
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md bg-surface-container-lowest',
              )}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(
                'candidates.emailPlaceholder',
                {},
                { defaultValue: 'email@example.com' },
              )}
              aria-label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              data-mol-id="candidates-add-email"
              required
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md bg-surface-container-lowest',
              )}
            />
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t(
                'candidates.sourcePlaceholder',
                {},
                { defaultValue: 'Source (LinkedIn, Referral…)' },
              )}
              aria-label={t('candidates.sourceLabel', {}, { defaultValue: 'Source' })}
              data-mol-id="candidates-add-source"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md bg-surface-container-lowest',
              )}
            />
          </div>
          <div className={cm.flex({ justify: 'end', gap: 'sm' })}>
            <button
              type="submit"
              disabled={adding}
              data-mol-id="candidates-add-submit"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 disabled:opacity-50',
              )}
            >
              {adding
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('candidates.addSave', {}, { defaultValue: 'Save candidate' })}
            </button>
          </div>
        </form>
      ) : null}

      <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            'candidates.searchPlaceholder',
            {},
            { defaultValue: 'Search candidate, role, or job\u2026' },
          )}
          data-mol-id="candidates-search"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('candidates.empty', {}, { defaultValue: 'No candidates match.' })}
        </p>
      ) : (
        <section className={cm.cn(cm.card(), 'overflow-hidden')}>
          <table className={cm.cn('w-full')}>
            <thead
              className={cm.cn(
                'bg-surface-container',
                cm.textSize('xs'),
                'uppercase tracking-wide',
                'text-on-surface-variant',
              )}
            >
              <tr>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('candidates.col.name', {}, { defaultValue: 'Candidate' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('candidates.col.role', {}, { defaultValue: 'Applied for' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('candidates.col.stage', {}, { defaultValue: 'Stage' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('candidates.col.score', {}, { defaultValue: 'AI score' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('candidates.col.source', {}, { defaultValue: 'Source' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('candidates.col.daysInStage', {}, { defaultValue: 'Days in stage' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('candidates.col.applied', {}, { defaultValue: 'Applied' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant')}>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  data-mol-id="candidates-row"
                  className={cm.cn('hover:bg-surface-container')}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link
                      to={`/candidates/${c.id}`}
                      data-mol-id="candidates-row-link"
                      className={cm.cn(cm.fontWeight('semibold'), 'hover:underline')}
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'))}>
                    <p>{c.role}</p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {c.job_title}
                    </p>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        cm.roundedFull,
                      )}
                      style={{
                        backgroundColor: STAGE_BG_COLOR[c.stage],
                        color: STAGE_FG_COLOR[c.stage],
                      }}
                    >
                      {t(
                        `stagePill.${c.stage}`,
                        {},
                        { defaultValue: STAGE_DEFAULT_LABEL[c.stage] },
                      )}
                    </span>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      cm.fontWeight('semibold'),
                      scoreColor(c.ai_score),
                    )}
                  >
                    {c.ai_score}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    {c.source}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right tabular-nums',
                      'text-on-surface-variant',
                    )}
                  >
                    {c.days_in_stage}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                      'whitespace-nowrap',
                    )}
                  >
                    {fmtDate(c.applied_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
