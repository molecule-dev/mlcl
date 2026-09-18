import { Link } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useDashboardStats } from '../lib/useDashboardStats.js'

function getGreetingKey(): { key: string; defaultValue: string } {
  const hour = new Date().getHours()
  if (hour < 5) return { key: 'welcomeBanner.greetingNight', defaultValue: 'Up late, {{name}}?' }
  if (hour < 12)
    return { key: 'welcomeBanner.greetingMorning', defaultValue: 'Good morning, {{name}}!' }
  if (hour < 18)
    return { key: 'welcomeBanner.greetingAfternoon', defaultValue: 'Good afternoon, {{name}}!' }
  return { key: 'welcomeBanner.greetingEvening', defaultValue: 'Good evening, {{name}}!' }
}

function WelcomeBanner() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const firstName =
    (user?.name && user.name.split(' ')[0]) ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('welcomeBanner.guestName', {}, { defaultValue: 'there' })
  const { stats } = useDashboardStats()
  const greeting = getGreetingKey()
  const thisWeek = stats?.completedLessonsThisWeek ?? 0
  const subtitle =
    thisWeek > 0
      ? t(
          'welcomeBanner.weekProgress',
          { count: thisWeek },
          {
            defaultValue:
              "You've completed {{count}} lesson(s) this week — keep the momentum going.",
          },
        )
      : t(
          'welcomeBanner.weekStart',
          {},
          {
            defaultValue: 'Start a new lesson today — every step compounds toward mastery.',
          },
        )
  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-3xl bg-primary-container text-on-primary-container shadow-xl',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), 'relative z-10')}>
        <div className={cm.maxW('xl')}>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 3),
              'text-display-lg font-headline tracking-tight',
            )}
          >
            {t(greeting.key, { name: firstName }, { defaultValue: greeting.defaultValue })}
          </h1>
          <p
            className={cm.cn(cm.textSize('lg'), cm.sp('mb', 8), 'opacity-90 font-body')}
            data-mol-id="welcome-banner-subtitle"
          >
            {subtitle}
          </p>
          <Link
            to="/courses"
            className={cm.cn(
              'bg-surface-container-lowest text-primary px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-surface transition-all transform hover:scale-[1.02]',
            )}
            data-mol-id="cta-continue-learning"
          >
            {t('welcomeBanner.continueLearning', {}, { defaultValue: 'Continue Learning' })}
          </Link>
        </div>
        <div className={cm.cn('hidden lg:block')}>
          <span
            className={cm.cn(
              'material-symbols-outlined text-[160px] opacity-10 absolute -right-10 -bottom-10 rotate-12',
            )}
            data-icon="auto_stories"
          >
            auto_stories
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          'absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-tertiary opacity-40',
        )}
      ></div>
    </section>
  )
}

export default WelcomeBanner
export { WelcomeBanner }
