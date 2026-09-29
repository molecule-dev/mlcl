import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { AdherenceTriad } from '../components/AdherenceTriad.js'
import { DoseRow, type DoseStatus, type PillColor } from '../components/DoseRow.js'
import { TodayHeroCard } from '../components/TodayHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Dose {
  id: string
  medication_id: string
  medication_name: string
  dose_amount: string
  pill_color: PillColor
  scheduled_at: string
  scheduled_time?: string
  scheduled_date?: string
  status: DoseStatus
  taken_at: string | null
}

interface TodayReport {
  date: string
  total_doses: number
  taken_count: number
  missed_count: number
  upcoming_count: number
  current_streak: number
  longest_streak: number
  refills_due_soon: number
}

interface DailyAdherenceEntry {
  date: string
  total: number
  taken: number
}

interface AdherenceReportPayload {
  daily_30d: DailyAdherenceEntry[]
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth<{ name?: string | null; email?: string }>()
  const [doses, setDoses] = useState<Dose[]>([])
  const [today, setToday] = useState<TodayReport | null>(null)
  const [trend, setTrend] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by the retry button so the fetch effect re-runs.
  const [reloadKey, setReloadKey] = useState(0)

  const fetchAll = useCallback(async (): Promise<{
    doses: Dose[]
    today: TodayReport | null
    trend: number[]
  }> => {
    const [d, s, adherence] = await Promise.all([
      http.get('/api/doses?filter=today'),
      http.get('/api/reports/today'),
      http.get('/api/reports/adherence').catch(() => null),
    ])
    const adherenceData = unwrapSingle<AdherenceReportPayload>(adherence)
    const last7 = (adherenceData?.daily_30d ?? []).slice(-7)
    return {
      doses: unwrapList<Dose>(d),
      today: unwrapSingle<TodayReport>(s),
      trend: last7.map((x) => (x.total > 0 ? x.taken / x.total : 0)),
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAll()
      .then(({ doses, today, trend }) => {
        if (cancelled) return
        setDoses(doses)
        setToday(today)
        setTrend(trend)
      })
      .catch(() => {
        if (!cancelled) setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchAll, reloadKey, t])

  // Mark-taken: update the dose row optimistically so the button disappears
  // immediately, then POST and refetch the report data so the hero/triad
  // counters reflect the new taken_count + streak. Without the refetch the
  // user takes a dose and the "0 of 1 taken" header stays at 0.
  const markTaken = async (dose: Dose) => {
    setDoses((curr) =>
      curr.map((d) =>
        d.id === dose.id ? { ...d, status: 'taken', taken_at: new Date().toISOString() } : d,
      ),
    )
    try {
      await http.post(`/api/doses/${dose.id}/take`, {})
      void track({
        name: 'dose.taken',
        properties: { dose_id: dose.id, medication_id: dose.medication_id },
      })
      const refreshed = await fetchAll()
      setDoses(refreshed.doses)
      setToday(refreshed.today)
      setTrend(refreshed.trend)
    } catch (_error) {
      /* optimistic — UI already updated; next refresh will reconcile */
    }
  }

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [],
  )

  // Time-of-day greeting with the user's first name (design's "Good morning,
  // Maria"). Falls back to the email handle, then a warm generic.
  const firstName = auth.user?.name?.trim().split(/\s+/)[0] ?? auth.user?.email?.split('@')[0] ?? ''
  const hour = new Date().getHours()
  const greetingWord = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  if (error)
    return (
      <LoadErrorBanner
        message={error}
        retryLabel={t('common.retry', {}, { defaultValue: 'Try again' })}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    )
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('dashboard.loading', {}, { defaultValue: 'Loading\u2026' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {firstName
            ? t(
                `dashboard.greeting.${greetingWord}`,
                { name: firstName },
                { defaultValue: `Good ${greetingWord}, {{name}}` },
              )
            : t(
                `dashboard.greeting.generic.${greetingWord}`,
                {},
                { defaultValue: `Good ${greetingWord}!` },
              )}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant mt-1 font-medium')}>
          {todayLabel}
        </p>
      </header>

      <TodayHeroCard
        takenCount={today?.taken_count ?? 0}
        totalDoses={today?.total_doses ?? 0}
        upcomingCount={today?.upcoming_count ?? 0}
        currentStreak={today?.current_streak ?? 0}
        weekTrend={trend}
        todayLabel={todayLabel}
      />

      <AdherenceTriad
        currentStreak={today?.current_streak ?? 0}
        longestStreak={today?.longest_streak ?? 0}
        takenCount={today?.taken_count ?? 0}
        totalDoses={today?.total_doses ?? 0}
        refillsDueSoon={today?.refills_due_soon ?? 0}
      />

      <section className={cm.cn('space-y-3')}>
        <header className={cm.flex({ align: 'center', justify: 'between' })}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.timelineHeading', {}, { defaultValue: "Today's doses" })}
          </h2>
          <Link
            to="/medications"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary-dark dark:text-primary hover:opacity-80 transition-opacity',
            )}
          >
            {t('dashboard.allMedsLink', {}, { defaultValue: 'All medications \u2192' })}
          </Link>
        </header>

        {doses.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-2xl bg-surface-container-lowest text-on-surface-variant',
            )}
          >
            <span
              className="material-symbols-outlined text-5xl text-on-surface-variant/60"
              aria-hidden="true"
            >
              event_available
            </span>
            <p className={cm.cn(cm.sp('mt', 3), cm.textSize('base'), cm.fontWeight('medium'))}>
              {t('dashboard.empty', {}, { defaultValue: 'No doses scheduled for today.' })}
            </p>
          </div>
        ) : (
          <ul className={cm.cn('space-y-2')}>
            {doses.map((d) => (
              <li key={d.id}>
                <DoseRow
                  medicationName={d.medication_name}
                  doseAmount={d.dose_amount}
                  pillColor={d.pill_color}
                  status={d.status}
                  scheduledTime={d.scheduled_time}
                  scheduledAt={d.scheduled_at}
                  onMarkTaken={() => markTaken(d)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 4),
          'flex-wrap gap-3',
        )}
      >
        <Link
          to="/schedule"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:opacity-80 transition-opacity',
          )}
        >
          {t('dashboard.scheduleLink', {}, { defaultValue: 'Weekly schedule \u2192' })}
        </Link>
        <Link
          to="/reports"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:opacity-80 transition-opacity',
          )}
        >
          {t('dashboard.adherenceLink', {}, { defaultValue: 'Adherence report \u2192' })}
        </Link>
      </div>
    </div>
  )
}
