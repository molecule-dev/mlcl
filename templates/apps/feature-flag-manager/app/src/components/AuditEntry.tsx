import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Audit log entry — single-line event row with avatar bubble, actor
 * name, action verb (colour-keyed), target (mono key), and a mono `xs`
 * relative timestamp. An optional diff preview renders below the row.
 *
 * Translated from crm's ActivityFeed timeline + the DESIGN.md
 * "Audit Log Entry" spec (border-bottom, 12/16 padding, mono xs
 * timestamp, action-verb colour mapping). Diff preview uses
 * code-block background per DESIGN.md.
 */

export type AuditAction =
  | 'created'
  | 'updated'
  | 'toggled_on'
  | 'toggled_off'
  | 'deleted'
  | 'targeting_changed'
  | 'rollout_changed'
  | 'killed'

const VERB: Record<AuditAction, { label: string; color: string }> = {
  created: { label: 'created', color: 'var(--color-flag-on)' },
  updated: { label: 'updated', color: 'var(--color-warning)' },
  toggled_on: { label: 'turned on', color: 'var(--color-flag-on)' },
  toggled_off: { label: 'turned off', color: 'var(--color-flag-off)' },
  deleted: { label: 'deleted', color: 'var(--color-error)' },
  targeting_changed: { label: 'changed targeting', color: 'var(--color-accent)' },
  rollout_changed: { label: 'changed rollout', color: 'var(--color-warning)' },
  killed: { label: 'killed', color: 'var(--color-flag-killed)' },
}

export interface AuditEntryData {
  id: string
  actor: string
  actor_email?: string
  action: AuditAction
  /** Mono target — flag key, segment key, env name, etc. */
  target: string
  created_at: string
  /** Optional inline summary in human voice. */
  message?: string
  /** Diff lines (`+`, `-`, ` `) shown in a code block. */
  diff?: string[]
}

interface AuditEntryProps {
  entry: AuditEntryData
  /** Hide the bottom border (e.g. last item in a card). */
  noBorder?: boolean
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return iso
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function actorInitial(actor: string): string {
  const trimmed = actor.trim()
  if (!trimmed) return '?'
  return trimmed[0]!.toUpperCase()
}

function diffLineColor(line: string): string {
  if (line.startsWith('+')) return 'var(--color-emerald-chip-text)'
  if (line.startsWith('-')) return 'var(--color-error-chip-text)'
  return 'var(--color-on-surface-variant, var(--color-text-secondary))'
}

function diffLineBg(line: string): string {
  if (line.startsWith('+')) return 'color-mix(in srgb, var(--color-flag-on) 8%, transparent)'
  if (line.startsWith('-')) return 'color-mix(in srgb, var(--color-flag-killed) 8%, transparent)'
  return 'transparent'
}

export function AuditEntry({ entry, noBorder = false }: AuditEntryProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const verb = VERB[entry.action]

  return (
    <li
      className={cm.cn('flex flex-col gap-2 px-4 py-3', !noBorder && 'border-b')}
      style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
      data-mol-id={`audit-entry-${entry.id}`}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
        <span
          className={cm.cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full font-bold text-[11px] shrink-0',
          )}
          style={{
            backgroundColor: 'var(--color-accent-chip-bg)',
            color: 'var(--color-accent-chip-text)',
          }}
          aria-hidden="true"
        >
          {actorInitial(entry.actor)}
        </span>
        {/* min-w-0 lets the truncating spans shrink inside the flex row —
            without it a long actor email / UUID target forces the row (and
            the whole page) wider than a 390px viewport. */}
        <span className={cm.cn('min-w-0 text-sm font-semibold text-on-surface truncate')}>
          {entry.actor}
        </span>
        <span className={cm.cn('shrink-0 text-sm text-on-surface-variant')}>
          {t(`auditEntry.verb.${entry.action}`, {}, { defaultValue: verb.label })}
        </span>
        <span
          className={cm.cn('min-w-0 font-mono text-sm font-bold truncate')}
          style={{ color: verb.color }}
        >
          {entry.target}
        </span>
        <span
          className={cm.cn(
            'ml-auto font-mono text-[11px] text-on-surface-variant whitespace-nowrap shrink-0',
          )}
          title={entry.created_at}
        >
          {fmtRelative(entry.created_at)}
        </span>
      </div>
      {entry.message ? (
        <p className={cm.cn('ml-8 text-xs text-on-surface-variant')}>{entry.message}</p>
      ) : null}
      {entry.diff && entry.diff.length > 0 ? (
        <pre
          className={cm.cn(
            'ml-8 mt-1 rounded-md p-2.5 font-mono text-[11px] leading-tight overflow-x-auto',
          )}
          style={{
            backgroundColor: 'var(--color-code-block)',
            border: '1px solid rgba(30, 41, 59, 0.7)',
          }}
        >
          {entry.diff.map((line, i) => (
            <span
              key={`diff-${i}`}
              className={cm.cn('block px-1')}
              style={{ color: diffLineColor(line), backgroundColor: diffLineBg(line) }}
            >
              {line}
            </span>
          ))}
        </pre>
      ) : null}
    </li>
  )
}
