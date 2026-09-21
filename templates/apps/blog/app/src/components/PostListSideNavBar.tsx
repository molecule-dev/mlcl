import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from './SafeLink.js'

interface CurrentUser {
  id?: string
  email?: string
  name?: string
  planKey?: string
}

function PostListSideNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout, user } = useAuth()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<CurrentUser | null>(null)
  useEffect(() => {
    const userId = (user as { id?: string } | null)?.id
    if (!userId) return
    void http
      .get<CurrentUser>(`/api/users/${userId}`)
      .then((res) => setProfile(res?.data ?? null))
      .catch(() => undefined)
  }, [http, user])
  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }
  const displayName =
    profile?.name?.trim() ||
    profile?.email?.trim() ||
    (user as { email?: string } | null)?.email ||
    t('nav.editor', {}, { defaultValue: 'Editor' })
  const planLabel = profile?.planKey
    ? t('postListSideNavBar.userPlan', { plan: profile.planKey }, { defaultValue: '{{plan}}' })
    : t('nav.free', {}, { defaultValue: 'Free' })
  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        cm.sp('p', 6),
        // Mobile renders MobileTopBar instead — the fixed 240px rail would
        // crush a phone's content column.
        'fixed left-0 top-0 w-[240px] bg-surface-container-low z-50 hidden md:flex',
      )}
    >
      <div className={cm.cn(cm.sp('mb', 10), cm.flex({ align: 'center', gap: 'sm' }))}>
        <span
          className={cm.cn(cm.textSize('2xl'), 'font-headline font-black text-primary-container')}
        >
          {t('postListSideNavBar.appName', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
        </span>
      </div>
      <nav className={cm.cn(cm.flex1, cm.stack(1))}>
        <div
          className={cm.cn(
            cm.fontWeight('medium'),
            cm.sp('mb', 4),
            cm.sp('px', 2),
            'font-sans text-[10px] uppercase tracking-[0.15em] text-on-surface-variant',
          )}
        >
          {t('postListSideNavBar.mainNavigation', {}, { defaultValue: 'Main Navigation' })}
        </div>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 transition-all duration-300 text-on-surface-variant hover:text-primary-container hover:bg-surface/50 rounded-lg',
          )}
          to="/dashboard"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>dashboard</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label tracking-wider uppercase',
            )}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 transition-all duration-300 bg-surface-container-lowest text-primary-container shadow-sm rounded-lg',
          )}
          to="/posts"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>description</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label tracking-wider uppercase',
            )}
          >
            {t('postListSideNavBar.myPosts', {}, { defaultValue: 'My Posts' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 transition-all duration-300 text-on-surface-variant hover:text-primary-container hover:bg-surface/50 rounded-lg',
          )}
          to="/tags"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>category</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label tracking-wider uppercase',
            )}
          >
            {t('postListSideNavBar.categories', {}, { defaultValue: 'Categories' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 transition-all duration-300 text-on-surface-variant hover:text-primary-container hover:bg-surface/50 rounded-lg',
          )}
          to="/analytics"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>analytics</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label tracking-wider uppercase',
            )}
          >
            {t('nav.analytics', {}, { defaultValue: 'Analytics' })}
          </span>
        </SafeLink>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            'py-2.5 transition-all duration-300 text-on-surface-variant hover:text-primary-container hover:bg-surface/50 rounded-lg',
          )}
          to="/settings"
        >
          <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>settings</span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'font-label tracking-wider uppercase',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </span>
        </SafeLink>
      </nav>
      <div className={cm.cn(cm.sp('pt', 4), 'mt-auto border-t border-outline-variant/10')}>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 6), cm.sp('px', 2))}
        >
          <div
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'overflow-hidden bg-primary text-on-primary font-bold',
            )}
            aria-hidden="true"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className={cm.flex({ direction: 'col' })}>
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}>
              {displayName}
            </span>
            <span className={cm.fvad8194f2}>{planLabel}</span>
          </div>
        </div>
        <SafeLink
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'transition-all duration-300 text-on-surface-variant opacity-80 hover:text-primary-container hover:bg-surface/50 rounded-lg',
          )}
          to="/settings"
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
            account_circle
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'font-label tracking-wider uppercase',
            )}
          >
            {t('nav.profile', {}, { defaultValue: 'Profile' })}
          </span>
        </SafeLink>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.w('full'),
            'transition-all duration-300 text-on-surface-variant opacity-80 hover:text-error hover:bg-error-container/20 rounded-lg',
          )}
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          onClick={() => void handleSignOut()}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>logout</span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'font-label tracking-wider uppercase',
            )}
          >
            {t('common.logout', {}, { defaultValue: 'Logout' })}
          </span>
        </button>
      </div>
    </aside>
  )
}

export default PostListSideNavBar
export { PostListSideNavBar }
