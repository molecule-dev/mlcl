import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnimationToolLayout } from '../components/AnimationToolLayout.js'
import { ProjectCard, type ProjectSummary } from '../components/ProjectCard.js'
import { type ProjectStatus, StatusPill } from '../components/StatusPill.js'

interface ApiProject {
  id: string
  name: string
  width?: number
  height?: number
  fps?: number
  duration?: number | string
  updated_at?: string
  created_at?: string
}

// Decorative project thumbnail swatches — user-visible design palettes, intentionally static.
const SWATCHES = [
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
]

const ICONS = [
  'auto_awesome',
  'graphic_eq',
  'rocket_launch',
  'animation',
  'bolt',
  'view_carousel',
  'bar_chart',
  'touch_app',
]

function formatTimecode(durationSeconds: number): string {
  const total = Math.max(0, Math.floor(durationSeconds))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return ''
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function projectStatus(p: ApiProject): ProjectStatus {
  const updated = Date.parse(String(p.updated_at ?? p.created_at ?? ''))
  if (Number.isNaN(updated)) return 'draft'
  const ageSec = (Date.now() - updated) / 1000
  if (ageSec < 60 * 60 * 24) return 'ready'
  if (ageSec < 60 * 60 * 24 * 7) return 'shared'
  return 'draft'
}

function toSummary(p: ApiProject, idx: number): ProjectSummary {
  const durSec = Number(p.duration ?? 0)
  return {
    id: p.id,
    name: p.name,
    duration: formatTimecode(durSec),
    lastEdited: formatTimeAgo(p.updated_at ?? p.created_at),
    status: projectStatus(p),
    swatch: SWATCHES[idx % SWATCHES.length],
    icon: ICONS[idx % ICONS.length],
  }
}

const FILTERS: Array<{ id: 'all' | ProjectStatus; label: string; defaultLabel: string }> = [
  { id: 'all', label: 'projects.filter.all', defaultLabel: 'All' },
  { id: 'ready', label: 'projects.filter.ready', defaultLabel: 'Ready' },
  { id: 'rendering', label: 'projects.filter.rendering', defaultLabel: 'Rendering' },
  { id: 'draft', label: 'projects.filter.draft', defaultLabel: 'Draft' },
  { id: 'shared', label: 'projects.filter.shared', defaultLabel: 'Shared' },
  { id: 'error', label: 'projects.filter.error', defaultLabel: 'Errors' },
]

export function Projects() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [projects, setProjects] = useState<ApiProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiProject[]>('/api/projects')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data) ? res.data : []
        setProjects(arr)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('projects.fetchError', {}, { defaultValue: 'Could not load projects.' }))
        setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const summaries = useMemo<ProjectSummary[]>(() => {
    if (!projects) return []
    return projects.map(toSummary)
  }, [projects])

  const filtered = useMemo<ProjectSummary[]>(() => {
    return summaries.filter((p) => {
      const matchesFilter = filter === 'all' || p.status === filter
      const matchesQuery = !query.trim() || p.name.toLowerCase().includes(query.toLowerCase())
      return matchesFilter && matchesQuery
    })
  }, [filter, query, summaries])

  async function handleCreate() {
    if (creating) return
    setCreating(true)
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const res = await http.post<{ id: string }>('/api/projects', {
        name: t('projects.newProjectName', { stamp }, { defaultValue: 'Untitled · {{stamp}}' }),
      })
      const id = res.data?.id
      if (id) {
        track({ name: 'animation.created', properties: { projectId: id } })
        navigate(`/projects/${id}`)
      } else {
        // Re-fetch list when API returns no id (defensive)
        const refresh = await http.get<ApiProject[]>('/api/projects')
        setProjects(Array.isArray(refresh.data) ? refresh.data : [])
      }
    } catch (error) {
      logError('projects.create', error)
      setError(t('projects.createError', {}, { defaultValue: 'Could not create project.' }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <AnimationToolLayout
      title={t('nav.projects', {}, { defaultValue: 'Projects' })}
      breadcrumb={t(
        'projects.crumb',
        { filter: filter as string },
        { defaultValue: '// projects · {{filter}}' },
      )}
    >
      <div className={cm.stack(6)} data-mol-filter={filter}>
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }))}>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'font-headline tracking-tight',
              )}
              style={{ color: 'var(--anim-text)' }}
            >
              {t('projects.heading', {}, { defaultValue: 'All projects' })}
            </h2>
            <p
              className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
              style={{ color: 'var(--anim-text-secondary)' }}
            >
              {t(
                'projects.subhead',
                { count: summaries.length, filter: filter as string },
                { defaultValue: '{{count}} matching · filter: {{filter}}' },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            data-mol-id="projects-new-project"
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
              color: 'var(--color-on-primary)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
            <span>
              {creating
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('nav.newProject', {}, { defaultValue: 'New project' })}
            </span>
          </button>
        </header>

        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }), 'flex-wrap')}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                data-mol-id={`projects-filter-${f.id}`}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'font-mono text-[10px] uppercase tracking-widest rounded-full border transition-colors',
                )}
                style={
                  filter === f.id
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--anim-primary) 15%, transparent)',
                        color: 'var(--anim-primary)',
                        borderColor: 'color-mix(in srgb, var(--anim-primary) 40%, transparent)',
                      }
                    : {
                        color: 'var(--anim-text-secondary)',
                        borderColor: 'var(--anim-border)',
                      }
                }
              >
                {t(f.label, {}, { defaultValue: f.defaultLabel })}
              </button>
            ))}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'relative')}>
            <span
              className={cm.cn(
                'material-symbols-outlined text-[16px] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
              )}
              style={{ color: 'var(--anim-text-muted)' }}
            >
              search
            </span>
            <input
              type="search"
              placeholder={t('projects.searchPlaceholder', {}, { defaultValue: 'Search projects' })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cm.cn(
                cm.sp('pl', 8),
                cm.sp('pr', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-72 rounded-full focus:outline-none transition-colors',
              )}
              style={{
                backgroundColor: 'var(--anim-surface)',
                color: 'var(--anim-text)',
                border: '1px solid var(--anim-border)',
              }}
            />
          </div>
        </div>

        {projects === null ? (
          <p
            className={cm.cn(cm.textSize('xs'), 'font-mono uppercase tracking-widest')}
            style={{ color: 'var(--anim-text-secondary)' }}
          >
            {t('projects.loading', {}, { defaultValue: 'Loading projects…' })}
          </p>
        ) : error ? (
          <p
            role="alert"
            className={cm.cn(cm.textSize('sm'), 'font-mono')}
            style={{ color: 'var(--anim-danger)' }}
          >
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <div
            className={cm.cn(cm.sp('p', 12), cm.textCenter, 'rounded-xl border border-dashed')}
            style={{
              borderColor: 'var(--anim-border)',
              backgroundColor: 'color-mix(in srgb, var(--anim-surface) 40%, transparent)',
            }}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl')}
              style={{ color: 'var(--anim-text-muted)' }}
            >
              animation
            </span>
            <p
              className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4))}
              style={{ color: 'var(--anim-text-secondary)' }}
            >
              {summaries.length === 0
                ? t(
                    'projects.empty',
                    {},
                    { defaultValue: 'No projects yet — create your first one above.' },
                  )
                : t(
                    'projects.emptyFilter',
                    {},
                    { defaultValue: 'No projects match those filters yet.' },
                  )}
            </p>
          </div>
        ) : (
          <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4')}>
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}

        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.textSize('xs'),
            cm.sp('pt', 4),
            'border-t font-mono uppercase tracking-widest',
          )}
          style={{ color: 'var(--anim-text-muted)', borderColor: 'var(--anim-border)' }}
        >
          <StatusPill status="ready" />{' '}
          {t('projects.legendReady', {}, { defaultValue: 'render finished' })}
          <StatusPill status="rendering" />{' '}
          {t('projects.legendRendering', {}, { defaultValue: 'render in progress' })}
          <StatusPill status="draft" />{' '}
          {t('projects.legendDraft', {}, { defaultValue: 'never exported' })}
          <StatusPill status="error" />{' '}
          {t('projects.legendError', {}, { defaultValue: 'render failed' })}
        </p>
      </div>
    </AnimationToolLayout>
  )
}

export default Projects
