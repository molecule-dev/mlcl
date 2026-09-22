import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  threshold_days: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  unlocked: boolean
  unlocked_at: string | null
  progress_days: number
}

const TIER_ORDER: Achievement['tier'][] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

const TIER_COLOR: Record<Achievement['tier'], string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#fbbf24',
  platinum: '#e5e7eb',
  diamond: '#06b6d4',
}

export function Achievements() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/achievements')
      .then((res) => {
        if (!cancelled) setAchievements(unwrapList<Achievement>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('achievements.loadError', {}, { defaultValue: 'Failed to load achievements.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const grouped = useMemo(() => {
    const map = new Map<Achievement['tier'], Achievement[]>()
    for (const tier of TIER_ORDER) map.set(tier, [])
    for (const a of achievements) map.get(a.tier)?.push(a)
    return map
  }, [achievements])

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.achievements', {}, { defaultValue: 'Achievements' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'achievements.subheading',
            { unlocked: unlockedCount, total: achievements.length },
            { defaultValue: '{{unlocked}} of {{total}} unlocked' },
          )}
        </p>
      </header>

      {TIER_ORDER.map((tier) => {
        const items = grouped.get(tier) ?? []
        if (items.length === 0) return null
        return (
          <section key={tier} className={cm.cn('space-y-3')}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant',
                'uppercase tracking-wider',
              )}
            >
              {t(
                `achievements.tier.${tier}`,
                {},
                { defaultValue: tier.charAt(0).toUpperCase() + tier.slice(1) },
              )}
            </h2>
            <ul className={cm.grid({ cols: 4, gap: 'md' })}>
              {items.map((a) => {
                const pct = Math.min(100, Math.round((a.progress_days / a.threshold_days) * 100))
                return (
                  <li
                    key={a.id}
                    className={cm.cn(cm.card(), cm.sp('p', 5), cm.textCenter, 'space-y-2')}
                  >
                    <div
                      className={cm.cn(
                        cm.mxAuto,
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.roundedFull,
                        cm.h(16),
                        cm.w(16),
                      )}
                      style={{
                        backgroundColor: a.unlocked
                          ? TIER_COLOR[tier]
                          : 'var(--color-achievement-locked)',
                        opacity: a.unlocked ? 1 : 0.35,
                      }}
                    >
                      <span aria-hidden="true" className={cm.cn(cm.textSize('3xl'))}>
                        {a.icon}
                      </span>
                    </div>
                    <h3
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        a.unlocked ? '' : 'text-on-surface-variant',
                      )}
                    >
                      {a.name}
                    </h3>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {a.description}
                    </p>
                    {a.unlocked ? (
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.textPrimary,
                          cm.fontWeight('medium'),
                        )}
                      >
                        {t(
                          'achievements.unlockedOn',
                          {
                            date: a.unlocked_at ? new Date(a.unlocked_at).toLocaleDateString() : '',
                          },
                          { defaultValue: 'Unlocked {{date}}' },
                        )}
                      </p>
                    ) : (
                      <div>
                        <div
                          className={cm.cn('w-full')}
                          style={{
                            height: '4px',
                            backgroundColor: 'var(--color-heatmap-empty)',
                            borderRadius: '2px',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: 'var(--color-flame)',
                              borderRadius: '2px',
                            }}
                          />
                        </div>
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant',
                            cm.sp('mt', 1),
                          )}
                        >
                          {t(
                            'achievements.progress',
                            { progress: a.progress_days, total: a.threshold_days },
                            { defaultValue: '{{progress}} / {{total}} days' },
                          )}
                        </p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
