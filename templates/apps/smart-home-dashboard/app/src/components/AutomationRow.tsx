import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface AutomationListItem {
  id: string
  name: string
  description?: string | null
  enabled: boolean
  /** ISO timestamp of last execution. */
  last_triggered?: string | null
  execution_count?: number | null
  /** Free-form trigger label (e.g. "When sunset", "When motion in hallway"). */
  trigger_label?: string | null
}

interface AutomationRowProps {
  automation: AutomationListItem
  onToggle?: (id: string, currentlyEnabled: boolean) => void
  onTrigger?: (id: string) => void
}

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Editorial automation row — left accent bar tinted by enabled/paused
 * state, name + trigger label, and a trailing Run / Toggle pair. Border
 * radius and accent come from DESIGN.md's "Automation Row" recipe.
 *
 * Translated from blog/ArticleListItem.tsx — left-accent + headline +
 * meta-row pattern — but rendered as a list row instead of a card so it
 * stacks densely on Automations.tsx.
 */
export function AutomationRow({ automation, onToggle, onTrigger }: AutomationRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const accent = automation.enabled ? 'border-l-primary' : 'border-l-outline-variant'

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-2xl hover:bg-surface-container-low transition-all border-l-4',
        accent,
        automation.enabled ? '' : 'opacity-70',
      )}
    >
      <Link
        to={`/automations/${automation.id}/edit`}
        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1 min-w-0')}
      >
        <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'truncate')}>
          {automation.name}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {automation.trigger_label ? (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] py-0.5 uppercase tracking-widest bg-surface-container text-on-surface-variant',
              )}
            >
              {automation.trigger_label}
            </span>
          ) : null}
          {automation.description ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
              {automation.description}
            </span>
          ) : null}
          {automation.last_triggered ? (
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
              {t(
                'automationRow.lastRun',
                {
                  date: fmtDate(automation.last_triggered),
                  count: automation.execution_count ?? 0,
                },
                { defaultValue: 'Last {{date}} · {{count}} runs' },
              )}
            </span>
          ) : null}
        </div>
      </Link>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        {onTrigger ? (
          <button
            type="button"
            onClick={() => onTrigger(automation.id)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest bg-surface-container text-on-surface hover:bg-surface-container-high transition-all',
            )}
            aria-label={t(
              'automationRow.runNowAria',
              { name: automation.name },
              { defaultValue: 'Run {{name}} now' },
            )}
          >
            <span className={'material-symbols-outlined text-base align-middle'} aria-hidden="true">
              play_arrow
            </span>
          </button>
        ) : null}
        {onToggle ? (
          <button
            type="button"
            onClick={() => onToggle(automation.id, automation.enabled)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              automation.enabled
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              'uppercase tracking-widest transition-all',
            )}
            aria-pressed={automation.enabled}
          >
            {automation.enabled
              ? t('automationRow.on', {}, { defaultValue: 'On' })
              : t('status.off', {}, { defaultValue: 'Off' })}
          </button>
        ) : null}
      </div>
    </div>
  )
}
