import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'

/**
 * Sidebar user-card that links to /profile via {@link SafeLink}, so
 * clicking from the profile route still produces an observable URL
 * change (fragment append) rather than a no-op navigation.
 *
 * `compact` renders the initials avatar only (44px tap target) — used in
 * the mobile top bar where the name/email block would crowd out the
 * hamburger and theme toggle at 390px.
 */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const name = user?.name || user?.email || t('userMenu.guest', {}, { defaultValue: 'Guest' })
  const initials = String(name).slice(0, 2).toUpperCase()

  if (compact) {
    return (
      <SafeLink
        to="/profile"
        aria-label={t('userMenu.open', {}, { defaultValue: 'Open account profile' })}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-11 h-11 rounded-full hover:bg-surface-container transition-colors shrink-0',
        )}
      >
        <span
          className={cm.cn(
            'w-8 h-8 rounded-full inline-flex items-center justify-center text-[11px] font-bold uppercase text-white',
          )}
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(135deg, var(--color-chart-primary), var(--color-brand-accent))',
          }}
        >
          {initials}
        </span>
      </SafeLink>
    )
  }

  return (
    <SafeLink
      to="/profile"
      aria-label={t('userMenu.open', {}, { defaultValue: 'Open account profile' })}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.w('full'),
        'rounded-md hover:bg-surface-container transition-colors text-left',
      )}
    >
      <span
        className={cm.cn(
          'w-8 h-8 rounded-full inline-flex items-center justify-center text-[11px] font-bold uppercase text-white shrink-0',
        )}
        // chart-primary (violet in both modes) keeps the white initials readable —
        // primary-container flips to a pale tint in light mode (white-on-#dcfce7).
        style={{
          background:
            'linear-gradient(135deg, var(--color-chart-primary), var(--color-brand-accent))',
        }}
        aria-hidden="true"
      >
        {initials}
      </span>
      <span className={cm.cn('flex-1 min-w-0')}>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-on-surface truncate block',
          )}
        >
          {name}
        </span>
        {user?.email ? (
          <span className={cm.cn('text-[11px] text-on-surface-variant truncate block')}>
            {user.email}
          </span>
        ) : null}
      </span>
    </SafeLink>
  )
}
