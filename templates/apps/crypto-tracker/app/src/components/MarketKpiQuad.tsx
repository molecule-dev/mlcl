/**
 * Quad of KPI cards summarising the global crypto market — Total Market Cap,
 * 24h Volume, BTC Dominance, Active Coins. Each card carries the inset accent bar
 * accent in the brand gold, an uppercase 10px label, an extrabold tabular-nums
 * value, and a subtle hover lift.
 *
 * Translated from personal-finance/AccountSummaryBar.tsx (label + value
 * stacking) and crm/StatsRow conventions (left-accent + hover lift).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { deltaClass, deltaIcon, fmtPct, fmtUsd } from '../lib/format.js'

export interface MarketKpiQuadProps {
  totalMarketCapUsd: number
  totalVolume24hUsd: number
  btcDominancePct: number
  activeCoins: number
  marketCapChangePct?: number
}

export function MarketKpiQuad({
  totalMarketCapUsd,
  totalVolume24hUsd,
  btcDominancePct,
  activeCoins,
  marketCapChangePct = 0,
}: MarketKpiQuadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2 lg:grid-cols-4')}
      data-mol-id="market-kpi-quad"
    >
      <KpiCard
        label={t('marketKpiQuad.totalMarketCap', {}, { defaultValue: 'Total market cap' })}
        value={fmtUsd(totalMarketCapUsd)}
        delta={marketCapChangePct}
      />
      <KpiCard
        label={t('marketKpiQuad.volume24h', {}, { defaultValue: '24h volume' })}
        value={fmtUsd(totalVolume24hUsd)}
      />
      <KpiCard
        label={t('marketKpiQuad.btcDominance', {}, { defaultValue: 'BTC dominance' })}
        value={`${btcDominancePct.toFixed(1)}%`}
      />
      <KpiCard
        label={t('marketKpiQuad.activeCoins', {}, { defaultValue: 'Active coins' })}
        value={activeCoins.toLocaleString()}
      />
    </section>
  )
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta?: number }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
        cm.accentCard({ tone: 'primary' }),
      )}
      data-mol-id="kpi-card"
    >
      <p className={cm.accentCardLabel({ tone: 'primary' })}>{label}</p>
      <p
        className={cm.cn(
          cm.textSize('2xl'),
          cm.sp('mt', 2),
          'font-extrabold tracking-tight tabular-nums text-on-surface',
        )}
      >
        {value}
      </p>
      {delta !== undefined && delta !== 0 ? (
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.sp('mt', 1),
            cm.fontWeight('semibold'),
            'tabular-nums',
            deltaClass(delta),
          )}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
            {deltaIcon(delta)}
          </span>
          {fmtPct(delta)}
        </p>
      ) : null}
    </div>
  )
}
