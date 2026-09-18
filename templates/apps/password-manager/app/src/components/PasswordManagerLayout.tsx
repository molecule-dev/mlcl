import { useMemo } from 'react'
import { Outlet } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import { useSecurityFindings, useVaultItems } from '../lib/api.js'
import { type VaultCategory, type VaultFolder, VaultSidebar } from './VaultSidebar.js'

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

/**
 * Authenticated shell — left vault sidebar + main outlet on a soft
 * indigo wash background. Used by every signed-in route.
 *
 * Sidebar category counts and the "Vault secured" ring read from the
 * live items + findings APIs so they stay in sync with the user's
 * actual vault content.
 */
export function PasswordManagerLayout() {
  const cm = getClassMap()
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

  return (
    <div
      className={cm.cn(
        cm.flex({}),
        cm.minH('screen'),
        'bg-surface-container-low/40 text-on-surface antialiased',
      )}
    >
      <VaultSidebar
        categories={categories}
        folders={DEFAULT_FOLDERS}
        vaultStrength={vaultStrength}
      />
      <main className={cm.cn(cm.flex1, 'min-w-0')}>
        <Outlet />
      </main>
    </div>
  )
}

export default PasswordManagerLayout
