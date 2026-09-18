import { useEffect, useMemo, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type LeaderboardEntry, LeaderboardPanel } from '../components/LeaderboardPanel.js'

interface BackendEntry {
  user_id: string
  total_xp: number | string
  current_streak?: number | string
  name?: string | null
  email?: string | null
}

const TABS = ['friends', 'global'] as const

const NAME_FLAGS = ['🇪🇸', '🇫🇷', '🇯🇵', '🇩🇪', '🇮🇹', '🇰🇷', '🇨🇳', '🇧🇷']

function adapt(rows: BackendEntry[], meId: string | null): LeaderboardEntry[] {
  return rows.map((r, idx) => ({
    id: String(r.user_id),
    rank: idx + 1,
    name: r.name?.trim() || (r.email?.split('@')[0] ?? `Learner ${idx + 1}`),
    flag: NAME_FLAGS[idx % NAME_FLAGS.length],
    avatar: `https://picsum.photos/seed/parlance-${r.user_id}/96/96`,
    xp: Number(r.total_xp ?? 0),
    isCurrentUser: meId != null && String(r.user_id) === meId,
  }))
}

export function Leaderboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{ id?: string }>()
  const [tab, setTab] = useState<(typeof TABS)[number]>('friends')
  const [weekly, setWeekly] = useState<LeaderboardEntry[]>([])
  const [global, setGlobal] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const userId = user?.id ?? null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<{ entries: BackendEntry[] } | { data: { entries: BackendEntry[] } }>(
        '/api/leaderboard/weekly',
      ),
      http.get<{ entries: BackendEntry[] } | { data: { entries: BackendEntry[] } }>(
        '/api/leaderboard/all-time',
      ),
    ])
      .then(([weeklyRes, globalRes]) => {
        if (cancelled) return
        const wBody =
          weeklyRes && typeof weeklyRes === 'object' && 'data' in weeklyRes
            ? (weeklyRes as { data: { entries: BackendEntry[] } }).data
            : (weeklyRes as { entries: BackendEntry[] })
        const gBody =
          globalRes && typeof globalRes === 'object' && 'data' in globalRes
            ? (globalRes as { data: { entries: BackendEntry[] } }).data
            : (globalRes as { entries: BackendEntry[] })
        setWeekly(adapt(wBody?.entries ?? [], userId))
        setGlobal(adapt(gBody?.entries ?? [], userId))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('leaderboard.loadError', {}, { defaultValue: 'Could not load leaderboard.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, userId])

  const entries = tab === 'friends' ? weekly : global
  const period = useMemo(
    () =>
      tab === 'friends'
        ? t('leaderboard.weeklyPeriod', {}, { defaultValue: 'This week · friends' })
        : t('leaderboard.globalPeriod', {}, { defaultValue: 'All time · global' }),
    [tab, t],
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p className={cm.cn('font-bold uppercase tracking-widest text-xs text-primary')}>
          {t('leaderboard.eyebrow', {}, { defaultValue: 'Weekly XP race' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('leaderboard.heading', {}, { defaultValue: 'Leaderboard' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant max-w-xl')}>
          {t(
            'leaderboard.subheading',
            {},
            { defaultValue: 'XP this week. Resets on Sunday at midnight in your local time.' },
          )}
        </p>
      </header>

      {error && (
        <p
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('xs'),
            cm.textCenter,
            'rounded-xl bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </p>
      )}

      <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest transition-all',
              tab === item
                ? 'bg-gradient-to-r from-primary to-primary-dark text-on-primary shadow-md shadow-primary/30'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-outline-variant/30',
            )}
          >
            {t(`leaderboard.tab.${item}`, {}, { defaultValue: item })}
          </button>
        ))}
      </div>

      {loading && entries.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('leaderboard.loading', {}, { defaultValue: 'Loading leaderboard…' })}
        </p>
      ) : entries.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'leaderboard.empty',
            {},
            { defaultValue: 'No learners yet — earn some XP to be the first.' },
          )}
        </p>
      ) : (
        <LeaderboardPanel entries={entries} period={period} />
      )}

      {/* Reward strip. */}
      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-3xl bg-gradient-to-br from-secondary to-secondary-dark text-white shadow-xl shadow-secondary/30 relative overflow-hidden',
        )}
      >
        <div className={cm.cn('relative z-10')}>
          <p
            className={cm.cn(
              'font-black uppercase tracking-widest text-[10px] text-secondary-fixed/90 mb-2',
            )}
          >
            {t('leaderboard.rewardEyebrow', {}, { defaultValue: 'This week’s prize' })}
          </p>
          <h2 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
            {t(
              'leaderboard.rewardHeading',
              { count: 3 },
              { defaultValue: 'Top {{count}} earn the gold league badge' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'opacity-90 max-w-md')}>
            {t(
              'leaderboard.rewardBody',
              {},
              {
                defaultValue:
                  'Holding gold three weeks in a row promotes you to diamond. Friendly stakes only.',
              },
            )}
          </p>
        </div>
        <span
          className={cm.cn(
            'material-symbols-outlined text-[140px] absolute -right-6 -bottom-10 opacity-20',
          )}
          aria-hidden="true"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          workspace_premium
        </span>
      </section>
    </div>
  )
}

export default Leaderboard
