import { NavLink } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Primary in-app navigation, rendered two ways by the same source list:
 *
 * - `variant="inline"` — desktop (md+) links inside the AppHeader's
 *   `extraActions` slot.
 * - `variant="chips"` — below md (768px) a horizontally scrollable chip bar
 *   directly under the header. The app has no sidebar; without this the
 *   phone layout has NO nav between Discover / My quizzes / Leaderboard /
 *   Activity except the user menu. Chips keep >=40px tap targets and never
 *   wrap (overflow-x-auto), so 390px never overflows vertically.
 */

const NAV_ITEMS = [
  { to: '/discover', glyph: 'travel_explore', key: 'nav.discover', label: 'Discover' },
  { to: '/my-quizzes', glyph: 'edit_note', key: 'nav.yourLibrary', label: 'My quizzes' },
  { to: '/leaderboard', glyph: 'leaderboard', key: 'nav.leaderboard', label: 'Leaderboard' },
  { to: '/notifications', glyph: 'notifications', key: 'nav.activity', label: 'Activity' },
] as const

export function MainNavLinks({ variant }: { variant: 'inline' | 'chips' }) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (variant === 'inline') {
    return (
      <nav
        aria-label="Primary"
        className={cm.cn(cm.flex({ align: 'center', gap: 5 }), 'hidden md:flex')}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                'text-sm font-bold rounded-lg px-1 py-1 transition-colors',
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface',
              )
            }
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
              {item.glyph}
            </span>
            {t(item.key, {}, { defaultValue: item.label })}
          </NavLink>
        ))}
      </nav>
    )
  }

  return (
    <nav
      aria-label="Primary"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        'md:hidden overflow-x-auto px-4 py-2 border-b border-outline-variant/20 bg-surface/95 backdrop-blur-md',
      )}
      data-mol-id="nav-mobile"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              'min-h-[40px] px-4 inline-flex items-center rounded-full whitespace-nowrap text-xs font-extrabold uppercase tracking-widest transition-colors',
              isActive
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-surface-container-low text-on-surface-variant',
            )
          }
        >
          <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
            {item.glyph}
          </span>
          {t(item.key, {}, { defaultValue: item.label })}
        </NavLink>
      ))}
    </nav>
  )
}

export default MainNavLinks
