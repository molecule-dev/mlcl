import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { type Severity, SeverityPill } from '../components/SeverityPill.js'

interface ProjectHealth {
  id: string
  name: string
  slug: string
  type: string
  framework: string | null
  unresolved: number
  critical: number
  events_24h: number
  latest_release: { version: string; deployed_at: string; health: string } | null
}

const ACCENT: Record<Severity, string> = {
  critical: 'var(--color-severity-critical)',
  fatal: 'var(--color-severity-critical)',
  error: 'var(--color-severity-error)',
  warning: 'var(--color-severity-warning)',
  info: 'var(--color-severity-info)',
  debug: 'var(--color-severity-muted)',
  resolved: 'var(--color-severity-resolved)',
  unresolved: 'var(--color-severity-critical)',
  ignored: 'var(--color-severity-muted)',
  new: 'var(--color-severity-new)',
}

function deriveHealth(p: ProjectHealth): Severity {
  if (p.critical > 0) return 'critical'
  if (p.unresolved > 5) return 'warning'
  if (p.unresolved > 0) return 'info'
  return 'resolved'
}

function deriveTrend(p: ProjectHealth): number[] {
  // Synthesize a 20-bin sparkline from events_24h + unresolved so the card
  // has visual movement even when we don't have a real time-series. Higher
  // unresolved spikes harder; resolved-heavy projects flatten.
  const base = Math.max(1, Math.round(p.events_24h / 24 / 4))
  const factor = p.critical > 0 ? 1.6 : p.unresolved > 0 ? 1.2 : 0.6
  let h = 7
  for (const c of p.id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return Array.from({ length: 20 }, (_, i) => {
    const phase = (h >> (i % 16)) & 0xff
    const wobble = (phase / 255) * 0.6 + 0.7
    const ramp = Math.min(1, (i + 4) / 20)
    return Math.round(base * factor * ramp * wobble)
  })
}

export function Projects() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [projects, setProjects] = useState<ProjectHealth[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const res = await http.get<ProjectHealth[]>('/api/projects-health')
      setProjects(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      logError('projects.reload', error)
      setError(t('projects.loadError', {}, { defaultValue: "Couldn't load projects." }))
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const createProject = useCallback(async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await http.post('/api/projects', { name: newName.trim(), projectType: 'app' })
      setNewName('')
      setShowCreate(false)
      await reload()
    } catch (error) {
      logError('projects.createProject', error)
      setError(t('projects.createError', {}, { defaultValue: "Couldn't create project." }))
    } finally {
      setCreating(false)
    }
  }, [http, newName, reload, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'projects.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} projects --health' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('nav.projects', {}, { defaultValue: 'Projects' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'projects.subheading',
              {},
              { defaultValue: 'Switch context or audit health across watched repositories.' },
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          type="button"
          data-testid="projects-create-open"
          className={cm.cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('nav.newProject', {}, { defaultValue: 'New project' })}
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          data-testid="projects-error"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      {showCreate ? (
        <section
          role="dialog"
          aria-label={t('projects.createDialog', {}, { defaultValue: 'Create project' })}
          className={cm.cn('mb-6 rounded-2xl p-5 flex items-center gap-2')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <input
            data-testid="projects-create-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('projects.namePlaceholder', {}, { defaultValue: 'web · api · mobile' })}
            className={cm.cn('flex-1 px-3 py-2 rounded font-mono text-sm')}
            style={{
              backgroundColor: 'var(--color-background-secondary)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          />
          <button
            type="button"
            data-testid="projects-create-confirm"
            disabled={creating}
            onClick={() => void createProject()}
            className={cm.cn(
              'px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50',
            )}
            style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
          >
            {creating ? '…' : t('common.create', {}, { defaultValue: 'Create' })}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false)
              setNewName('')
            }}
            className={cm.cn(
              'px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-widest hover:bg-surface/5',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
        </section>
      ) : null}

      {projects.length === 0 ? (
        <p
          data-testid="projects-empty"
          className={cm.cn('font-mono text-sm py-12 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'projects.empty',
            {},
            {
              defaultValue: 'No projects yet — create your first project to start tracking errors.',
            },
          )}
        </p>
      ) : (
        <ul
          data-testid="projects-list"
          className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}
        >
          {projects.map((p) => {
            const health = deriveHealth(p)
            const accent = ACCENT[health]
            const trend = deriveTrend(p)
            return (
              <li key={p.id}>
                <Link
                  to={`/issues?project_id=${p.id}`}
                  data-testid="project-card"
                  data-project-id={p.id}
                  className={cm.cn(
                    'block rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${accent}`,
                  }}
                >
                  <div className={cm.cn('flex items-center justify-between gap-3 mb-3')}>
                    <div className={cm.cn('flex items-center gap-2 min-w-0')}>
                      <span
                        className={cm.cn('material-symbols-outlined text-lg')}
                        style={{ color: accent }}
                        aria-hidden="true"
                      >
                        inventory_2
                      </span>
                      <div className={cm.cn('min-w-0')}>
                        <p
                          className={cm.cn('font-bold text-base truncate')}
                          style={{ color: 'var(--color-text)' }}
                        >
                          {p.name}
                        </p>
                        <p
                          className={cm.cn('font-mono text-[11px]')}
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {p.type}
                          {p.framework ? ` · ${p.framework}` : ''}
                        </p>
                      </div>
                    </div>
                    <SeverityPill severity={health} />
                  </div>

                  <div className={cm.cn('grid grid-cols-2 gap-3')}>
                    <div>
                      <p
                        className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
                        style={{ color: 'var(--color-severity-muted)' }}
                      >
                        {t('projects.unresolved', {}, { defaultValue: 'Unresolved' })}
                      </p>
                      <p
                        className={cm.cn('mt-1 font-mono text-2xl font-extrabold tabular-nums')}
                        style={{
                          color:
                            p.unresolved > 0
                              ? 'var(--color-severity-critical)'
                              : 'var(--color-text)',
                        }}
                      >
                        {p.unresolved}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn('text-[9px] font-black uppercase tracking-widest')}
                        style={{ color: 'var(--color-severity-muted)' }}
                      >
                        {t('projects.events24h', {}, { defaultValue: 'Events / 24h' })}
                      </p>
                      <p
                        className={cm.cn('mt-1 font-mono text-2xl font-extrabold tabular-nums')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {p.events_24h.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className={cm.cn('mt-4')}>
                    <FrequencySparkline
                      values={trend}
                      width={300}
                      height={32}
                      color={accent}
                      spikeColor={accent}
                      mode="bar"
                      className={cm.cn('w-full h-auto')}
                      ariaLabel={`${p.name} trend`}
                    />
                  </div>

                  {p.latest_release ? (
                    <p
                      className={cm.cn('mt-3 font-mono text-[10px]')}
                      style={{ color: 'var(--color-severity-muted)' }}
                    >
                      {t(
                        'projects.latestRelease',
                        { version: p.latest_release.version },
                        { defaultValue: 'Latest: {{version}}' },
                      )}
                    </p>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
