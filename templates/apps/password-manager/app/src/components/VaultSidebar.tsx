import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

export interface VaultCategory {
  id: string
  labelKey: string
  defaultLabel: string
  count: number
  /** Tailwind text color class for the dot (e.g. 'bg-primary'). */
  dotClass: string
}

export interface VaultFolder {
  id: string
  labelKey: string
  defaultLabel: string
}

interface VaultSidebarProps {
  categories: VaultCategory[]
  folders: VaultFolder[]
  /** Vault strength score 0-100 shown in the secured-status pill. */
  vaultStrength: number
}

/**
 * Sigil's signature left-rail navigation — diamond brand mark, vault
 * search, primary nav (All Items / Favorites / Recently Used / Trash),
 * categories with colored dots and counts, folders, and an emerald
 * "Vault secured" status footer with circular ring.
 *
 * Translated from personal-finance's SideNavBar (catalog §1.3) +
 * email-client's MeridianMailSidebar three-pane shell, recoloured for
 * Sigil's indigo/emerald crystalline brand.
 */
export function VaultSidebar({ categories, folders, vaultStrength }: VaultSidebarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('search') ?? '')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const path = location.pathname

  // keep input in sync when the URL search param changes (e.g. clearing it on /vault)
  useEffect(() => {
    if (path === '/vault') {
      setQuery(searchParams.get('search') ?? '')
    }
  }, [searchParams, path])

  // ⌘K / Ctrl+K focuses the vault search — this backs the shortcut hint
  // rendered inside the search field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const isActive = (to: string) => path === to || path.startsWith(`${to}/`)

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const next = query.trim()
    navigate(next ? `/vault?search=${encodeURIComponent(next)}` : '/vault')
  }

  const navLink = (to: string, icon: string, labelKey: string, defaultLabel: string) => {
    const active = isActive(to)
    return (
      <Link
        key={to}
        to={to}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          active
            ? 'bg-primary-light text-primary-dark rounded-lg'
            : 'text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors',
        )}
      >
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')} aria-hidden="true">
          {icon}
        </span>
        {t(labelKey, {}, { defaultValue: defaultLabel })}
      </Link>
    )
  }

  const ringPct = Math.max(0, Math.min(100, vaultStrength))
  const ringDash = `${ringPct}, 100`

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.h('screen'),
        'w-[260px] flex-shrink-0 bg-surface border-r border-primary-light/40 sticky top-0 z-20',
      )}
      aria-label={t('vaultSidebar.aria', {}, { defaultValue: 'Vault navigation' })}
    >
      <div
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.flex1,
          'min-h-0 overflow-y-auto',
        )}
      >
        <Link
          to="/vault"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.fontWeight('bold'),
            'text-[22px] tracking-tight text-primary',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            diamond
          </span>
          <span className="font-extrabold tracking-tighter">{APP_NAME}</span>
        </Link>

        <form
          onSubmit={submitSearch}
          className={cm.cn('relative')}
          role="search"
          data-testid="vault-search-form"
        >
          <span
            className={cm.cn(
              cm.textSize('lg'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'vaultSidebar.searchPlaceholder',
              {},
              { defaultValue: 'Search vault...' },
            )}
            aria-label={t('vaultSidebar.searchAria', {}, { defaultValue: 'Search vault' })}
            data-testid="vault-search-input"
            className={cm.cn(
              cm.w('full'),
              cm.sp('py', 2),
              cm.sp('pl', 10),
              cm.sp('pr', 12),
              cm.textSize('sm'),
              'bg-surface-container-low border border-primary-light/40 rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
            )}
          />
          <span
            className={cm.cn(
              'absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-on-surface-variant bg-surface px-1.5 py-0.5 rounded border border-primary-light/40',
            )}
            aria-hidden="true"
          >
            ⌘K
          </span>
        </form>

        <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          {navLink('/vault', 'inventory_2', 'vaultSidebar.allItems', 'All Items')}
          {navLink('/security', 'health_and_safety', 'vaultSidebar.security', 'Security Report')}
          {navLink('/shared', 'group', 'vaultSidebar.shared', 'Shared Vaults')}
          {navLink('/generator', 'vpn_key', 'vaultSidebar.generator', 'Generator')}
          {navLink(
            '/notifications',
            'notifications',
            'vaultSidebar.notifications',
            'Notifications',
          )}
          {navLink('/trash', 'delete', 'vaultSidebar.trash', 'Trash')}
        </nav>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <div
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('mb', 1),
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('vaultSidebar.categoriesHeading', {}, { defaultValue: 'Categories' })}
          </div>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/vault?category=${cat.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                'text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors group',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                <span className={cm.cn('w-2 h-2 rounded-full', cat.dotClass)} aria-hidden="true" />
                {t(cat.labelKey, {}, { defaultValue: cat.defaultLabel })}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant/70')}>
                {cat.count}
              </span>
            </Link>
          ))}
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <div
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('mb', 1),
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('vaultSidebar.foldersHeading', {}, { defaultValue: 'Folders' })}
          </div>
          {folders.map((f) => (
            <Link
              key={f.id}
              to={`/vault?folder=${f.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                'text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors',
              )}
            >
              <span
                className={cm.cn(
                  'material-symbols-outlined text-[16px] text-on-surface-variant/70',
                )}
                aria-hidden="true"
              >
                folder
              </span>
              {t(f.labelKey, {}, { defaultValue: f.defaultLabel })}
            </Link>
          ))}
        </div>
      </div>

      <div className={cm.cn(cm.sp('p', 4), 'border-t border-primary-light/40')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('p', 3),
            'bg-surface-container-low rounded-lg',
          )}
        >
          <div className={cm.cn('relative w-8 h-8')}>
            <svg className={cm.cn('w-8 h-8 -rotate-90')} viewBox="0 0 36 36" aria-hidden="true">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-primary-light"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={ringDash}
                className="text-success"
              />
            </svg>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute inset-0 flex items-center justify-center text-success text-[14px]',
              )}
              aria-hidden="true"
            >
              shield
            </span>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
            <span
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {t('vaultSidebar.secured', {}, { defaultValue: 'Vault secured' })}
            </span>
            <span className={cm.cn('text-[10px] text-on-surface-variant')}>
              {t(
                'vaultSidebar.strength',
                { strength: vaultStrength },
                { defaultValue: 'Overall strength {{strength}}%' },
              )}
            </span>
          </div>
          <UserMenu />
        </div>
      </div>
    </aside>
  )
}

export default VaultSidebar
