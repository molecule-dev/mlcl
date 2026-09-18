import { Link, useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
export default function SearchPageBottomNavBar() {
  const navigate = useNavigate()
  const { user } = useAuth<{ id?: string }>()
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <nav
      className={cm.cn(
        cm.flex({ justify: 'around', align: 'center' }),
        cm.h(16),
        'md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-md pb-safe border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)]',
      )}
      data-mol-id="mobile-nav"
    >
      <Link
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.fontWeight('semibold'),
          'text-success',
        )}
        data-mol-id="mobile-search"
        to="/"
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          search
        </span>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] mt-0.5')}>
          {t('common.search', {}, { defaultValue: 'Search' })}
        </span>
      </Link>
      <Link
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          'text-foreground-secondary',
        )}
        data-mol-id="mobile-saved"
        to="/saved"
      >
        <span className={cm.cn('material-symbols-outlined')}>favorite</span>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] mt-0.5')}>
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </span>
      </Link>
      <button
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          'text-foreground-secondary',
        )}
        data-mol-id="mobile-trips"
        onClick={() => navigate('/help')}
      >
        <span className={cm.cn('material-symbols-outlined')}>help</span>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] mt-0.5')}>
          {t('nav.help', {}, { defaultValue: 'Help' })}
        </span>
      </button>
      <Link
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          'text-foreground-secondary',
        )}
        data-mol-id="mobile-profile"
        to={user?.id ? `/agent/${user.id}` : '/'}
      >
        <span className={cm.cn('material-symbols-outlined')}>person</span>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] mt-0.5')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </span>
      </Link>
    </nav>
  )
}
export { SearchPageBottomNavBar }
