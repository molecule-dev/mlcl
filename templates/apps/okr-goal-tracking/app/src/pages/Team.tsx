import { useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useGet, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProgressRing } from '../components/ProgressRing.js'
import { type ObjectiveRow, toNumber } from '../lib/api.js'

interface TeamRow {
  id: string
  owner_id: string
  name: string
  parent_id: string | null
  lead_user_id: string | null
  created_at: string
  updated_at: string
}

export function Team() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const client = useHttpClient()

  const {
    data: teams,
    execute: refetchTeams,
    loading: teamsLoading,
    error: teamsError,
  } = useGet<TeamRow[]>('/api/teams', { immediate: true })
  const { data: objectives, execute: refetchObjectives } = useGet<ObjectiveRow[]>(
    '/api/objectives',
    { immediate: true },
  )

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const teamRows = teams ?? []
  // eslint-disable-next-line react-hooks/exhaustive-deps -- objectives ?? [] creates a new array reference each render; memos depend on stable identity from objectives
  const objectiveRows = objectives ?? []

  const overallProgress = useMemo(() => {
    if (objectiveRows.length === 0) return 0
    return Math.round(
      objectiveRows.reduce((sum, o) => sum + toNumber(o.progress), 0) / objectiveRows.length,
    )
  }, [objectiveRows])

  const objectivesByTeam = useMemo(() => {
    const map = new Map<string | null, ObjectiveRow[]>()
    for (const obj of objectiveRows) {
      const k = obj.team_id ?? null
      const arr = map.get(k) ?? []
      arr.push(obj)
      map.set(k, arr)
    }
    return map
  }, [objectiveRows])

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const created = await client.post<TeamRow>('/api/teams', { name: newName.trim() })
      // Domain event (fire-and-forget; no-ops without an analytics provider).
      track({ name: 'team.created', properties: { team_id: created.data?.id } })
      setNewName('')
      void refetchTeams()
      void refetchObjectives()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (team: TeamRow): Promise<void> => {
    setError(null)
    try {
      await client.patch<TeamRow>(`/api/teams/${team.id}`, { name: renameDraft.trim() })
      setRenamingId(null)
      setRenameDraft('')
      void refetchTeams()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDelete = async (team: TeamRow): Promise<void> => {
    if (
      !window.confirm(
        t(
          'team.confirmDelete',
          { name: team.name },
          { defaultValue: 'Delete team "{{name}}"? Objectives will be unlinked.' },
        ),
      )
    ) {
      return
    }
    setError(null)
    try {
      await client.delete(`/api/teams/${team.id}`)
      void refetchTeams()
      void refetchObjectives()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className={cm.cn(cm.stack(8))} data-testid="team-page">
      <header
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white', cm.sp('p', 8))}
        style={{
          background:
            'linear-gradient(135deg, var(--color-nav-bg) 0%, var(--color-primary-hover) 60%, var(--color-secondary) 100%)',
        }}
      >
        <div
          aria-hidden
          className={cm.cn(
            'absolute -right-24 -top-20 w-72 h-72 rounded-full bg-sky-400/30 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ justify: 'between', align: 'center', gap: 'lg' }),
            'relative flex-col md:flex-row',
          )}
        >
          <div className={cm.cn(cm.stack(3), 'max-w-xl')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-[0.22em] text-sky-200',
              )}
            >
              {t('team.eyebrow', {}, { defaultValue: 'Workspace · Teams' })}
            </span>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.05] text-white',
              )}
            >
              {t('team.heading', {}, { defaultValue: 'Your teams' })}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-indigo-100 leading-relaxed')}>
              {t(
                'team.subheading',
                { teams: teamRows.length, objectives: objectiveRows.length },
                {
                  defaultValue:
                    '{{teams}} teams · {{objectives}} objectives. Group your OKRs by team to see roll-ups.',
                },
              )}
            </p>
          </div>
          <ProgressRing
            value={overallProgress}
            size={140}
            stroke={12}
            status={
              overallProgress >= 75 ? 'on-track' : overallProgress >= 50 ? 'at-risk' : 'behind'
            }
            label={t('team.progressLabel', {}, { defaultValue: 'Workspace progress' })}
            className="text-white"
          />
        </div>
      </header>

      <form
        onSubmit={handleCreate}
        data-testid="team-create-form"
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ align: 'center', gap: 'sm' }),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm flex-wrap',
        )}
      >
        <label
          htmlFor="new-team-name"
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('team.newTeamLabel', {}, { defaultValue: 'New team' })}
        </label>
        <input
          id="new-team-name"
          data-testid="team-name-input"
          type="text"
          required
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t(
            'team.newTeamPlaceholder',
            {},
            { defaultValue: 'e.g. Customer Experience' },
          )}
          className={cm.cn(
            cm.flex1,
            cm.sp('px', 4),
            cm.sp('py', 2),
            'rounded-xl bg-surface-container-low text-on-surface ring-1 ring-outline-variant focus:ring-indigo-600 focus:outline-none',
          )}
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          data-testid="team-create-submit"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-colors disabled:opacity-60',
          )}
        >
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('team.create', {}, { defaultValue: 'Create team' })}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          data-testid="team-error"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-light text-error border border-red-200',
          )}
        >
          {error}
        </p>
      )}

      {teamsLoading ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('team.loading', {}, { defaultValue: 'Loading teams…' })}
        </p>
      ) : teamsError ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            cm.textSize('sm'),
            'rounded-xl bg-error-light text-error border border-red-200',
          )}
        >
          {t('team.loadError', {}, { defaultValue: 'Could not load teams.' })}
        </p>
      ) : teamRows.length === 0 ? (
        <div
          data-testid="team-empty"
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(2),
            'rounded-2xl border border-dashed border-outline-variant text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}>
            {t('team.empty.heading', {}, { defaultValue: 'No teams yet' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'team.empty.body',
              {},
              {
                defaultValue:
                  'Create your first team above to organize objectives and track roll-ups.',
              },
            )}
          </p>
        </div>
      ) : (
        <section data-testid="team-list" className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
          {teamRows.map((team) => {
            const teamObjs = objectivesByTeam.get(team.id) ?? []
            const teamProgress =
              teamObjs.length === 0
                ? 0
                : Math.round(
                    teamObjs.reduce((s, o) => s + toNumber(o.progress), 0) / teamObjs.length,
                  )
            const isRenaming = renamingId === team.id
            return (
              <article
                key={team.id}
                data-testid={`team-${team.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
                )}
              >
                <header
                  className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}
                >
                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => handleRename(team)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(team)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      data-testid={`team-rename-input-${team.id}`}
                      className={cm.cn(
                        cm.flex1,
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'rounded-lg bg-surface-container ring-1 ring-indigo-600 text-on-surface focus:outline-none',
                      )}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(team.id)
                        setRenameDraft(team.name)
                      }}
                      data-testid={`team-name-${team.id}`}
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-on-surface text-left flex-1 hover:text-indigo-700 transition-colors',
                      )}
                    >
                      {team.name}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(team)}
                    data-testid={`team-delete-${team.id}`}
                    aria-label={t(
                      'team.deleteAria',
                      { name: team.name },
                      { defaultValue: 'Delete {{name}}' },
                    )}
                    className={cm.cn('text-on-surface-variant hover:text-error transition-colors')}
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </header>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
                  <div className={cm.cn(cm.stack(1))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('team.objectivesLabel', {}, { defaultValue: 'Objectives' })}
                    </span>
                    <span
                      data-testid={`team-objective-count-${team.id}`}
                      className={cm.cn(
                        cm.textSize('xl'),
                        'font-extrabold tabular-nums text-on-surface',
                      )}
                    >
                      {teamObjs.length}
                    </span>
                  </div>
                  <ProgressRing
                    value={teamProgress}
                    size={64}
                    stroke={6}
                    status={
                      teamProgress >= 75 ? 'on-track' : teamProgress >= 50 ? 'at-risk' : 'behind'
                    }
                  />
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}

export default Team
