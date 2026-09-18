import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { unwrapList, unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectGrid } from '../components/ProjectTile.js'

interface Project {
  id: string
  name: string
  bpm: number
  time_signature: string
  cover_index?: number
  duration_seconds?: number
  duration?: number | string
  track_count?: number
  last_edited?: string
  is_pinned?: boolean
  created_at?: string
}

const FILTERS = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'pinned', defaultLabel: 'Pinned' },
  { key: 'recent', defaultLabel: 'Recent' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

function decorate(p: Project, i: number): Project {
  const dur = typeof p.duration === 'string' ? parseFloat(p.duration) : p.duration
  return {
    ...p,
    cover_index: p.cover_index ?? i % 8,
    duration_seconds: p.duration_seconds ?? Number(dur ?? 0),
    track_count: p.track_count ?? 0,
    last_edited:
      p.last_edited ?? (p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'),
  }
}

export function Projects() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const newNameRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<unknown>('/api/projects')
      .then((res) => {
        if (cancelled) return
        setProjects(unwrapList<Project>(res.data).map(decorate))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (!showNewModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNewModal(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showNewModal])

  // Move focus INTO the dialog when it opens. The modal already handled the
  // Escape half of the WAI-ARIA dialog pattern but never the focus half, so
  // opening it left focus on the "New project" trigger sitting behind the
  // aria-modal overlay — keyboard and screen-reader users landed outside the
  // dialog they had just opened and had to tab in blind.
  useEffect(() => {
    if (showNewModal) newNameRef.current?.focus()
  }, [showNewModal])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await http.post<unknown>('/api/projects', { name, bpm: 120 })
      const created = unwrapSingle<Project>(res.data)
      if (created && created.id) {
        setShowNewModal(false)
        setNewName('')
        navigate(`/projects/${created.id}`)
      } else {
        setCreateError(
          t('projects.createFailed', {}, { defaultValue: 'Failed to create project.' }),
        )
      }
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('projects.createFailed', {}, { defaultValue: 'Failed to create project.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  // 'recent' shows the newest few (the list arrives sorted newest-first);
  // previously the chip was a no-op identical to 'all'.
  const RECENT_LIMIT = 8
  const filtered = projects.filter((p) => {
    if (filter === 'pinned') return p.is_pinned
    return true
  })
  const visible = filter === 'recent' ? filtered.slice(0, RECENT_LIMIT) : filtered

  return (
    <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 8), 'space-y-8')}>
      <header className={cm.cn('flex items-end justify-between gap-4 flex-wrap')}>
        <div>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-1')}>
            {t('nav.projects', {}, { defaultValue: 'Projects' })}
          </h1>
          <p className={cm.cn('text-sm text-on-surface-variant mt-2')}>
            {t(
              'projects.subtitle',
              { count: projects.length },
              { defaultValue: '{{count}} arrangements · sorted by last edited' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewName('')
            setCreateError(null)
            setShowNewModal(true)
          }}
          className={cm.cn(
            'inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-sm text-white rounded-full',
          )}
          style={{
            background: 'linear-gradient(135deg, var(--daw-primary), var(--daw-secondary))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('nav.newProject', {}, { defaultValue: 'New project' })}
        </button>
      </header>

      <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cm.cn(
              'px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors',
              filter === f.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            )}
          >
            {t(`projects.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={cm.cn('text-sm', cm.textMuted)}>
          {t('projects.loading', {}, { defaultValue: 'Loading your projects…' })}
        </p>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            'rounded-2xl border border-dashed border-outline-variant px-6 py-12 text-center',
          )}
        >
          <p className={cm.cn('text-sm font-semibold text-on-surface-variant')}>
            {t(
              'projects.empty',
              {},
              { defaultValue: 'No projects yet — create your first arrangement.' },
            )}
          </p>
        </div>
      ) : (
        <ProjectGrid projects={visible as never} />
      )}

      {showNewModal && (
        <div
          role="presentation"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewModal(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.newProject', {}, { defaultValue: 'New project' })}
            className={cm.cn('w-full max-w-md')}
          >
            <form
              onSubmit={handleCreate}
              className={cm.cn(
                'w-full rounded-2xl bg-surface p-6 shadow-2xl space-y-5 border border-outline-variant',
              )}
            >
              <div>
                <h2 className={cm.cn('text-lg font-extrabold tracking-tight')}>
                  {t('nav.newProject', {}, { defaultValue: 'New project' })}
                </h2>
                <p className={cm.cn('text-sm text-on-surface-variant mt-1')}>
                  {t(
                    'projects.newProjectBody',
                    {},
                    { defaultValue: 'Give it a working title — you can rename later.' },
                  )}
                </p>
              </div>
              <label className={cm.cn('block')}>
                <span
                  className={cm.cn(
                    'text-[11px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('projects.newProjectName', {}, { defaultValue: 'Project name' })}
                </span>
                <input
                  ref={newNameRef}
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={cm.cn(
                    'mt-2 w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface focus:border-primary focus:outline-none',
                  )}
                  placeholder={t(
                    'projects.newProjectPlaceholder',
                    {},
                    { defaultValue: 'Midnight Bass — Take 2' },
                  )}
                />
              </label>
              {createError && (
                <p
                  role="alert"
                  className={cm.cn(
                    'text-sm text-on-error-container bg-error-container px-3 py-2 rounded-lg',
                  )}
                >
                  {createError}
                </p>
              )}
              <div className={cm.cn('flex justify-end gap-2')}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className={cm.cn(
                    'px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-lowest border border-outline-variant hover:bg-surface-container transition-colors',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={cm.cn(
                    'px-5 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-60',
                  )}
                  style={{
                    background: 'linear-gradient(135deg, var(--daw-primary), var(--daw-secondary))',
                  }}
                >
                  {creating
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('projects.create', {}, { defaultValue: 'Create project' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
