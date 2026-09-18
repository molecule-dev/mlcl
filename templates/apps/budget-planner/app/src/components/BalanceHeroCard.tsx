/**
 * Gradient hero card — month context with available-to-assign in 6xl-extrabold,
 * income vs spent rail, frosted-glass change pill, decorative blurred orbs,
 * inline SVG sparkline of net-worth history.
 *
 * Translated from personal-finance's NetWorthCard.tsx — same gradient /
 * rounded-[2rem] / decorative orb / sparkline chassis, repurposed to show
 * Coffer's primary "Available to assign" envelope-budget number.
 */

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatMoney, getCurrency } from '../lib/format.js'

interface NetWorthPoint {
  date: string
  net_worth_cents: number
}

interface BalanceHeroCardProps {
  monthLabel: string
  availableCents: number
  incomeCents: number
  spentCents: number
  assignedCents: number
  netWorthChangeCents: number
  history?: NetWorthPoint[]
}

function fmtMoney(cents: number, opts?: { sign?: boolean }): string {
  return formatMoney(cents, getCurrency(), { signed: opts?.sign })
}

function buildSparklinePath(history: NetWorthPoint[]): { line: string; area: string } {
  if (history.length < 2) {
    return {
      line: 'M0,80 Q50,60 100,70 T200,30 T300,50 T400,10',
      area: 'M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z',
    }
  }
  const min = Math.min(...history.map((p) => p.net_worth_cents))
  const max = Math.max(...history.map((p) => p.net_worth_cents))
  const range = Math.max(1, max - min)
  const width = 400
  const height = 90
  const top = 5
  const points = history.map((p, i) => {
    const x = (i / (history.length - 1)) * width
    const norm = (p.net_worth_cents - min) / range
    const y = top + (1 - norm) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M${points.join(' L')}`
  const area = `${line} L${width},100 L0,100 Z`
  return { line, area }
}

export function BalanceHeroCard({
  monthLabel,
  availableCents,
  incomeCents,
  spentCents,
  assignedCents,
  netWorthChangeCents,
  history = [],
}: BalanceHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const positiveChange = netWorthChangeCents >= 0
  const { line, area } = buildSparklinePath(history)

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden',
      )}
      data-mol-id="balance-hero"
    >
      <div className="relative z-10">
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            'flex-wrap',
          )}
        >
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('mb', 1),
                'uppercase tracking-widest text-white/70',
              )}
            >
              {t(
                'balanceHeroCard.eyebrow',
                { month: monthLabel },
                { defaultValue: 'Available to assign · {{month}}' },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }))}>
              <span className="text-6xl font-extrabold tracking-tighter tabular-nums">
                {fmtMoney(availableCents)}
              </span>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'bg-surface/20 backdrop-blur-md',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}
                  aria-hidden="true"
                >
                  {positiveChange ? 'trending_up' : 'trending_down'}
                </span>
                {t(
                  'balanceHeroCard.netWorth30d',
                  { amount: fmtMoney(netWorthChangeCents, { sign: true }) },
                  { defaultValue: '{{amount}} net worth (30d)' },
                )}
              </span>
            </div>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'lg' }), 'mt-6 flex-wrap')}>
          <RailStat
            label={t('balanceHeroCard.income', {}, { defaultValue: 'Income' })}
            value={fmtMoney(incomeCents)}
          />
          <RailStat
            label={t('balanceHeroCard.assigned', {}, { defaultValue: 'Assigned' })}
            value={fmtMoney(assignedCents)}
          />
          <RailStat
            label={t('balanceHeroCard.spent', {}, { defaultValue: 'Spent' })}
            value={fmtMoney(spentCents)}
          />
        </div>
      </div>

      <div className={cm.cn(cm.sp('mt', 6), cm.h(24), cm.w('full'), 'relative z-10')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={area} fill="white" opacity="0.2" />
          <path d={line} fill="none" stroke="white" strokeWidth="2.5" />
        </svg>
      </div>

      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-surface/15 blur-xl',
        )}
        aria-hidden="true"
      />
    </section>
  )
}

function RailStat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-widest text-white/70',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('extrabold'),
          cm.sp('mt', 1),
          'tabular-nums text-white',
        )}
      >
        {value}
      </p>
    </div>
  )
}
