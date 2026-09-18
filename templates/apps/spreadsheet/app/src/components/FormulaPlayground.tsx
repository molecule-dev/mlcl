import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FormulaExample {
  /** Cell reference, e.g. "C7". */
  cell: string
  /** Raw formula text. */
  formula: string
  /** Computed display value. */
  result: string
  /** Optional one-line explanation under the result. */
  note?: string
}

interface FormulaPlaygroundProps {
  examples: FormulaExample[]
  /** Eyebrow above the headline. */
  eyebrow?: string
  /** Headline copy. */
  headline?: string
  /** Subheadline copy. */
  subheadline?: string
}

/**
 * Dark dev-tools-style formula playground — terminal chrome (red/amber/
 * emerald dots), syntax-highlighted formulas, frosted-glass tile stack.
 *
 * Translated from api-documentation's EndpointPlaygroundHero.tsx (catalog
 * §1.3 + §10 terminal recipe). Reframed for spreadsheet vocabulary —
 * cell refs replace HTTP methods, computed values replace JSON responses.
 */
export function FormulaPlayground({
  examples,
  eyebrow,
  headline,
  subheadline,
}: FormulaPlaygroundProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={
        'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-on-surface/10'
      }
      style={{ backgroundColor: '#0c1222', minHeight: '420px' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 35%, rgba(37, 99, 235, 0.32) 0%, transparent 38%),' +
            'radial-gradient(circle at 75% 65%, rgba(124, 58, 237, 0.28) 0%, transparent 35%),' +
            'linear-gradient(135deg, #0c1222 0%, #1a2332 100%)' /* fixed dark showcase — not themed */,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(96, 165, 250, 0.6) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />
      <div
        className={'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-primary/30 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute right-12 top-12 w-20 h-20 rounded-full bg-violet-500/30 blur-2xl'}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          cm.sp('p', 8),
          'relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start',
        )}
      >
        <div className={'lg:col-span-5'}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 font-mono">
            {eyebrow ||
              t('formulaPlayground.eyebrow', {}, { defaultValue: 'Formula Engine · v3.2' })}
          </p>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mt-2'}>
            {headline ||
              t(
                'formulaPlayground.headline',
                {},
                { defaultValue: 'Formulas that read like English' },
              )}
          </h2>
          <p className={'text-sm md:text-base text-white/85 mt-3 max-w-xl leading-relaxed'}>
            {subheadline ||
              t(
                'formulaPlayground.subheadline',
                {},
                {
                  defaultValue:
                    '350+ functions, named ranges, structured references, and live recalculation in under 50ms across million-row workbooks.',
                },
              )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'mt-6')}>
            <span
              className={
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/10 backdrop-blur-md text-xs font-bold text-white/85'
              }
            >
              <span
                className={'material-symbols-outlined text-base text-emerald-300'}
                aria-hidden="true"
              >
                bolt
              </span>
              {t('formulaPlayground.feature.live', {}, { defaultValue: 'Live recalc' })}
            </span>
            <span
              className={
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/10 backdrop-blur-md text-xs font-bold text-white/85'
              }
            >
              <span
                className={'material-symbols-outlined text-base text-blue-300'}
                aria-hidden="true"
              >
                function
              </span>
              {t('formulaPlayground.feature.functions', {}, { defaultValue: '350+ functions' })}
            </span>
            <span
              className={
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/10 backdrop-blur-md text-xs font-bold text-white/85'
              }
            >
              <span
                className={'material-symbols-outlined text-base text-violet-300'}
                aria-hidden="true"
              >
                link
              </span>
              {t('formulaPlayground.feature.linkedRecords', {}, { defaultValue: 'Linked records' })}
            </span>
          </div>
        </div>
        <div className={'lg:col-span-7 space-y-3'}>
          {examples.map((ex, idx) => (
            <div
              key={idx}
              className={
                'rounded-2xl shadow-2xl shadow-black/40 overflow-hidden border border-surface/10'
              }
              style={
                // Fixed dark terminal card to match the fixed dark showcase section —
                // the hardcoded white/emerald text inside was invisible (1.02:1) when
                // var(--color-code-bg) flipped to #f8fafc in light mode.
                { backgroundColor: '#0d1117' }
              }
            >
              <div className={'flex items-center gap-2 px-4 py-2 border-b border-surface/10'}>
                <span className={'w-3 h-3 rounded-full bg-rose-400/70'} aria-hidden="true" />
                <span className={'w-3 h-3 rounded-full bg-amber-400/70'} aria-hidden="true" />
                <span className={'w-3 h-3 rounded-full bg-emerald-400/70'} aria-hidden="true" />
                <span
                  className={'ml-3 text-[10px] font-mono text-white/50 uppercase tracking-widest'}
                >
                  {t(
                    'formulaPlayground.cellLabel',
                    { cell: ex.cell },
                    { defaultValue: 'cell {{cell}}' },
                  )}
                </span>
              </div>
              <div className={'p-4 font-mono text-[12px] leading-relaxed space-y-1.5'}>
                <div className={'flex items-baseline gap-2'}>
                  <span
                    className={
                      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-widest'
                    }
                    style={{
                      backgroundColor: 'var(--color-formula-light)',
                      color: 'var(--color-code-formula-text)',
                    }}
                  >
                    fx
                  </span>
                  <code className="text-white/95 break-all">{ex.formula}</code>
                </div>
                <div className={'border-t border-surface/10 my-2'} />
                <p className={'text-emerald-300 text-base font-bold'}>{ex.result}</p>
                {ex.note && <p className="text-white/55 italic text-[11px]">{ex.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
