import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PasswordStrengthMeter } from './PasswordStrengthMeter.js'

export type VaultCategoryId = 'login' | 'card' | 'identity' | 'note' | 'api' | 'wifi'

export interface VaultItem {
  id: string
  name: string
  username: string
  category: VaultCategoryId
  /** Strength segments 1-4. Use null for items where strength is N/A (cards, notes). */
  strength: 1 | 2 | 3 | 4 | null
  shared: boolean
  /** Whether the user starred this item — surfaced as a row marker + the Favorites filter. */
  favorite: boolean
  lastUsed: string
  /** Optional 1-2 letter favicon initials. */
  initials?: string
  /** Optional Material icon name to render in the favicon tile (overrides initials). */
  icon?: string
  /** When true, the row is rendered with a soft red wash (weak/breached). */
  weakHighlight?: boolean
}

interface VaultItemRowProps {
  item: VaultItem
}

const CATEGORY_BADGE: Record<
  VaultCategoryId,
  { label: string; bg: string; text: string; dot: string }
> = {
  login: { label: 'Login', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-primary' },
  card: { label: 'Credit Card', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  identity: {
    label: 'Identity',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-600',
  },
  note: {
    label: 'Secure Note',
    bg: 'bg-success-light',
    text: 'text-success',
    dot: 'bg-emerald-500',
  },
  api: { label: 'API Key', bg: 'bg-warning-light', text: 'text-warning', dot: 'bg-amber-500' },
  wifi: { label: 'Wi-Fi', bg: 'bg-surface-secondary', text: 'text-foreground', dot: 'bg-gray-500' },
}

const FAVICON_BG: Record<VaultCategoryId, string> = {
  login: 'bg-surface-container text-on-surface',
  card: 'bg-blue-50 text-blue-600',
  identity: 'bg-purple-50 text-purple-600',
  note: 'bg-success-light text-success',
  api: 'bg-warning-light text-warning',
  wifi: 'bg-surface-secondary text-foreground-secondary',
}

/**
 * One vault item rendered as a clickable row on the Vault list.
 * Favicon tile (initials or icon) → name + truncated username (mono) →
 * category pill with coloured dot → strength meter → shared icon →
 * last-used relative timestamp → overflow trigger.
 *
 * Translated from personal-finance's TransactionRow editorial rhythm
 * + crm/ContactRow's pill+meter combo, recoloured for Sigil categories.
 */
export function VaultItemRow({ item }: VaultItemRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const badge = CATEGORY_BADGE[item.category]
  const faviconBg = FAVICON_BG[item.category]

  return (
    <button
      type="button"
      onClick={() => navigate(`/vault/${item.id}`)}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'lg' }),
        cm.sp('p', 4),
        cm.w('full'),
        cm.cursorPointer,
        item.weakHighlight
          ? 'bg-error-light/40 hover:bg-error-light/70 border border-transparent hover:border-red-100'
          : 'bg-transparent hover:bg-surface-container-lowest border border-transparent hover:border-surface-container hover:shadow-sm',
        'rounded-xl transition-all group text-left',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.fontWeight('bold'),
          cm.textSize('sm'),
          'w-9 h-9 rounded-lg flex-shrink-0',
          faviconBg,
        )}
        aria-hidden="true"
      >
        {item.icon ? (
          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
        ) : (
          <span>{item.initials ?? item.name.slice(0, 1).toUpperCase()}</span>
        )}
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
          {item.favorite && (
            <span
              className="material-symbols-outlined text-[14px] text-warning flex-shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-label={t('vaultItemRow.favorite', {}, { defaultValue: 'Favorite' })}
            >
              star
            </span>
          )}
          <span
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'text-on-surface truncate',
            )}
          >
            {item.name}
          </span>
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono truncate')}>
          {item.username}
        </span>
      </div>

      <span
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 2),
          cm.fontWeight('medium'),
          cm.textSize('xs'),
          'rounded-md py-0.5',
          badge.bg,
          badge.text,
        )}
      >
        <span className={cm.cn('w-1.5 h-1.5 rounded-full', badge.dot)} aria-hidden="true" />
        {t(`vaultItemRow.category.${item.category}`, {}, { defaultValue: badge.label })}
      </span>

      <div className={cm.cn('w-[100px] flex justify-start')}>
        {item.strength !== null ? (
          <PasswordStrengthMeter segments={item.strength} width="sm" label="" />
        ) : (
          <span className="text-[10px] text-on-surface-variant">
            {t('vaultItemRow.strengthNotApplicable', {}, { defaultValue: 'N/A' })}
          </span>
        )}
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), 'w-6')}>
        {item.shared && (
          <span
            className="material-symbols-outlined text-[16px] text-on-surface-variant/60"
            aria-label={t('vaultItemRow.shared', {}, { defaultValue: 'Shared' })}
          >
            group
          </span>
        )}
      </div>

      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant text-right w-20')}>
        {item.lastUsed}
      </span>

      <span
        className={cm.cn(
          'material-symbols-outlined text-[18px] text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors',
        )}
        aria-hidden="true"
      >
        chevron_right
      </span>
    </button>
  )
}

export default VaultItemRow
