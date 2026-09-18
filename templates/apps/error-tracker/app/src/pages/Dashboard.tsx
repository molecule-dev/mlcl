import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { IssueRow, type IssueRowData } from '../components/IssueRow.js'
import { StatsCounterCard } from '../components/StatsCounterCard.js'
import { unwrapList } from '../lib/unwrap.js'

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [issues, setIssues] = useState<IssueRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/issues')
      .then((res) => {
        if (cancelled) return
        setIssues(unwrapList<IssueRowData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('dashboard.loadError', {}, { defaultValue: "Couldn't load issues from the API." }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(() => {
    return issues.reduce(
      (acc, i) => {
        if (i.status === 'unresolved' || i.status === 'new') acc.unresolved += 1
        if (i.level === 'critical' && i.status !== 'resolved') acc.critical += 1
        acc.users += i.user_count
        acc.events += i.event_count
        return acc
      },
      { unresolved: 0, critical: 0, users: 0, events: 0 },
    )
  }, [issues])

  const frequency = useMemo(() => {
    const length = issues[0]?.frequency?.length ?? 20
    const summed = new Array<number>(length).fill(0)
    for (const issue of issues) {
      ;(issue.frequency ?? []).forEach((v, i) => {
        summed[i] = (summed[i] ?? 0) + v
      })
    }
    return summed
  }, [issues])

  const totalEventsLastHour = frequency.slice(-3).reduce((a, b) => a + b, 0)
  const visible = issues.slice(0, 5)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'dashboard.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} tail --since=24h' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Last 24 hours across every watched project.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <span
            className={cm.cn('h-2 w-2 rounded-full animate-pulse')}
            style={{
              backgroundColor: BRAND_COLOR,
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}
            aria-hidden="true"
          />
          <span
            className={cm.cn('font-mono text-[11px] font-extrabold uppercase tracking-widest')}
            style={{ color: BRAND_COLOR }}
          >
            {t('dashboard.realtimeOn', {}, { defaultValue: 'ingest live' })}
          </span>
        </div>
      </header>

      {/* Hero frequency band */}
      <section
        className={cm.cn('relative overflow-hidden rounded-[1.5rem] mb-8 p-7')}
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 18%, transparent), color-mix(in srgb, var(--color-tertiary) 10%, transparent))',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 h-72 w-72 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)' }}
          aria-hidden="true"
        />
        <div className={cm.cn('relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-end')}>
          <div className={cm.cn('lg:col-span-5')}>
            <p
              className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('dashboard.eventsLastHour', {}, { defaultValue: 'Events · last hour' })}
            </p>
            <p
              className={cm.cn(
                'mt-2 font-mono text-6xl font-extrabold tracking-tighter tabular-nums',
              )}
              style={{ color: 'var(--color-text)' }}
            >
              {totalEventsLastHour.toLocaleString()}
            </p>
            <span
              className={cm.cn(
                'mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md font-mono',
              )}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-on-surface) 10%, transparent)',
                color: 'var(--color-text)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
                trending_up
              </span>
              {t('dashboard.deltaLabel', {}, { defaultValue: '+18% vs prev hr' })}
            </span>
          </div>
          <div className={cm.cn('lg:col-span-7')}>
            <FrequencySparkline
              values={frequency}
              width={620}
              height={120}
              color="var(--color-severity-resolved)"
              spikeColor="var(--color-severity-critical)"
              mode="bar"
              className={cm.cn('w-full h-auto')}
              ariaLabel={t(
                'dashboard.eventFrequencyAria',
                {},
                { defaultValue: 'Event frequency over the last 24 hours' },
              )}
            />
          </div>
        </div>
      </section>

      {/* KPI quad */}
      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <StatsCounterCard
          eyebrow={t('dashboard.metric.unresolved', {}, { defaultValue: 'Unresolved' })}
          value={String(counts.unresolved)}
          icon="bug_report"
          tone="critical"
          caption={t(
            'dashboard.metric.unresolvedCaption',
            {},
            { defaultValue: 'Across all projects' },
          )}
          changeLabel="+4"
          changeTone="critical"
        />
        <StatsCounterCard
          eyebrow={t('dashboard.metric.critical', {}, { defaultValue: 'Critical' })}
          value={String(counts.critical)}
          icon="emergency_home"
          tone="error"
          caption={t(
            'dashboard.metric.criticalCaption',
            {},
            { defaultValue: 'Need attention now' },
          )}
        />
        <StatsCounterCard
          eyebrow={t('dashboard.metric.users', {}, { defaultValue: 'Users affected' })}
          value={counts.users.toLocaleString()}
          icon="group"
          tone="warning"
          caption={t('dashboard.metric.usersCaption', {}, { defaultValue: 'Last 24 hours' })}
          sparkline={[12, 18, 24, 22, 28, 31, 38]}
        />
        <StatsCounterCard
          eyebrow={t('dashboard.metric.events', {}, { defaultValue: 'Events / 24h' })}
          value={counts.events.toLocaleString()}
          icon="bolt"
          tone="primary"
          caption={t('dashboard.metric.eventsCaption', {}, { defaultValue: 'Stable ingest' })}
          changeLabel="-3%"
          changeTone="primary"
          sparkline={frequency.slice(-12)}
        />
      </section>

      {/* Top issues feed */}
      <section className={cm.cn('mb-3 flex items-center justify-between')}>
        <div>
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('dashboard.topIssuesEyebrow', {}, { defaultValue: '// top unresolved' })}
          </p>
          <h2
            className={cm.cn('mt-1 text-xl font-bold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('dashboard.topIssuesHeading', {}, { defaultValue: 'Top issues' })}
          </h2>
        </div>
      </section>

      {error ? (
        <p
          className={cm.cn(cm.sp('py', 4), cm.sp('px', 4), 'rounded-md text-xs')}
          style={{
            color: 'var(--color-severity-warning)',
            backgroundColor: 'var(--color-severity-warning-light)',
            border: '1px solid var(--color-severity-warning)',
          }}
        >
          {error}
        </p>
      ) : loading ? (
        <p
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('dashboard.loading', {}, { defaultValue: 'Loading issues…' })}
        </p>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(cm.sp('py', 16), cm.textCenter)}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            check_circle
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'dashboard.empty',
              {},
              { defaultValue: 'All clear — no unresolved issues right now.' },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-3')}>
          {visible.map((i) => (
            <li key={i.id}>
              <IssueRow issue={i} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
