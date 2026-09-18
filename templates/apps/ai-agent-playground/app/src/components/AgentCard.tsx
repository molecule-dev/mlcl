// Pattern source: ai-chatbot-builder/components/BotCard.tsx
// Neuron Agent card — surface-container-low tile, status dot, provider badge, mono meta.
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type AgentStatus = 'running' | 'idle' | 'failed' | 'paused'

interface AgentCardProps {
  id: string
  name: string
  description: string
  provider: string
  status: AgentStatus
  lastRun: string
  iconName?: string
}

const STATUS_CONFIG: Record<AgentStatus, { dot: string; label: string; iconColor: string }> = {
  running: { dot: 'bg-secondary', label: 'Running', iconColor: 'text-primary' },
  idle: { dot: 'bg-emerald-500', label: 'Idle', iconColor: 'text-tertiary' },
  failed: { dot: 'bg-error', label: 'Failed', iconColor: 'text-error' },
  paused: { dot: 'bg-warning', label: 'Paused', iconColor: 'text-tertiary' },
}

export function AgentCard({
  id,
  name,
  description,
  provider,
  status,
  lastRun,
  iconName = 'smart_toy',
}: AgentCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const cfg = STATUS_CONFIG[status]

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        'bg-surface-container-low rounded relative border border-outline-variant/15 hover:bg-surface-container-high transition-colors group',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 3))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded bg-surface-container-highest',
              cfg.iconColor,
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
              {iconName}
            </span>
          </div>
          <div>
            <h3
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'font-headline text-on-surface group-hover:text-primary transition-colors',
              )}
            >
              {name}
            </h3>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'mt-0.5')}>
              <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cfg.dot)} />
              <span className="font-mono text-[10px] text-tertiary uppercase tracking-wider">
                {t(`agentCard.status.${status}`, {}, { defaultValue: cfg.label })}
              </span>
            </div>
          </div>
        </div>
        <span
          className={cm.cn(
            cm.sp('py', 1),
            cm.sp('px', 2),
            'font-mono text-[10px] text-tertiary bg-surface-container rounded',
          )}
        >
          {provider}
        </span>
      </div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mb', 4),
          'text-tertiary line-clamp-2 leading-relaxed',
        )}
      >
        {description}
      </p>
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between' }),
          cm.sp('pt', 3),
          'border-t border-surface/5 mt-auto',
        )}
      >
        <span className="font-mono text-[10px] text-tertiary">
          {t('agentCard.lastRun', { time: lastRun }, { defaultValue: 'Last run: {{time}}' })}
        </span>
        <Link
          className={cm.cn(
            'font-mono text-[10px] uppercase hover:brightness-125',
            status === 'failed' ? 'text-error' : 'text-secondary',
          )}
          to={`/agents/${id}`}
        >
          {status === 'failed'
            ? t('agentCard.viewLogs', {}, { defaultValue: 'View Logs' })
            : t('agentCard.configure', {}, { defaultValue: 'Configure' })}
        </Link>
      </div>
    </div>
  )
}

export default AgentCard
