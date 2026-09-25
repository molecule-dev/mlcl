import { NavLink } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Primary in-app navigation for the PUBLIC pages' shared `AppHeader`
 * (`extraActions` slot, md+ — AppHeader owns the responsive collapse).
 *
 * The AUTHENTICATED shell's sidebar/drawer nav lives in `AppLayout.tsx` and
 * reuses this same `NAV_ITEMS` list, so the signed-in destinations stay in
 * one place.
 */

export const NAV_ITEMS = [
  { to: '/discover', glyph: 'travel_explore', key: 'nav.discover', label: 'Discover' },
  { to: '/my-quizzes', glyph: 'edit_note', key: 'nav.yourLibrary', label: 'My quizzes' },
  { to: '/leaderboard', glyph: 'leaderboard', key: 'nav.leaderboard', label: 'Leaderboard' },
  { to: '/notifications', glyph: 'notifications', key: 'nav.activity', label: 'Activity' },
] as const

export function MainNavLinks() {
  const cm = getClassMap()
  const { t } = useTranslation()

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

export default MainNavLinks
