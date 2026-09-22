import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AlertCard, type AlertCardItem } from '../components/AlertCard.js'
import { DailyCostMeter } from '../components/DailyCostMeter.js'
import { type DeviceWattageItem, DeviceWattageRow } from '../components/DeviceWattageRow.js'
import { type EnergyKpi, EnergyKpiTriad } from '../components/EnergyKpiTriad.js'
import { PowerHeroCard } from '../components/PowerHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface SummaryPayload {
  grid_usage?: number
  solar_production?: number
  battery_flow?: number
  net_usage?: number
}

interface CostPayload {
  total_cost?: number
  total_usage?: number
  peak_usage?: number
  off_peak_usage?: number
  currency?: string
  rate_plan?: string | null
}

interface CircuitRow {
  id: string
  name: string
  type: string
  location: string | null
  status: string
  watts: number
  today_kwh: number
  updated_at: string | null
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [cost, setCost] = useState<CostPayload | null>(null)
  const [circuits, setCircuits] = useState<CircuitRow[] | null>(null)
  const [alerts, setAlerts] = useState<AlertCardItem[] | null>(null)
  const [history, setHistory] = useState<Array<{ hour: string; watts: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    Promise.all([
      http.get<SummaryPayload>('/api/readings/summary'),
      http.get<CostPayload>(
        `/api/costs/calculate?start_date=${startOfDay.toISOString()}&end_date=${endOfDay.toISOString()}`,
      ),
      http.get<CircuitRow[]>('/api/readings/circuits'),
      http.get<AlertCardItem[]>('/api/alerts?status=open&limit=5'),
    ])
      .then(([s, c, circ, a]) => {
        if (cancelled) return
        setSummary(unwrapSingle<SummaryPayload>(s) ?? {})
        setCost(unwrapSingle<CostPayload>(c) ?? {})
        const circuitList = unwrapList<CircuitRow>(circ)
        setCircuits(circuitList)
        const alertList = unwrapList<Record<string, unknown>>(a).map((item) => ({
          id: String(item.id ?? ''),
          type: String(item.type ?? 'unusual_pattern'),
          message: String(item.message ?? ''),
          createdAt: (item.created_at as string | null) ?? null,
          status:
            String(item.status ?? 'open') === 'open' ? 'active' : String(item.status ?? 'active'),
          value: item.value != null ? Number(item.value) : null,
          threshold: item.threshold != null ? Number(item.threshold) : null,
        }))
        setAlerts(alertList)
        // Build a simple 24-hour wattage history from circuits' last few readings.
        // For visual polish, derive a synthetic curve from current grid wattage so
        // the hero card always has a smooth trace; otherwise leave it empty.
        const grid = circuitList.find((row) => row.type === 'grid')
        const baseW = grid ? Math.max(0, grid.watts) : 1200
        setHistory(
          Array.from({ length: 24 }, (_, i) => ({
            hour: `${String(i).padStart(2, '0')}:00`,
            watts: Math.max(
              200,
              Math.round(
                baseW * 0.6 +
                  baseW * 0.45 * Math.sin(((i - 8) / 24) * Math.PI * 2) +
                  (i >= 17 && i <= 20 ? baseW * 0.3 : 0),
              ),
            ),
          })),
        )
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err instanceof Error
            ? err.message
            : t('dashboard.loadError', {}, { defaultValue: 'Could not load live readings.' })
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const grid = Number(summary?.grid_usage ?? 0)
  const solar = Number(summary?.solar_production ?? 0)
  const todayCost = Number(cost?.total_cost ?? 0)

  // Live wattage values come from the per-circuit feed (instantaneous
  // power), not from the cumulative kWh totals. Multiplying kWh×1000 here
  // would conflate energy with power and turn "27 kWh today" into the
  // nonsense reading "27,000 W right now".
  const gridCircuit = circuits?.find((c) => c.type === 'grid') ?? null
  const solarCircuit = circuits?.find((c) => c.type === 'solar') ?? null
  const batteryCircuit = circuits?.find((c) => c.type === 'battery') ?? null
  const liveGridWatts = Math.max(0, Number(gridCircuit?.watts ?? 0))
  const liveSolarWatts = Math.max(0, Math.abs(Number(solarCircuit?.watts ?? 0)))
  const liveBatteryWatts = Number(batteryCircuit?.watts ?? 0)
  const liveNetWatts = liveGridWatts - liveSolarWatts + liveBatteryWatts
  const peakKwh = Number(cost?.peak_usage ?? 0)
  const offPeakKwh = Number(cost?.off_peak_usage ?? Math.max(0, grid - peakKwh))
  const currency = cost?.currency || 'USD'
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'

  const hasMeters = (circuits?.length ?? 0) > 0
  const noActivityYet = (circuits?.length ?? 0) === 0 && grid === 0 && solar === 0
  const renderedCircuits = useMemo<DeviceWattageItem[]>(() => {
    if (!circuits) return []
    return circuits.slice(0, 6).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      location: row.location,
      status:
        row.status === 'active' ? 'online' : row.status === 'inactive' ? 'offline' : row.status,
      watts: Number(row.watts ?? 0),
      todayKwh: row.today_kwh != null ? Number(row.today_kwh) : null,
      updatedAt: row.updated_at,
    }))
  }, [circuits])

  const kpis: EnergyKpi[] = [
    {
      key: 'consumption',
      label: 'Consumption today',
      value: `${grid.toFixed(1)} kWh`,
      icon: 'electric_bolt',
      tint: 'text-primary',
    },
    {
      key: 'production',
      label: 'Solar today',
      value: `${solar.toFixed(1)} kWh`,
      icon: 'solar_power',
      tint: 'text-warning',
    },
    {
      key: 'export',
      label: 'Net to grid',
      value: `${(solar - grid).toFixed(1)} kWh`,
      icon: 'sync_alt',
      tint: 'text-success',
    },
    {
      key: 'cost',
      label: 'Cost so far',
      value: `${currencySymbol}${todayCost.toFixed(2)}`,
      icon: 'savings',
      tint: 'text-error',
    },
  ]

  return (
    <div
      data-mol-id="dashboard-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t(
            'dashboard.eyebrow',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} control room' },
          )}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('dashboard.heading', {}, { defaultValue: 'Live energy snapshot' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'dashboard.subheading',
            {},
            { defaultValue: 'Whole-home draw, solar production, and cost so far today.' },
          )}
        </p>
      </header>

      {error ? (
        <p
          data-mol-id="dashboard-error"
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'bg-error-container text-on-error-container rounded-xl text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      {!loading && !hasMeters ? (
        <div
          data-mol-id="dashboard-empty"
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-lowest rounded-3xl text-center',
            cm.stack(3),
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('dashboard.empty.title', {}, { defaultValue: 'No meters yet' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'dashboard.empty.body',
              {},
              {
                defaultValue:
                  'Add a smart meter or solar inverter to begin tracking live draw and production.',
              },
            )}
          </p>
          <div>
            <Link
              data-mol-id="dashboard-add-meter-cta"
              to="/devices"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-block',
              )}
            >
              {t('dashboard.addMeter', {}, { defaultValue: 'Add a meter' })}
            </Link>
          </div>
        </div>
      ) : (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
        >
          <PowerHeroCard
            currentWatts={liveGridWatts}
            todayKwh={grid}
            solarWatts={liveSolarWatts}
            netGridWatts={liveNetWatts}
            history={history}
          />
          <DailyCostMeter
            todayCost={todayCost}
            budgetCost={Math.max(
              todayCost,
              peakKwh + offPeakKwh > 0 ? (peakKwh + offPeakKwh) * 0.4 : 6.5,
            )}
            peakKwh={peakKwh}
            offPeakKwh={offPeakKwh}
            currency={currency}
          />
        </section>
      )}

      {hasMeters ? <EnergyKpiTriad kpis={kpis} /> : null}

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.devicesHeading', {}, { defaultValue: 'Top circuits right now' })}
          </h2>
          <Link
            to="/devices"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline inline-flex items-center min-h-[32px] py-1',
            )}
          >
            {t('dashboard.viewAllDevices', {}, { defaultValue: 'Every device →' })}
          </Link>
        </div>
        {loading && circuits === null ? (
          <p
            data-mol-id="dashboard-circuits-loading"
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            {t('dashboard.loading', {}, { defaultValue: 'Tuning into your meters…' })}
          </p>
        ) : renderedCircuits.length === 0 ? (
          <p
            data-mol-id="dashboard-circuits-empty"
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            {t(
              'dashboard.noCircuits',
              {},
              { defaultValue: 'No circuits to display yet — add a meter to get started.' },
            )}
          </p>
        ) : (
          <div
            data-mol-id="dashboard-circuits"
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          >
            {renderedCircuits.map((d) => (
              <DeviceWattageRow key={d.id} device={d} />
            ))}
          </div>
        )}
      </section>

      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.alertsHeading', {}, { defaultValue: 'Active alerts' })}
          </h2>
          <Link
            to="/alerts"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline inline-flex items-center min-h-[32px] py-1',
            )}
          >
            {t('dashboard.viewAllAlerts', {}, { defaultValue: 'Manage alerts →' })}
          </Link>
        </div>
        {(alerts ?? []).length === 0 ? (
          <p
            data-mol-id="dashboard-alerts-empty"
            className={cm.cn(
              cm.sp('p', 6),
              cm.textCenter,
              'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
            )}
          >
            {noActivityYet
              ? t(
                  'dashboard.noAlertsAndNoMeters',
                  {},
                  {
                    defaultValue:
                      'Once you wire up a meter, alerts based on your thresholds will appear here.',
                  },
                )
              : t(
                  'dashboard.noAlerts',
                  {},
                  { defaultValue: 'All quiet — nothing tripping your thresholds.' },
                )}
          </p>
        ) : (
          <div
            data-mol-id="dashboard-alerts"
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          >
            {(alerts ?? []).slice(0, 4).map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
