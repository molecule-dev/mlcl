import { useMemo } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import type { TranslateFunction } from '@molecule/app-i18n'
import { useAuth, useGet, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ObjectiveCardData } from '../components/ObjectiveCard.js'
import { ObjectiveCard } from '../components/ObjectiveCard.js'
import { ProgressRing } from '../components/ProgressRing.js'
import { type CheckInRow, type ObjectiveRow, toNumber, uiStatus } from '../lib/api.js'

interface Achievement {
  id: string
  icon: string
  label: string
  tone: 'amber' | 'indigo' | 'emerald'
}

const TONE: Record<Achievement['tone'], string> = {
  amber: 'bg-warning-light text-warning',
  indigo: 'bg-indigo-100 text-indigo-700',
  emerald: 'bg-success-light text-success-text',
}

function deriveAchievements(
  objectives: ObjectiveRow[],
  checkInCount: number,
  t: TranslateFunction,
): Achievement[] {
  const out: Achievement[] = []
  const completed = objectives.filter((o) => o.status === 'completed').length
  if (completed > 0) {
    out.push({
      id: 'a-completed',
      icon: 'flag_circle',
      tone: 'emerald',
      label:
        completed === 1
          ? t('profile.achievementCompletedOne', {}, { defaultValue: 'Completed 1 objective' })
          : t(
              'profile.achievementCompletedMany',
              { count: completed },
              { defaultValue: 'Completed {{count}} objectives' },
            ),
    })
  }
  if (checkInCount >= 1) {
    out.push({
      id: 'a-checkins',
      icon: 'workspace_premium',
      tone: 'amber',
      label:
        checkInCount === 1
          ? t('profile.achievementCheckInsOne', {}, { defaultValue: '1 check-in logged' })
          : t(
              'profile.achievementCheckInsMany',
              { count: checkInCount },
              { defaultValue: '{{count}} check-ins logged' },
            ),
    })
  }
  if (objectives.length > 0) {
    const onTrack = objectives.filter((o) => uiStatus(o.status) === 'on-track').length
    if (onTrack > 0) {
      out.push({
        id: 'a-ontrack',
        icon: 'rocket_launch',
        tone: 'indigo',
        label:
          onTrack === 1
            ? t('profile.achievementOnTrackOne', {}, { defaultValue: '1 objective on track' })
            : t(
                'profile.achievementOnTrackMany',
                { count: onTrack },
                { defaultValue: '{{count}} objectives on track' },
              ),
      })
    }
  }
  return out
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()

  const { data: rawObjectives, loading } = useGet<ObjectiveRow[]>(
    '/api/objectives?archived=false',
    { immediate: true },
  )
  const { data: rawCheckIns } = useGet<CheckInRow[]>('/api/check-ins', {
    immediate: true,
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps -- rawObjectives ?? [] creates a new array reference each render; memos depend on stable identity from rawObjectives
  const objectives = rawObjectives ?? []
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rawCheckIns ?? [] creates a new array reference each render; memos depend on stable identity from rawCheckIns
  const checkIns = rawCheckIns ?? []

  const cards: ObjectiveCardData[] = useMemo(
    () =>
      objectives.slice(0, 3).map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description ?? '',
        ownerName: user?.name ?? user?.email ?? t('common.you', {}, { defaultValue: 'You' }),
        period: '',
        progress: toNumber(o.progress),
        status: uiStatus(o.status),
        keyResultCount: 0,
        keyResultsCompleted: 0,
      })),
    [objectives, t, user],
  )

  const overallProgress = useMemo(() => {
    if (objectives.length === 0) return 0
    return Math.round(
      objectives.reduce((sum, o) => sum + toNumber(o.progress), 0) / objectives.length,
    )
  }, [objectives])

  const onTrackKrs = useMemo(
    () => objectives.filter((o) => uiStatus(o.status) === 'on-track').length,
    [objectives],
  )

  const achievements = useMemo(
    () => deriveAchievements(objectives, checkIns.length, t),
    [objectives, checkIns, t],
  )

  return (
    <div className={cm.cn(cm.stack(8))} data-testid="profile-page">
      <header
        className={cm.cn('relative overflow-hidden rounded-[2rem] text-white', cm.sp('p', 8))}
        style={{
          background:
            'linear-gradient(135deg, var(--color-nav-bg) 0%, var(--color-primary-hover) 55%, var(--color-secondary) 100%)',
        }}
      >
        <div
          aria-hidden
          className={cm.cn(
            'absolute -right-24 -top-20 w-72 h-72 rounded-full bg-sky-400/30 blur-3xl',
          )}
        />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'relative')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-20 h-20 rounded-2xl bg-surface/15 backdrop-blur-md text-white text-3xl font-extrabold',
            )}
          >
            {(user?.name ?? user?.email ?? 'A').slice(0, 1).toUpperCase()}
          </div>
          <div className={cm.cn(cm.stack(2), cm.flex1, 'min-w-0')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-[0.22em] text-sky-200',
              )}
            >
              {t('profile.eyebrow', {}, { defaultValue: 'Climber profile' })}
            </span>
            <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-white')}>
              {user?.name ?? t('profile.guestName', {}, { defaultValue: 'Climber' })}
            </h1>
            <p data-testid="profile-email" className={cm.cn(cm.textSize('sm'), 'text-indigo-100')}>
              {user?.email ?? 'climber@team.com'}
            </p>
          </div>
          <ProgressRing
            value={overallProgress}
            size={130}
            stroke={11}
            status={
              overallProgress >= 75 ? 'on-track' : overallProgress >= 50 ? 'at-risk' : 'behind'
            }
            label={t('profile.streakLabel', {}, { defaultValue: 'Quarter so far' })}
            className="text-white shrink-0"
          />
        </div>
      </header>

      <section className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <div className={cm.cn('col-span-12 lg:col-span-7', cm.stack(4))}>
          <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
            <h2
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('profile.activeHeading', {}, { defaultValue: 'Active objectives' })}
            </h2>
            <Link
              to="/objectives"
              className={cm.cn(
                'text-sm font-bold text-indigo-700 hover:text-indigo-900 transition-colors',
              )}
            >
              {t('profile.allObjectives', {}, { defaultValue: 'All objectives →' })}
            </Link>
          </div>
          <div className={cm.cn(cm.stack(3))} data-testid="profile-objective-list">
            {loading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('profile.loading', {}, { defaultValue: 'Loading objectives…' })}
              </p>
            ) : cards.length === 0 ? (
              <div
                data-testid="profile-empty"
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(2),
                  'rounded-2xl border border-dashed border-outline-variant text-center',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'profile.empty',
                    {},
                    {
                      defaultValue: 'No active objectives yet — create your first to get started.',
                    },
                  )}
                </p>
                <Link
                  to="/objectives/new"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-xl bg-primary text-on-primary inline-block self-center hover:opacity-90 transition-colors',
                  )}
                >
                  {t('profile.createFirst', {}, { defaultValue: 'Create objective' })}
                </Link>
              </div>
            ) : (
              cards.map((obj) => (
                <ObjectiveCard key={obj.id} objective={obj} href={`/objectives/${obj.id}`} />
              ))
            )}
          </div>
        </div>
        <aside className={cm.cn('col-span-12 lg:col-span-5', cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('profile.statsHeading', {}, { defaultValue: 'This quarter' })}
            </h3>
            <div className={cm.cn(cm.grid({ cols: 3, gap: 'sm' }))}>
              <div className={cm.cn(cm.stack(1), cm.sp('p', 3), 'rounded-xl bg-indigo-50')}>
                <span
                  data-testid="stat-objectives"
                  className={cm.cn(
                    cm.textSize('2xl'),
                    'font-extrabold tabular-nums text-indigo-700',
                  )}
                >
                  {objectives.length}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-indigo-700',
                  )}
                >
                  {t('profile.statObjectives', {}, { defaultValue: 'Objectives' })}
                </span>
              </div>
              <div className={cm.cn(cm.stack(1), cm.sp('p', 3), 'rounded-xl bg-warning-light')}>
                <span
                  data-testid="stat-checkins"
                  className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums text-warning')}
                >
                  {checkIns.length}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-warning',
                  )}
                >
                  {t('profile.statCheckIns', {}, { defaultValue: 'Check-ins' })}
                </span>
              </div>
              <div className={cm.cn(cm.stack(1), cm.sp('p', 3), 'rounded-xl bg-success-light')}>
                <span
                  data-testid="stat-ontrack"
                  className={cm.cn(
                    cm.textSize('2xl'),
                    'font-extrabold tabular-nums text-success-text',
                  )}
                >
                  {onTrackKrs}
                </span>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-success-text',
                  )}
                >
                  {t('profile.statOnTrack', {}, { defaultValue: 'On track' })}
                </span>
              </div>
            </div>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <h3
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.achievements', {}, { defaultValue: 'Achievements' })}
            </h3>
            {achievements.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'profile.noAchievements',
                  {},
                  { defaultValue: 'Complete a check-in to unlock your first achievement.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn(cm.stack(2))} data-testid="profile-achievements">
                {achievements.map((a) => (
                  <li
                    key={a.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('p', 3),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        'w-10 h-10 rounded-xl',
                        TONE[a.tone],
                      )}
                    >
                      <span
                        className="material-symbols-outlined text-[22px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {a.icon}
                      </span>
                    </span>
                    <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                      {a.label}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

export default Profile
