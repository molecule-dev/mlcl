import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { KpiStatCard } from '../components/KpiStatCard.js'
import { ResponsesHeroCard } from '../components/ResponsesHeroCard.js'
import type { SurveyListItemData } from '../components/SurveyListItem.js'
import { SurveyListItem } from '../components/SurveyListItem.js'

interface SurveyApiRow {
  id?: string | number
  title?: string
  description?: string
  status?: string
  updated_at?: string
  response_count?: number
}

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function normalizeSurveys(rows: SurveyApiRow[]): SurveyListItemData[] {
  return rows.map((row) => {
    const status = (row.status ?? 'draft').toLowerCase()
    return {
      id: String(row.id ?? ''),
      title: row.title ?? 'Untitled survey',
      description: row.description,
      meta: row.updated_at ? `Updated ${relativeTime(row.updated_at)}` : 'Draft',
      status:
        status === 'published'
          ? 'active'
          : status === 'closed' || status === 'archived'
            ? 'closed'
            : 'draft',
      responses: Number(row.response_count ?? 0),
    }
  })
}

export function Surveys() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<SurveyListItemData[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<SurveyApiRow[] | { data?: SurveyApiRow[] }>('/api/surveys')
      .then((response) => {
        if (cancelled) return
        const body = response?.data
        const rows = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: SurveyApiRow[] } | undefined)?.data)
            ? (body as { data: SurveyApiRow[] }).data
            : []
        setSurveys(normalizeSurveys(rows))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSurveys([])
        setError(err instanceof Error ? err.message : 'Could not load surveys.')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleNewSurvey() {
    setCreating(true)
    setError(null)
    try {
      const response = await http.post<{ id?: string }>('/api/surveys', {
        title: 'Untitled survey',
        description: '',
      })
      const draft = response?.data
      if (draft?.id) {
        navigate(`/surveys/${draft.id}/build`)
      } else {
        throw new Error('No survey id returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a survey.')
    } finally {
      setCreating(false)
    }
  }

  const totalSurveys = surveys?.length ?? 0
  const activeSurveys = surveys?.filter((s) => s.status === 'active').length ?? 0
  const totalResponses = (surveys ?? []).reduce(
    (n, s) => n + (typeof s.responses === 'number' ? s.responses : 0),
    0,
  )

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), cm.maxW('7xl'), cm.mxAuto, cm.w('full'))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), cm.sp('mb', 0))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary',
          )}
        >
          {t('surveys.eyebrow', {}, { defaultValue: 'Workspace overview' })}
        </span>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'flex-wrap')}
        >
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('surveys.heading', {}, { defaultValue: 'Surveys' })}
          </h1>
          <button
            type="button"
            onClick={handleNewSurvey}
            disabled={creating}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-md bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">
              add
            </span>
            {creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('surveys.cta', {}, { defaultValue: 'New survey' })}
          </button>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'surveys.subheading',
            {},
            {
              defaultValue:
                'Build, share, and analyze every survey you run — from quick pulses to deep NPS programs.',
            },
          )}
        </p>
      </header>

      <ResponsesHeroCard
        responsesThisWeek={totalResponses}
        changeLabel={t(
          'surveys.heroChange',
          { count: totalSurveys },
          { defaultValue: 'Across {{count}} survey(s) in your workspace' },
        )}
        npsAverage={0}
        avgCompletion={t('surveys.heroCompletion', {}, { defaultValue: '—' })}
      />

      <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-3')}>
        <KpiStatCard
          label={t('surveys.kpiActive', {}, { defaultValue: 'Active surveys' })}
          value={String(activeSurveys)}
          trend={t(
            'surveys.kpiActiveTrend',
            { count: totalSurveys },
            { defaultValue: '{{count}} total' },
          )}
          icon="poll"
          accent="primary"
          trendTone="up"
        />
        <KpiStatCard
          label={t('surveys.kpiResponses', {}, { defaultValue: 'Total responses' })}
          value={String(totalResponses)}
          trend={t('surveys.kpiResponsesTrend', {}, { defaultValue: 'Across all surveys' })}
          icon="how_to_vote"
          accent="secondary"
          trendTone="up"
        />
        <KpiStatCard
          label={t('surveys.kpiCompletion', {}, { defaultValue: 'Drafts' })}
          value={String(totalSurveys - activeSurveys)}
          trend={t('surveys.kpiCompletionTrend', {}, { defaultValue: 'Surveys not yet published' })}
          icon="task_alt"
          accent="success"
          trendTone="up"
        />
      </section>

      <section className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
        <header
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 3 }), 'flex-wrap')}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('surveys.listHeading', {}, { defaultValue: 'Recent surveys' })}
          </h2>
          <Link
            to="/templates"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-primary hover:underline',
            )}
          >
            {t('surveys.browseTemplates', {}, { defaultValue: 'Browse templates →' })}
          </Link>
        </header>
        {surveys === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('surveys.loading', {}, { defaultValue: 'Loading surveys…' })}
          </p>
        ) : surveys.length === 0 ? (
          <div
            data-testid="surveys-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 2 }),
              cm.sp('p', 8),
              'rounded-xl bg-surface border border-[color:var(--color-border)] text-center',
            )}
          >
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: 36 }}
              aria-hidden="true"
            >
              inbox
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'surveys.empty',
                {},
                {
                  defaultValue: 'No surveys yet. Click "New survey" to start, or pick a template.',
                },
              )}
            </p>
          </div>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
            {surveys.map((survey) => (
              <li key={survey.id}>
                <SurveyListItem {...survey} />
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-md bg-error-light text-[color:var(--color-on-error)]',
            )}
          >
            {error}
          </p>
        )}
      </section>
    </div>
  )
}

export default Surveys
