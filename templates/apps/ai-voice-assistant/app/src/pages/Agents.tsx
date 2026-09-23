import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AgentPersonaCard } from '../components/AgentPersonaCard.js'

interface AgentRow {
  id: string
  name: string
  system_prompt: string
  voice_id: string | null
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || parts[0] === '') return 'AG'
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function Agents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [agents, setAgents] = useState<AgentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get<AgentRow[]>('/agents')
        if (cancelled) return
        setAgents(Array.isArray(res.data) ? res.data : [])
      } catch (e) {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('agents.fetchError', {}, { defaultValue: 'Could not load agents.' }),
        )
        setAgents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleCreate() {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post<AgentRow>('/agents', {
        name: t('agents.newName', {}, { defaultValue: 'Untitled persona' }),
        system_prompt: t(
          'agents.newPrompt',
          {},
          {
            defaultValue:
              'You are a thoughtful, voice-native thinking partner. Mirror the user’s tempo.',
          },
        ),
      })
      if (res.data) {
        setAgents((prev) => [res.data, ...(prev ?? [])])
        // Domain event: a persona was created — the agent funnel's entry point.
        track({ name: 'agent.created', properties: { agentId: res.data.id } })
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t('agents.createError', {}, { defaultValue: 'Could not create agent.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.textMuted,
              'uppercase tracking-widest font-semibold',
            )}
          >
            {t('agents.eyebrow', {}, { defaultValue: 'Personas' })}
          </span>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('agents.title', {}, { defaultValue: 'Choose a voice to think with.' })}
          </h1>
          <p className={cm.cn(cm.textMuted, cm.sp('mt', 1))}>
            {t(
              'agents.subtitle',
              {},
              {
                defaultValue:
                  'Each agent has its own tone, tempo, and specialty. Switch any time mid-conversation.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className={cm.cn(
            cm.roundedFull,
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.sp('px', 5),
            cm.sp('py', 2),
            'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60',
          )}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('agents.create', {}, { defaultValue: 'New persona' })}
        </button>
      </header>

      <main
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto, cm.w('full'), 'max-w-[1200px]')}
      >
        {agents === null ? (
          <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
            {t('agents.loading', {}, { defaultValue: 'Loading personas…' })}
          </p>
        ) : agents.length === 0 ? (
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('py', 16),
              cm.textCenter,
            )}
          >
            <span
              className={cm.cn(
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'h-16 w-16 bg-surface border border-border text-foreground-tertiary',
              )}
            >
              <span className="material-symbols-outlined text-[28px]">psychology</span>
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'))}>
              {t('agents.emptyTitle', {}, { defaultValue: 'No personas yet.' })}
            </p>
            <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
              {t(
                'agents.emptyBody',
                {},
                {
                  defaultValue: 'Create one to give your conversations a distinct voice and tone.',
                },
              )}
            </p>
          </div>
        ) : (
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 xl:grid-cols-3')}>
            {agents.map((a) => (
              <AgentPersonaCard
                key={a.id}
                to={`/agents/${a.id}`}
                name={a.name}
                voice={a.voice_id ?? t('agents.noVoice', {}, { defaultValue: 'No voice set' })}
                description={
                  a.system_prompt || t('agents.noPrompt', {}, { defaultValue: 'No description.' })
                }
                capabilities={[]}
                initials={initials(a.name)}
              />
            ))}
          </div>
        )}
        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  )
}

export default Agents
export { Agents, Agents as AgentsPage }
