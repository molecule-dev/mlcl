import { getClassMap } from '@molecule/app-ui'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface MethodCount {
  method: Method
  count: number
}

interface MethodBadgeRowProps {
  counts: ReadonlyArray<MethodCount>
}

const METHOD_TINT: Record<Method, { bg: string; text: string }> = {
  GET: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  POST: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  PUT: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  DELETE: { bg: 'bg-red-500/15', text: 'text-red-400' },
  PATCH: { bg: 'bg-violet-500/15', text: 'text-violet-400' },
}

/**
 * Strip of method-count pills — one per HTTP method, count rendered in
 * tabular-nums. Used at the top of the endpoint browse page to show
 * coverage at a glance. Translated from blog's KpiCardsSection /
 * online-store's AdminOrdersStatsGrid pattern.
 */
export function MethodBadgeRow({ counts }: MethodBadgeRowProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 'sm', wrap: 'wrap' }),
        'rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant/40',
      )}
    >
      {counts.map(({ method, count }) => {
        const tint = METHOD_TINT[method]
        return (
          <div
            key={method}
            className={cm.cn(
              'px-4 py-2 rounded-xl flex items-center gap-3 flex-1 min-w-[120px]',
              tint.bg,
            )}
          >
            <span
              className={cm.cn(
                'px-2 py-0.5 rounded text-[10px] font-extrabold tracking-widest font-mono shrink-0',
                tint.text,
              )}
            >
              {method}
            </span>
            <span className={cm.cn('text-2xl font-extrabold tabular-nums font-mono', tint.text)}>
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
