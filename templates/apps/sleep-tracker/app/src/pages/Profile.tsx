import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface ProfileUser extends UserProfile {
  chronotype?: string
  sleepGoalHours?: number
}

interface AchievementData {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  earnedAt?: string
}

const ACHIEVEMENTS: AchievementData[] = [
  {
    id: 'a_001',
    title: 'Seven for seven',
    description: 'Hit your duration goal seven nights in a row.',
    icon: 'military_tech',
    earned: true,
    earnedAt: '3 days ago',
  },
  {
    id: 'a_002',
    title: 'Deep diver',
    description: '30 minutes of deep sleep for 14 consecutive nights.',
    icon: 'dark_mode',
    earned: true,
    earnedAt: '11 days ago',
  },
  {
    id: 'a_003',
    title: 'Early to bed',
    description: 'Bedtime before 10:30 PM for two weeks straight.',
    icon: 'schedule',
    earned: false,
  },
  {
    id: 'a_004',
    title: 'Coach completist',
    description: 'Finish a 14-day coaching program.',
    icon: 'school',
    earned: false,
  },
  {
    id: 'a_005',
    title: 'Year in sleep',
    description: 'Track 365 nights with {{appName}}.',
    icon: 'auto_awesome',
    earned: false,
  },
]

const YEAR_STATS = [
  { label: 'Nights tracked', value: '187' },
  { label: 'Avg score', value: '81' },
  { label: 'Avg duration', value: '7.2h' },
  { label: 'Best streak', value: '38' },
]

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<ProfileUser>()
  const displayName =
    user?.name || user?.email || t('profile.defaultName', {}, { defaultValue: 'Sleeper' })
  const chronotype = user?.chronotype ?? 'Hummingbird (mid-evening, 8h goal)'

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-20 w-20 rounded-full bg-primary text-on-primary shadow-lg shrink-0',
            cm.fontWeight('extrabold'),
            cm.textSize('2xl'),
          )}
          aria-hidden="true"
        >
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className={cm.cn('min-w-0')}>
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('profile.eyebrow', {}, { defaultValue: 'Your sleep identity' })}
          </p>
          <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight truncate')}>
            {displayName}
          </h1>
          <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'profile.chronotype',
              { value: chronotype },
              { defaultValue: 'Chronotype: {{value}}' },
            )}
          </p>
        </div>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
        {YEAR_STATS.map((s) => (
          <div
            key={s.label}
            className={cm.cn(
              cm.sp('p', 5),
              'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 text-center hover:-translate-y-0.5 transition-transform',
            )}
            style={{ borderLeftColor: 'var(--color-border-focus)' }}
          >
            <p
              className={cm.cn('text-3xl font-extrabold tracking-tight')}
              style={{ color: 'var(--color-border-focus)', fontVariantNumeric: 'tabular-nums' }}
            >
              {s.value}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`profile.yearStat.${s.label}`, {}, { defaultValue: s.label })}
            </p>
          </div>
        ))}
      </section>

      <section>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('profile.achievementsTitle', {}, { defaultValue: 'Achievements' })}
        </h2>
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {ACHIEVEMENTS.map((a) => (
            <article
              key={a.id}
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4',
                a.earned ? '' : 'opacity-70',
              )}
              style={{
                borderLeftColor: a.earned ? 'var(--color-border-focus)' : 'var(--color-text-muted)',
              }}
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-12 w-12 rounded-xl shrink-0',
                  )}
                  style={
                    a.earned
                      ? {
                          backgroundColor: 'var(--color-primary)',
                          color: 'var(--color-on-primary)',
                        }
                      : {
                          backgroundColor: 'var(--color-badge-muted-bg)',
                          color: 'var(--color-badge-muted-fg)',
                        }
                  }
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-2xl')}
                    aria-hidden="true"
                    style={{ fontVariationSettings: a.earned ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {a.icon}
                  </span>
                </span>
                {a.earned ? (
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.fontWeight('bold'),
                      'text-[10px] py-1 rounded-full uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: 'var(--color-badge-green-bg)',
                      color: 'var(--color-badge-green-fg)',
                    }}
                  >
                    {t('profile.earned', {}, { defaultValue: 'Earned' })}
                  </span>
                ) : (
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.fontWeight('bold'),
                      'text-[10px] py-1 rounded-full uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: 'var(--color-badge-muted-bg)',
                      color: 'var(--color-badge-muted-fg)',
                    }}
                  >
                    {t('profile.locked', {}, { defaultValue: 'Locked' })}
                  </span>
                )}
              </div>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                {t(`profile.achievement.${a.id}.title`, {}, { defaultValue: a.title })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                {t(
                  `profile.achievement.${a.id}.description`,
                  { appName: APP_NAME },
                  { defaultValue: a.description },
                )}
              </p>
              {a.earnedAt ? (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mt', 3),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    `profile.achievement.${a.id}.earnedAt`,
                    { value: a.earnedAt },
                    { defaultValue: 'Unlocked {{value}}' },
                  )}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
