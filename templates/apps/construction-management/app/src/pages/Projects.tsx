import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusBadge } from '../components/StatusBadge.js'
import { formatMoney } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Project {
  id: string
  code: string
  name: string
  description: string
  phase: string
  budget_cents: number
  progress: number
}

const PHASES = [
  'preconstruction',
  'site_work',
  'foundations',
  'structure',
  'envelope',
  'mechanicals',
  'finishes',
  'closeout',
] as const

const PHASE_TONE: Record<string, 'info' | 'progress' | 'success' | 'neutral'> = {
  preconstruction: 'info',
  site_work: 'info',
  foundations: 'progress',
  structure: 'progress',
  envelope: 'progress',
  mechanicals: 'progress',
  finishes: 'success',
  closeout: 'neutral',
}

export function Projects() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [list, setList] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [phase, setPhase] = useState<string>('preconstruction')
  const [budget, setBudget] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/projects')
      .then((res) => {
        if (!cancelled) setList(unwrapList<Project>(res))
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

  const visible = list.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
  })

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const res = await http.post('/projects', {
        name,
        code: code || undefined,
        phase,
        budget_cents: budget ? Math.round(Number(budget) * 100) : 0,
      })
      const created = (res as unknown as { data?: Project }).data
      if (created) setList((prev) => [created, ...prev])
      setShowForm(false)
      setName('')
      setCode('')
      setPhase('preconstruction')
      setBudget('')
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('projects.createError', {}, { defaultValue: 'Failed to create the project.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('projects.heading', {}, { defaultValue: 'Projects' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'projects.subheading',
              { count: visible.length, total: list.length },
              { defaultValue: '{{count}} of {{total}} jobsites' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="projects-new-button"
          onClick={() => setShowForm((v) => !v)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-md brand-gradient text-on-primary',
          )}
        >
          {showForm
            ? t('projects.cancelNew', {}, { defaultValue: 'Cancel' })
            : t('projects.newButton', {}, { defaultValue: 'New project' })}
        </button>
      </header>

      {showForm && (
        <form
          data-mol-id="projects-new-form"
          onSubmit={handleCreate}
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        >
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('projects.field.name', {}, { defaultValue: 'Project name' })}
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-mol-id="projects-field-name"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
                placeholder={t(
                  'projects.field.namePlaceholder',
                  {},
                  { defaultValue: 'e.g. Riverside Medical Office' },
                )}
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('projects.field.code', {}, { defaultValue: 'Project code' })}
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                data-mol-id="projects-field-code"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
                placeholder={t(
                  'projects.field.codePlaceholder',
                  {},
                  { defaultValue: 'e.g. RMO-301' },
                )}
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('projects.field.phase', {}, { defaultValue: 'Phase' })}
              </span>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                data-mol-id="projects-field-phase"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
              >
                {PHASES.map((p) => (
                  <option key={p} value={p}>
                    {t(`projects.phase.${p}`, {}, { defaultValue: p.replace(/_/g, ' ') })}
                  </option>
                ))}
              </select>
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('projects.field.budget', {}, { defaultValue: 'Budget (USD)' })}
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                data-mol-id="projects-field-budget"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
                placeholder="2500000"
              />
            </label>
          </div>
          {formError && (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            data-mol-id="projects-create-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md brand-gradient text-on-primary disabled:opacity-50',
            )}
          >
            {saving
              ? t('projects.creating', {}, { defaultValue: 'Creating…' })
              : t('projects.createButton', {}, { defaultValue: 'Create project' })}
          </button>
        </form>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-mol-id="projects-search"
        placeholder={t('projects.searchPlaceholder', {}, { defaultValue: 'Search name or code…' })}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'border border-outline-variant rounded-md bg-surface max-w-md w-full',
        )}
      />

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'projects.empty',
            {},
            { defaultValue: 'No projects yet — create your first jobsite.' },
          )}
        </p>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2 xl:grid-cols-3')}>
          {visible.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              data-mol-id={`project-card-${p.id}`}
              className={cm.cn(
                cm.card(),
                cm.sp('p', 5),
                'block hover:bg-surface-container-low transition-colors',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {p.code || '—'}
                </span>
                <StatusBadge
                  value={p.phase}
                  tone={PHASE_TONE[p.phase] ?? 'neutral'}
                  translationKeyPrefix="projects.phase"
                />
              </div>
              <h2 className={cm.cn(cm.sp('mt', 2), cm.textSize('base'), cm.fontWeight('semibold'))}>
                {p.name}
              </h2>
              <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
                {formatMoney(p.budget_cents, true)}
              </p>
              <div
                className={cm.cn(
                  cm.sp('mt', 3),
                  'h-2 rounded-full bg-surface-container-highest overflow-hidden',
                )}
              >
                <div
                  className={'h-full bg-primary'}
                  style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                />
              </div>
              <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'projects.progress',
                  { progress: p.progress },
                  { defaultValue: '{{progress}}% complete' },
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Projects
