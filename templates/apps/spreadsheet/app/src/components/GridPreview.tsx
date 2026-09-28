import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface GridPreviewCell {
  /** Display value (already formatted). */
  display: string
  /** Type-aware visual treatment. */
  type?: 'text' | 'number' | 'currency' | 'percent' | 'select' | 'formula' | 'date'
  /** Optional tint for select/category cells. */
  tint?: 'emerald' | 'rose' | 'amber' | 'violet' | 'primary'
  /** Whether this cell is the currently selected one (blue 2px border). */
  selected?: boolean
  /** Right-align numerically? Defaults true for number/currency/percent. */
  numeric?: boolean
}

export interface GridPreviewProps {
  /** Column headers — first column shown blank for row numbers. */
  columns: { id: string; label: string; type?: GridPreviewCell['type']; width?: number }[]
  /** 2D array of cells, columns × rows. */
  rows: GridPreviewCell[][]
  /** Optional formula bar text (mono, with =SUM(... syntax-highlighted). */
  formula?: string
  /** Currently selected cell coordinate, e.g. "C7". */
  selectedCellRef?: string
}

const SELECT_TINT: Record<NonNullable<GridPreviewCell['tint']>, { bg: string; text: string }> = {
  emerald: { bg: 'bg-success-light', text: 'text-success' },
  rose: { bg: 'bg-rose-100', text: 'text-error' },
  amber: { bg: 'bg-warning-light', text: 'text-warning' },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-500/15',
    text: 'text-violet-700 dark:text-violet-300',
  },
  primary: { bg: 'bg-primary-fixed', text: 'text-primary' },
}

/**
 * Calcite signature visual — a polished mini-spreadsheet preview with
 * formula bar, type-aware column headers, blue-tinted selected cell, and
 * tabular-nums numeric columns.
 *
 * Bespoke to spreadsheet/Calcite — there is no polished sibling for a
 * spreadsheet grid, so this synthesizes the editorial-table treatment from
 * personal-finance/AccountRecentTransactions.tsx with the formula bar /
 * cell-ref language called out in DESIGN.md.
 */
export function GridPreview({ columns, rows, formula, selectedCellRef }: GridPreviewProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.w('full'),
        'bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          'border-b border-outline-variant/40 bg-surface-container-low',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(7),
            cm.h(7),
            'rounded-lg bg-formula-light text-formula font-mono text-xs font-extrabold shrink-0',
          )}
          style={{ backgroundColor: 'var(--color-formula-light)', color: 'var(--color-formula)' }}
          aria-hidden="true"
        >
          fx
        </span>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'font-mono text-on-surface-variant uppercase tracking-widest border-r border-outline-variant/40 pr-3',
          )}
        >
          {selectedCellRef || 'A1'}
        </span>
        <code className={'font-mono text-[13px] text-on-surface flex-1 truncate'}>
          {formula
            ? formula
            : t(
                'gridPreview.emptyFormula',
                {},
                { defaultValue: '— select a cell to view its formula' },
              )}
        </code>
      </div>
      {/* tabIndex: scrollable-region-focusable (axe serious) — a scroll-only
          region must be keyboard-reachable */}
      <div className="overflow-x-auto" tabIndex={0}>
        <table className={'w-full text-[13px] font-mono tabular-nums border-collapse'}>
          <thead>
            <tr className="bg-surface-container-low">
              <th
                className={cm.cn(
                  'sticky left-0 z-10 bg-surface-container-low w-12 h-8 text-center font-bold text-[10px] uppercase tracking-widest text-on-surface-variant border-b-2 border-outline-variant',
                )}
              >
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cm.cn(
                    'h-8 px-3 text-left font-semibold text-[12px] text-on-surface border-b-2 border-outline-variant border-r border-outline-variant/40 last:border-r-0 whitespace-nowrap',
                  )}
                  style={{ width: col.width || 160, minWidth: col.width || 120 }}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className="material-symbols-outlined text-[14px] text-on-surface-variant"
                      aria-hidden="true"
                    >
                      {col.type === 'number' || col.type === 'currency' || col.type === 'percent'
                        ? 'pin'
                        : col.type === 'date'
                          ? 'calendar_today'
                          : col.type === 'formula'
                            ? 'function'
                            : col.type === 'select'
                              ? 'arrow_drop_down_circle'
                              : 'short_text'}
                    </span>
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className={'hover:bg-cell-selected/40 transition-colors group'}>
                <td
                  className={cm.cn(
                    'sticky left-0 z-10 bg-surface-container-low/80 group-hover:bg-cell-selected/40 w-12 h-8 text-center text-[11px] font-medium text-on-surface-variant border-r border-outline-variant/40 border-b border-outline-variant/40',
                  )}
                >
                  {rIdx + 1}
                </td>
                {row.map((cell, cIdx) => {
                  const numeric =
                    cell.numeric ??
                    (cell.type === 'number' || cell.type === 'currency' || cell.type === 'percent')
                  const isFormula = cell.type === 'formula'
                  const isSelect = cell.type === 'select' && cell.tint
                  return (
                    <td
                      key={cIdx}
                      className={cm.cn(
                        'h-8 px-3 border-r border-outline-variant/40 border-b border-outline-variant/40 last:border-r-0 whitespace-nowrap',
                        numeric ? 'text-right' : 'text-left',
                        cell.selected
                          ? 'outline outline-2 outline-primary outline-offset-[-2px] bg-cell-editing'
                          : '',
                        isFormula ? 'text-formula font-bold' : 'text-on-surface',
                      )}
                      style={
                        cell.selected
                          ? { backgroundColor: 'var(--color-cell-editing)' }
                          : isFormula
                            ? { color: 'var(--color-formula)' }
                            : undefined
                      }
                    >
                      {isSelect ? (
                        <span
                          className={cm.cn(
                            cm.sp('px', 2),
                            cm.sp('py', 0),
                            cm.roundedFull,
                            'text-[11px] font-bold inline-flex items-center',
                            SELECT_TINT[cell.tint!].bg,
                            SELECT_TINT[cell.tint!].text,
                          )}
                        >
                          {cell.display}
                        </span>
                      ) : (
                        cell.display
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
