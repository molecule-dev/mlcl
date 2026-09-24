import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { MaintenanceQueueList, type MaintenanceTicket } from '../components/MaintenanceQueueList.js'
import { OccupancyKpiQuad } from '../components/OccupancyKpiQuad.js'
import { PortfolioHeroCard } from '../components/PortfolioHeroCard.js'

interface DashboardStats {
  total_rent_collected_cents: number
  rent_change_30d_cents: number
  rent_history_12mo?: number[]
  occupied_units: number
  total_units: number
  vacant_units: number
  overdue_count: number
  lease_expiring_count: number
}

interface ApiResponse<T> {
  data?: T
  items?: T
}

const EMPTY_STATS: DashboardStats = {
  total_rent_collected_cents: 0,
  rent_change_30d_cents: 0,
  rent_history_12mo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  occupied_units: 0,
  total_units: 0,
  vacant_units: 0,
  overdue_count: 0,
  lease_expiring_count: 0,
}

function pickList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const r = res as ApiResponse<T[] | undefined> | null | undefined
  if (!r) return []
  if (Array.isArray(r.data)) return r.data
  if (Array.isArray(r.items)) return r.items
  return []
}

function pickSingle<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null
  const r = res as ApiResponse<T> & T
  if ('data' in r && r.data) return r.data as T
  return r as T
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    Promise.all([
      http.get('/api/dashboard/overview').catch(() => null),
      http.get('/api/maintenance?status=open&limit=4').catch(() => null),
    ]).then(([statsRes, ticketsRes]) => {
      if (cancelled) return
      const s = pickSingle<DashboardStats>(statsRes)
      // A failed overview fetch must not read as an all-zero (or "empty
      // portfolio") dashboard — surface the error and offer a retry.
      if (!statsRes) {
        setError(true)
      } else if (s && typeof s.total_rent_collected_cents === 'number') {
        setStats(s)
      }
      const list = pickList<MaintenanceTicket>(ticketsRes)
      setTickets(list.slice(0, 4))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http, reloadKey])

  const isEmpty = !loading && stats.total_units === 0 && tickets.length === 0

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header
        className={cm.flex({ align: 'baseline', justify: 'between', wrap: 'wrap', gap: 'md' })}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('dashboard.heading', {}, { defaultValue: 'Portfolio overview' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Every unit, under one roof — at a glance.' },
            )}
          </p>
        </div>
        <Link
          to="/properties"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add_business
          </span>
          {t('dashboard.addProperty', {}, { defaultValue: 'Add property' })}
        </Link>
      </header>

      {error ? (
        <LoadErrorBanner
          data-mol-id="dashboard-error"
          retryMolId="dashboard-error-retry"
          message={t(
            'common.loadFailed',
            {},
            { defaultValue: 'Something went wrong loading your data. Please try again.' },
          )}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : null}

      {isEmpty ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant',
          )}
          data-testid="dashboard-empty"
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: '48px' }}
            aria-hidden="true"
          >
            apartment
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('dashboard.empty.title', {}, { defaultValue: 'Welcome — add your first property' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'dashboard.empty.body',
              {},
              {
                defaultValue:
                  'Once you have properties, units, and rent payments, this dashboard fills with portfolio insights.',
              },
            )}
          </p>
          <Link
            to="/properties/new"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.sp('mt', 4),
              cm.fontWeight('semibold'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'inline-flex bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              add
            </span>
            {t('dashboard.empty.cta', {}, { defaultValue: 'Add property' })}
          </Link>
        </div>
      ) : (
        <>
          <PortfolioHeroCard
            totalCents={stats.total_rent_collected_cents}
            changeCents={stats.rent_change_30d_cents}
            history={stats.rent_history_12mo}
          />

          <OccupancyKpiQuad
            occupiedUnits={stats.occupied_units}
            totalUnits={stats.total_units}
            vacantUnits={stats.vacant_units}
            overdueCount={stats.overdue_count}
            leaseExpiringCount={stats.lease_expiring_count}
          />

          <MaintenanceQueueList tickets={tickets} />
        </>
      )}
    </div>
  )
}
