import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LogNightForm } from '../components/LogNightForm.js'
import { NightHistoryRow } from '../components/NightHistoryRow.js'
import type { SleepQuality } from '../components/SleepScoreHeroCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface SleepLog {
  id: string
  sleep_date: string
  bedtime: string
  wake_time: string
  duration_minutes: number
  quality_score: number | null
  interruptions: number
  sleep_stages?: { deep?: number; light?: number; rem?: number; awake?: number }
  notes?: string | null
}

function qualityFromScore(score: number | null): SleepQuality {
  if (score == null) return 'fair'
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}

const FILTERS: { key: 'all' | SleepQuality; defaultLabel: string; tone: string }[] = [
  { key: 'all', defaultLabel: 'All', tone: 'rgba(108, 92, 231, 0.14)' },
  { key: 'excellent', defaultLabel: 'Excellent', tone: 'rgba(16, 185, 129, 0.14)' },
  { key: 'good', defaultLabel: 'Good', tone: 'rgba(108, 92, 231, 0.14)' },
  { key: 'fair', defaultLabel: 'Fair', tone: 'rgba(245, 158, 11, 0.14)' },
  { key: 'poor', defaultLabel: 'Poor', tone: 'rgba(239, 68, 68, 0.14)' },
]

export function NightHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [showLogForm, setShowLogForm] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/sleep?limit=200')
      .then((res) => {
        if (cancelled) return
        setLogs(unwrapList<SleepLog>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, reloadKey])

  const nights = useMemo(
    () =>
      logs
        .map((l) => ({ ...l, quality: qualityFromScore(l.quality_score) }))
        .filter((n) => filter === 'all' || n.quality === filter),
    [logs, filter],
  )

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.history', {}, { defaultValue: 'History' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}
          >
            {t('nightHistory.heading', {}, { defaultValue: 'Every night you’ve tracked' })}
          </h1>
        </div>
        <div className={cm.cn(cm.flex({ gap: 'xs' }), 'flex-wrap')}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  'text-xs rounded-full uppercase tracking-widest transition-colors',
                  active
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
                style={active ? undefined : { backgroundColor: f.tone }}
              >
                {t(`nightHistory.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
      </header>

      <div className={cm.cn(cm.flex({ justify: 'end' }))}>
        <button
          type="button"
          onClick={() => setShowLogForm((v) => !v)}
          data-mol-id="history-log-night"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow min-h-10',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            bedtime
          </span>
          {t('nightHistory.logNight', {}, { defaultValue: 'Log a night' })}
        </button>
      </div>

      {showLogForm ? (
        <LogNightForm
          onCreated={() => {
            setShowLogForm(false)
            setReloadKey((k) => k + 1)
          }}
          onCancel={() => setShowLogForm(false)}
        />
      ) : null}

      <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
        {loading
          ? t('nightHistory.loading', {}, { defaultValue: 'Loading nights…' })
          : t(
              'nightHistory.count',
              { count: nights.length },
              { defaultValue: 'Showing {{count}} nights' },
            )}
      </p>

      {!loading && nights.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest text-center space-y-2',
          )}
          data-testid="history-empty"
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('nightHistory.empty.title', {}, { defaultValue: 'No nights tracked yet' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'nightHistory.empty.body',
              {},
              {
                defaultValue: 'Log a sleep session or connect a wearable to populate your history.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('space-y-3')}>
          {nights.map((n) => {
            const stages = n.sleep_stages ?? { deep: 0, light: 0, rem: 0, awake: 0 }
            return (
              <NightHistoryRow
                key={n.id}
                id={n.id}
                date={n.sleep_date}
                bedtime={n.bedtime}
                wakeTime={n.wake_time}
                durationMinutes={n.duration_minutes}
                score={n.quality_score ?? 0}
                quality={n.quality}
                stageShares={{
                  deep: stages.deep ?? 0,
                  light: stages.light ?? 0,
                  rem: stages.rem ?? 0,
                  awake: stages.awake ?? 0,
                }}
                notes={n.notes ?? undefined}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
