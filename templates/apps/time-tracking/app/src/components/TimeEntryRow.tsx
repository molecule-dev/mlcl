import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Editorial entry row — project color dot, description + project name,
 * billable indicator, monospace duration, hover-revealed actions.
 *
 * Treatment translated from personal-finance's TransactionRow.tsx +
 * crm's ContactRow.tsx; tabular-nums duration mandated by DESIGN.md.
 */

export interface TimeEntry {
  id: string
  description: string
  projectName: string | null
  projectColor: string | null
  startLabel: string
  endLabel: string
  durationLabel: string
  billable: boolean
}

export interface TimeEntryRowProps {
  entry: TimeEntry
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function TimeEntryRow({ entry, onEdit, onDelete }: TimeEntryRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'group hover:bg-surface-secondary transition-colors',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.flex1, 'min-w-0')}>
        <span
          className={cm.cn(cm.w(2.5), cm.h(2.5), cm.roundedFull, 'shrink-0')}
          style={{ backgroundColor: entry.projectColor ?? 'var(--color-non-billable)' }}
          aria-hidden
        />
        <div className={cm.cn(cm.flex1, 'min-w-0')}>
          <p
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-foreground truncate',
            )}
          >
            {entry.description ||
              t('timeEntryRow.noDescription', {}, { defaultValue: 'Untitled entry' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary truncate')}>
            {entry.projectName || t('timeEntryRow.noProject', {}, { defaultValue: 'No project' })}
          </p>
        </div>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'shrink-0')}>
        {entry.billable && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2),
              'h-6 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-100 text-violet-700',
            )}
          >
            <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>
              attach_money
            </span>
            {t('timeEntryRow.billable', {}, { defaultValue: 'Billable' })}
          </span>
        )}
        <span
          className={cm.cn(
            cm.textSize('xs'),
            'text-foreground-secondary hidden md:inline tabular-nums font-mono',
          )}
        >
          {t(
            'timeEntryRow.range',
            { start: entry.startLabel, end: entry.endLabel },
            { defaultValue: '{{start}} – {{end}}' },
          )}
        </span>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'tabular-nums font-mono text-foreground w-20 text-right',
          )}
        >
          {entry.durationLabel}
        </span>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        >
          <button
            type="button"
            aria-label={t('timeEntryRow.edit', {}, { defaultValue: 'Edit entry' })}
            onClick={() => onEdit?.(entry.id)}
            className={cm.cn(
              cm.sp('p', 1),
              cm.roundedFull,
              'text-foreground-tertiary hover:text-foreground hover:bg-surface-secondary transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>edit</span>
          </button>
          <button
            type="button"
            aria-label={t('timeEntryRow.delete', {}, { defaultValue: 'Delete entry' })}
            onClick={() => onDelete?.(entry.id)}
            className={cm.cn(
              cm.sp('p', 1),
              cm.roundedFull,
              'text-foreground-tertiary hover:text-error hover:bg-rose-50 transition-colors',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TimeEntryRow
