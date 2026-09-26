import { useMemo } from 'react'
import { Link, Outlet } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { useSecurityFindings, useVaultItems } from '../lib/api.js'
import { UserMenu } from './UserMenu.js'
import {
  type VaultCategory,
  type VaultFolder,
  VaultSidebarContent,
  VaultSidebarFooter,
} from './VaultSidebar.js'

const CATEGORY_DEFS: {
  id: VaultCategory['id']
  labelKey: string
  defaultLabel: string
  dotClass: string
  matchTypes: string[]
}[] = [
  {
    id: 'login',
    labelKey: 'vaultSidebar.cat.login',
    defaultLabel: 'Logins',
    dotClass: 'bg-primary',
    matchTypes: ['login'],
  },
  {
    id: 'card',
    labelKey: 'vaultSidebar.cat.card',
    defaultLabel: 'Credit Cards',
    dotClass: 'bg-cyan-500',
    matchTypes: ['card'],
  },
  {
    id: 'identity',
    labelKey: 'vaultSidebar.cat.identity',
    defaultLabel: 'Identities',
    dotClass: 'bg-purple-600',
    matchTypes: ['identity'],
  },
  {
    id: 'note',
    labelKey: 'vaultSidebar.cat.note',
    defaultLabel: 'Secure Notes',
    dotClass: 'bg-emerald-500',
    matchTypes: ['note'],
  },
  {
    id: 'api',
    labelKey: 'vaultSidebar.cat.api',
    defaultLabel: 'API Keys',
    dotClass: 'bg-amber-500',
    matchTypes: ['api_key', 'ssh_key'],
  },
  {
    id: 'wifi',
    labelKey: 'vaultSidebar.cat.wifi',
    defaultLabel: 'Wi-Fi',
    dotClass: 'bg-gray-500',
    matchTypes: ['wifi'],
  },
]

const DEFAULT_FOLDERS: VaultFolder[] = [
  { id: 'personal', labelKey: 'vaultSidebar.folder.personal', defaultLabel: 'Personal' },
  { id: 'work', labelKey: 'vaultSidebar.folder.work', defaultLabel: 'Work' },
  { id: 'family', labelKey: 'vaultSidebar.folder.family', defaultLabel: 'Family' },
]

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/** The diamond brand mark as a /vault link — the mobile TopBar's brand slot. */
function BrandLink() {
  const cm = getClassMap()
  return (
    <Link
      to="/vault"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.fontWeight('bold'),
        'text-primary min-w-0 h-11',
        FOCUS_RING.concat(' rounded-md'),
      )}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        diamond
      </span>
      <span className="font-extrabold tracking-tighter text-[18px]">{APP_NAME}</span>
    </Link>
  )
}

/** Compact "Vault secured" strength pill — the mobile TopBar's status chip. */
function StrengthPill({ vaultStrength }: { vaultStrength: number }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 2),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'shrink-0 rounded-full py-1 bg-success-light text-success',
      )}
      title={t(
        'vaultSidebar.strength',
        { strength: vaultStrength },
        { defaultValue: 'Overall strength {{strength}}%' },
      )}
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        shield
      </span>
      {vaultStrength}%
    </span>
  )
}

/**
 * Authenticated shell — the shared `ResponsiveAppShell`: a mobile-only top
 * bar (brand + strength pill + user menu; it renders the drawer menu trigger
 * itself), the desktop vault sidebar (≥768px), the same nav inventory as a
 * dialog drawer below it, and one content column. The shell owns the drawer
 * open state, the APG dialog contract (focus trap, Escape, backdrop),
 * scroll lock and close-on-navigation; pages keep their own padding inside
 * the `<main>` landmark.
 *
 * Sidebar category counts and the "Vault secured" ring read from the
 * live items + findings APIs so they stay in sync with the user's
 * actual vault content.
 */
export function PasswordManagerLayout() {
  const { t } = useTranslation()
  const items = useVaultItems({ is_trashed: false })
  const findings = useSecurityFindings()

  const categories = useMemo<VaultCategory[]>(() => {
    const counts = new Map<string, number>()
    for (const it of items.data) {
      counts.set(it.type, (counts.get(it.type) ?? 0) + 1)
    }
    return CATEGORY_DEFS.map((def) => ({
      id: def.id,
      labelKey: def.labelKey,
      defaultLabel: def.defaultLabel,
      dotClass: def.dotClass,
      count: def.matchTypes.reduce((sum, t) => sum + (counts.get(t) ?? 0), 0),
    }))
  }, [items.data])

  const vaultStrength = useMemo(() => {
    const total = items.data.length
    if (total === 0) return 100
    const flagged = new Set(
      findings.data.filter((f) => !f.dismissed && f.item_id).map((f) => f.item_id as string),
    ).size
    return Math.max(0, Math.min(100, Math.round(100 - (flagged / total) * 100)))
  }, [items.data, findings.data])

  const navLabel = t('vaultSidebar.aria', {}, { defaultValue: 'Vault navigation' })

  // The SAME nav element feeds both breakpoint slots — the sidebar is
  // unmounted below 768px and the drawer above it, so only the mounted
  // breakpoint's copy ever instantiates (no duplicate landmarks).
  const vaultNav = <VaultSidebarContent categories={categories} folders={DEFAULT_FOLDERS} />

  return (
    <ResponsiveAppShell
      sidebarWidth={260}
      className="bg-surface-container-low/40 text-on-surface antialiased"
    >
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={<BrandLink />}
        actions={
          <>
            <StrengthPill vaultStrength={vaultStrength} />
            <UserMenu />
          </>
        }
        className="border-primary-light/40 bg-surface/95 backdrop-blur-md"
      />
      <ResponsiveAppShell.Sidebar
        navLabel={navLabel}
        className="border-primary-light/40"
        footer={<VaultSidebarFooter vaultStrength={vaultStrength} />}
      >
        {vaultNav}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer
        navLabel={navLabel}
        className="border-r border-primary-light/40 shadow-xl"
      >
        {vaultNav}
      </ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content>
        <Outlet />
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}

export default PasswordManagerLayout
