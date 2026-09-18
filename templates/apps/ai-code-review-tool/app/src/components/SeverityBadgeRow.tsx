import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type Severity = 'critical' | 'changes_requested' | 'suggestion' | 'approved'

interface SeverityCount {
  severity: Severity
  count: number
}

interface SeverityBadgeRowProps {
  counts: ReadonlyArray<SeverityCount>
}

const SEVERITY_TINT: Record<Severity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-error', label: 'Critical' },
  changes_requested: { bg: 'bg-amber-500/15', text: 'text-warning', label: 'Changes' },
  // violet-400, not -500: the label renders at 10px bold on the dark surface
  // (#16102e), where violet-500 measures 4.15:1 — under the 4.5:1 WCAG AA floor
  // for text this size. violet-400 measures 6.42:1 and keeps the hue.
  suggestion: { bg: 'bg-violet-500/15', text: 'text-violet-400', label: 'Suggest' },
  approved: { bg: 'bg-emerald-500/15', text: 'text-success', label: 'Approved' },
}

const ORDER: Severity[] = ['critical', 'changes_requested', 'suggestion', 'approved']

/**
 * Strip of severity-count pills — one per AI review severity level,
 * count rendered tabular-nums in JetBrains Mono.
 *
 * Translated from api-documentation's MethodBadgeRow pattern, recoloured
 * to Refract's review-severity scale (red/amber/violet/emerald per
 * DESIGN.md Review Comment "Severity colors").
 */
export function SeverityBadgeRow({ counts }: SeverityBadgeRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const map = new Map<Severity, number>()
  for (const c of counts) map.set(c.severity, c.count)

  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 'sm', wrap: 'wrap' }),
        'rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant/40',
      )}
    >
      {ORDER.map((severity) => {
        const tint = SEVERITY_TINT[severity]
        const count = map.get(severity) ?? 0
        return (
          <div
            key={severity}
            className={cm.cn(
              'px-4 py-2 rounded-xl flex items-center gap-3 flex-1 min-w-[120px]',
              tint.bg,
            )}
          >
            <span
              className={cm.cn(
                'text-[10px] font-extrabold tracking-widest font-mono uppercase',
                tint.text,
              )}
            >
              {t(`severityBadgeRow.${severity}`, {}, { defaultValue: tint.label })}
            </span>
            <span
              className={cm.cn('text-2xl font-extrabold tabular-nums font-mono ml-auto', tint.text)}
            >
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
