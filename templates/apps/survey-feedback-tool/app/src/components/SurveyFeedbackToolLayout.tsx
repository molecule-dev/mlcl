/**
 * Gauge sidebar shell — 64px icon rail (desktop/tablet), wide content
 * column with the standard <Header>/<Footer> chrome. Used by every
 * authenticated screen (Surveys, Builder, Responses, SurveyDetail,
 * ResponseDetail, Analytics, Templates, Settings, Profile,
 * Notifications). Public survey + auth pages keep their own framing.
 *
 * Mobile (<768px): the rail hides and a sticky, horizontally scrollable
 * chip nav takes over under the header — same items, same active state,
 * tap targets ≥36px (fleet mobile-shell pattern).
 *
 * Translated from customer-support-chat InboxLayout — same icon-rail
 * navigation idiom, retuned for the Gauge indigo/coral palette.
 */
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

interface SurveyFeedbackToolLayoutProps {
  children: ReactNode
}

const NAV_ITEMS = [
  {
    to: '/surveys',
    icon: 'poll',
    key: 'surveyFeedbackToolLayout.nav.surveys',
    defaultValue: 'Surveys',
    matchPrefix: '/surveys',
  },
  {
    to: '/templates',
    icon: 'collections_bookmark',
    key: 'surveyFeedbackToolLayout.nav.templates',
    defaultValue: 'Templates',
    matchPrefix: '/templates',
  },
  {
    to: '/notifications',
    icon: 'notifications',
    key: 'surveyFeedbackToolLayout.nav.notifications',
    defaultValue: 'Activity',
    matchPrefix: '/notifications',
  },
  {
    to: '/settings',
    icon: 'settings',
    key: 'surveyFeedbackToolLayout.nav.settings',
    defaultValue: 'Settings',
    matchPrefix: '/settings',
  },
  {
    to: '/profile',
    icon: 'person',
    key: 'surveyFeedbackToolLayout.nav.profile',
    defaultValue: 'Profile',
    matchPrefix: '/profile',
  },
]

function SurveyFeedbackToolLayout({ children }: SurveyFeedbackToolLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'))}>
      <Header />
      {/* Mobile chip nav — the rail's <md replacement. Sticky so navigation
          stays reachable on long pages; scrollable so every item fits 390px. */}
      <nav
        aria-label={t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('px', 3),
          'sticky top-0 z-30 w-full overflow-x-auto bg-gradient-to-r from-primary to-secondary text-white md:hidden',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.matchPrefix)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={t(item.key, {}, { defaultValue: item.defaultValue })}
              aria-current={isActive ? 'page' : undefined}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.sp('my', 2),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-full transition-colors',
                isActive
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              {t(item.key, {}, { defaultValue: item.defaultValue })}
            </Link>
          )
        })}
      </nav>
      <div className={cm.cn(cm.flex({ gap: 0 }), cm.flex1, 'min-h-0')}>
        <nav
          aria-label={t('nav.workspace', {}, { defaultValue: 'Workspace' })}
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 2 }),
            cm.sp('py', 4),
            'hidden w-16 shrink-0 bg-gradient-to-b from-primary to-secondary text-white md:flex',
          )}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.matchPrefix)
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={t(item.key, {}, { defaultValue: item.defaultValue })}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  'rounded-xl transition-colors',
                  isActive
                    ? 'bg-surface/20 text-white shadow-sm'
                    : 'text-white/65 hover:text-white hover:bg-surface/10',
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 22 }}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              </Link>
            )
          })}
        </nav>
        <main className={cm.cn(cm.flex1, 'min-w-0 bg-surface-secondary')}>{children}</main>
      </div>
      <Footer />
    </div>
  )
}

export default SurveyFeedbackToolLayout
export { SurveyFeedbackToolLayout }
