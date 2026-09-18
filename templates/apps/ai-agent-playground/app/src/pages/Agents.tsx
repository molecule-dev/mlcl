// Pattern source: ai-chatbot-builder/pages/BotsList + AgentCard.
// Authed agents list page — filter chips + grid of AgentCards bound to the agents resource.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AgentCard, type AgentStatus } from '../components/AgentCard.js'
import { PageHeader } from '../components/PageHeader.js'

interface AgentRow {
  id: string
  name?: string
  description?: string
  provider?: string
  status?: string
  run_count?: number
  last_run_at?: string | null
  updated_at?: string
}

const FILTERS: Array<{ key: 'all' | AgentStatus; labelKey: string; defaultLabel: string }> = [
  { key: 'all', labelKey: 'agents.filter.all', defaultLabel: 'All' },
  { key: 'running', labelKey: 'agents.filter.running', defaultLabel: 'Running' },
  { key: 'idle', labelKey: 'agents.filter.idle', defaultLabel: 'Idle' },
  { key: 'failed', labelKey: 'agents.filter.failed', defaultLabel: 'Failed' },
  { key: 'paused', labelKey: 'agents.filter.paused', defaultLabel: 'Paused' },
]

function deriveStatus(row: AgentRow): AgentStatus {
  switch ((row.status ?? '').toLowerCase()) {
    case 'archived':
      return 'paused'
    case 'failed':
      return 'failed'
    case 'running':
      return 'running'
    default:
      return row.run_count && row.run_count > 0 ? 'idle' : 'paused'
  }
}

function formatLastRun(iso?: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

export function Agents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()

  const [rows, setRows] = useState<AgentRow[]>([])
  const [filter, setFilter] = useState<'all' | AgentStatus>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<AgentRow[]>('/agents')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const enriched = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        name: row.name?.trim() || t('agents.untitled', {}, { defaultValue: 'Untitled Agent' }),
        description:
          row.description?.trim() ||
          t('agents.noDescription', {}, { defaultValue: 'No description yet.' }),
        provider: row.provider ?? 'anthropic',
        status: deriveStatus(row),
        lastRun: formatLastRun(row.last_run_at ?? row.updated_at),
        iconName: 'smart_toy',
      })),
    [rows, t],
  )

  const filtered = filter === 'all' ? enriched : enriched.filter((row) => row.status === filter)

  async function createAgent(): Promise<void> {
    setError(null)
    try {
      const res = await http.post<AgentRow>('/agents', { name: '' })
      const row = res.data as AgentRow
      if (row?.id) navigate(`/agents/${row.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div data-mol-id="page-agents">
      <PageHeader
        actions={
          <button
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              cm.flex({ align: 'center', gap: 2 }),
              'btn-primary-gradient rounded text-on-primary-fixed font-mono uppercase tracking-wider',
            )}
            data-mol-id="agents-new"
            onClick={createAgent}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {t('agents.newAgent', {}, { defaultValue: 'New Agent' })}
          </button>
        }
        subtitle={t(
          'agents.subtitle',
          {},
          { defaultValue: 'Compose, configure, and observe every agent in your workspace.' },
        )}
        title={t('agents.title', {}, { defaultValue: 'Agents' })}
      />

      {error && (
        <p
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-mono')}
          data-mol-id="agents-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className={cm.cn(cm.flex({ gap: 2 }), cm.sp('mb', 6), 'flex-wrap')}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'font-mono uppercase tracking-wider rounded border transition-colors',
              filter === f.key
                ? 'bg-primary/15 text-primary border-primary'
                : 'text-tertiary border-outline-variant/30 hover:border-outline-variant',
            )}
            data-mol-id={`agents-filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            type="button"
          >
            {t(f.labelKey, {}, { defaultValue: f.defaultLabel })}
          </button>
        ))}
      </div>

      {loading ? (
        <p
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'font-mono text-tertiary text-sm')}
          data-mol-id="agents-loading"
        >
          {t('agents.loading', {}, { defaultValue: 'Loading agents…' })}
        </p>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            'rounded border border-dashed border-outline-variant/30 font-mono text-sm text-tertiary',
          )}
          data-mol-id="agents-empty"
        >
          {t(
            'agents.empty',
            {},
            { defaultValue: 'No agents in your workspace yet — click New Agent to start.' },
          )}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 3, gap: 4 }))}>
          {filtered.map((agent) => (
            <AgentCard key={agent.id} {...agent} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Agents
