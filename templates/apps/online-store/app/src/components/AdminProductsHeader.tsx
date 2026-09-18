import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { avatarUrl } from '../utils/avatar.js'

interface Props {
  searchQuery: string
  onSearch: (q: string) => void
}
function AdminProductsHeader({ searchQuery, onSearch }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth() as { user?: { name?: string; email?: string } }
  const [, setNotificationsOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.h(16),
        'fixed top-0 right-0 left-[260px] border-b border-border bg-surface/80 backdrop-blur-md z-40',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.flex1)}>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('semibold'),
            'text-foreground tracking-tight',
          )}
        >
          {t('adminProductsHeader.title', {}, { defaultValue: 'Products' })}
        </h1>
        {/* Search Bar (on_left) */}
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), cm.sp('ml', 4), 'relative')}>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
            )}
            data-icon="search"
          >
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500 transition-all',
            )}
            placeholder={t(
              'adminProductsHeader.searchHint',
              {},
              { defaultValue: 'Search products...' },
            )}
            type="text"
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <button
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(
            cm.sp('p', 2),
            cm.cursorPointer,
            'rounded-lg relative text-foreground-secondary hover:text-success transition-colors',
          )}
          onClick={() => setNotificationsOpen((v) => !v)}
        >
          <span
            className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
            data-icon="notifications"
          >
            notifications
          </span>
          <span
            className={cm.cn(
              cm.roundedFull,
              cm.w(2),
              cm.h(2),
              'absolute top-1 right-1.5 bg-red-500 border-2 border-surface',
            )}
          />
        </button>
        <button
          aria-label={t('nav.profile', {}, { defaultValue: 'Profile' })}
          className={cm.cn(cm.sp('p', 1), cm.cursorPointer, 'rounded-lg')}
          onClick={() => navigate('/admin/settings')}
        >
          <img
            alt={t('adminProductsHeader.userAvatarDescription', {}, { defaultValue: 'User' })}
            className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'border border-border')}
            src={avatarUrl(user?.name || user?.email)}
          />
        </button>
      </div>
    </header>
  )
}
export default AdminProductsHeader
export { AdminProductsHeader }
