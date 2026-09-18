import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageHeading } from '../components/PageHeading.js'
import {
  type TranslationProject,
  TranslationProjectCard,
} from '../components/TranslationProjectCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiProjectRow {
  id?: unknown
  name?: unknown
  source_lang?: unknown
  target_langs?: unknown
  status?: unknown
  updated_at?: unknown
  created_at?: unknown
}

const STATUS_FILTERS: ReadonlyArray<{
  key: 'all' | 'in_progress' | 'in_review' | 'approved' | 'archived'
  defaultLabel: string
}> = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'in_progress', defaultLabel: 'In progress' },
  { key: 'in_review', defaultLabel: 'In review' },
  { key: 'approved', defaultLabel: 'Approved' },
  { key: 'archived', defaultLabel: 'Archived' },
]

function adapt(row: ApiProjectRow, idx: number): TranslationProject {
  const targets = Array.isArray(row.target_langs) ? row.target_langs : []
  const target = targets.length > 0 ? String(targets[0]) : 'es'
  const status = String(row.status ?? 'in_progress')
  const normStatus: TranslationProject['status'] =
    status === 'in_progress' ||
    status === 'in_review' ||
    status === 'approved' ||
    status === 'pending' ||
    status === 'draft' ||
    status === 'archived'
      ? status
      : 'in_progress'
  return {
    id: String(row.id ?? `p_${idx}`),
    name: String(row.name ?? 'Untitled project'),
    source_lang: String(row.source_lang ?? 'EN').toLowerCase(),
    target_lang: target.toLowerCase(),
    status: normStatus,
    progress: 0,
    word_count: 0,
    last_activity:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at ?? row.created_at ?? ''),
    team: [],
  }
}

export function Projects() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [projects, setProjects] = useState<ReadonlyArray<TranslationProject>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]['key']>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/projects')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<ApiProjectRow>(res)
        setProjects(list.map(adapt))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('projects.loadError', {}, { defaultValue: 'Failed to load projects.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    if (filter === 'all') return projects
    return projects.filter((p) => p.status === filter)
  }, [projects, filter])

  const counts = useMemo(() => {
    const by: Record<string, number> = { all: projects.length }
    for (const p of projects) by[p.status] = (by[p.status] ?? 0) + 1
    return by
  }, [projects])

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        title={t('nav.projects', {}, { defaultValue: 'Projects' })}
        subtitle={t(
          'projects.subtitle',
          {},
          { defaultValue: 'Every active project across all locales.' },
        )}
        actions={
          <Link
            to="/projects/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-sm shadow-primary/30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('nav.newProject', {}, { defaultValue: 'New project' })}
          </Link>
        }
      />

      <div role="alert" aria-live="polite" className={cm.cn('min-h-[1px]')}>
        {error && (
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl bg-error-container text-on-error-container text-sm',
            )}
          >
            {error}
          </div>
        )}
      </div>

      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg' }),
          'border-b border-surface-container-high pb-[1px]',
        )}
        aria-label={t('projects.filterAria', {}, { defaultValue: 'Filter projects by status' })}
      >
        {STATUS_FILTERS.map((f) => {
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                cm.sp('pb', 3),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-background border-b-2 border-transparent',
              )}
            >
              {t(`projects.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              <span className={cm.cn('font-mono text-xs ml-1 opacity-70')}>
                {counts[f.key] ?? 0}
              </span>
            </button>
          )
        })}
      </nav>

      {loading ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.textCenter,
            cm.sp('py', 16),
            'text-on-surface-variant',
          )}
        >
          {t('projects.loading', {}, { defaultValue: 'Loading projects…' })}
        </p>
      ) : filtered.length === 0 ? (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.textCenter,
            cm.sp('py', 16),
            'text-on-surface-variant',
          )}
        >
          {projects.length === 0
            ? t(
                'projects.empty',
                {},
                { defaultValue: 'No projects yet — start your first one to see it here.' },
              )
            : t('projects.emptyFiltered', {}, { defaultValue: 'No projects match this filter.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}>
          {filtered.map((p) => (
            <TranslationProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Projects
export { Projects as ProjectsPage }
