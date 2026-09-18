import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface ProfileStats {
  total_entries: number
  longest_streak: number
  current_streak: number
  member_since: string
  total_words: number
  mood_counts: { radiant: number; good: number; neutral: number; low: number; struggling: number }
  milestones: { id: string; label: string; date: string; icon: string }[]
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/journal/profile-stats')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<ProfileStats>(res)
        if (
          data &&
          typeof (data as ProfileStats).total_entries === 'number' &&
          (data as ProfileStats).mood_counts
        ) {
          setStats(data)
        } else {
          setError(t('profile.loadError', {}, { defaultValue: 'Failed to load stats.' }))
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('profile.loadError', {}, { defaultValue: 'Failed to load stats.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const memberDate = stats
    ? new Date(stats.member_since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : ''
  const totalMoodEntries = stats
    ? Object.values(stats.mood_counts).reduce((a, b) => a + b, 0) || 1
    : 1

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header
        className={cm.cn(cm.sp('p', 8), 'rounded-3xl text-white relative overflow-hidden')}
        style={{
          background:
            'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 60%, var(--color-accent) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -top-20 w-60 h-60 rounded-full bg-surface/15 blur-3xl pointer-events-none',
          )}
        />
        <div
          className={cm.cn(
            'absolute -left-16 -bottom-16 w-48 h-48 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ background: 'rgba(167, 139, 250, 0.4)' }}
        />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'relative z-10')}>
          <div
            className={cm.cn(
              'w-24 h-24 rounded-full bg-surface/20 backdrop-blur-md flex items-center justify-center text-4xl font-extrabold',
            )}
          >
            {(user?.name?.[0] || user?.email?.[0] || 'L').toUpperCase()}
          </div>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-white/75',
              )}
            >
              {t('profile.eyebrow', {}, { defaultValue: 'Your journey' })}
            </p>
            <h1
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tight',
                cm.sp('mt', 1),
              )}
            >
              {user?.name ||
                user?.email?.split('@')[0] ||
                t('profile.fallbackName', {}, { defaultValue: 'Reflector' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-white/85')}>
              {t(
                'profile.memberSince',
                { date: memberDate },
                { defaultValue: 'Reflecting since {{date}}' },
              )}
            </p>
          </div>
        </div>
      </header>

      {loading && !stats ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('profile.loading', {}, { defaultValue: 'Refreshing your stats…' })}
        </p>
      ) : error && !stats ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : stats ? (
        <>
          <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {[
              {
                key: 'entries',
                icon: 'menu_book',
                label: t('profile.totalEntries', {}, { defaultValue: 'Reflections' }),
                value: stats.total_entries,
              },
              {
                key: 'words',
                icon: 'edit_note',
                label: t('profile.totalWords', {}, { defaultValue: 'Words written' }),
                value: stats.total_words.toLocaleString(),
              },
              {
                key: 'streak',
                icon: 'local_fire_department',
                label: t('profile.longestStreak', {}, { defaultValue: 'Longest streak' }),
                value: t(
                  'profile.streakValue',
                  { days: stats.longest_streak },
                  { defaultValue: '{{days}}d' },
                ),
              },
            ].map((stat) => (
              <div
                key={stat.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 border-primary hover:-translate-y-0.5 transition-transform',
                )}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  aria-hidden="true"
                  style={{ color: 'var(--mol-color-primary)', fontVariationSettings: "'FILL' 1" }}
                >
                  {stat.icon}
                </span>
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    cm.sp('mt', 4),
                  )}
                >
                  {stat.label}
                </p>
                <p className={cm.cn('text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}>
                  {stat.value}
                </p>
              </div>
            ))}
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
            )}
          >
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('profile.moodMix', {}, { defaultValue: 'Your mood mix this season' })}
            </h3>
            <div className={cm.cn('space-y-2')}>
              {(['radiant', 'good', 'neutral', 'low', 'struggling'] as const).map((level) => {
                const count = stats.mood_counts[level]
                const pct = Math.round((count / totalMoodEntries) * 100)
                const color = (
                  {
                    radiant: 'var(--color-mood-radiant-dot)',
                    good: 'var(--color-mood-good-dot)',
                    neutral: 'var(--color-mood-neutral-dot)',
                    low: 'var(--color-mood-low-dot)',
                    struggling: 'var(--color-mood-struggling-dot)',
                  } as const
                )[level]
                return (
                  <div key={level} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant w-24',
                      )}
                    >
                      {t(`profile.mood.${level}`, {}, { defaultValue: level })}
                    </span>
                    <div
                      className={cm.cn(
                        cm.flex1,
                        'h-3 rounded-full bg-surface-container relative overflow-hidden',
                      )}
                    >
                      <div
                        className={cm.cn('absolute inset-y-0 left-0 rounded-full')}
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <span
                      className={cm.cn(
                        cm.fontWeight('extrabold'),
                        cm.textSize('sm'),
                        'tabular-nums w-14 text-right',
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
            )}
          >
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('profile.milestones', {}, { defaultValue: 'Milestones' })}
            </h3>
            <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
              {stats.milestones.map((m) => (
                <li
                  key={m.id}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'rounded-2xl bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    aria-hidden="true"
                    style={{ color: 'var(--mol-color-primary)', fontVariationSettings: "'FILL' 1" }}
                  >
                    {m.icon}
                  </span>
                  <div>
                    <p
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                    >
                      {t(`profile.milestone.${m.id}`, {}, { defaultValue: m.label })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {new Date(m.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  )
}
