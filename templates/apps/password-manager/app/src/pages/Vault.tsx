import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { VaultHeroCard } from '../components/VaultHeroCard.js'
import { type VaultItem, VaultItemRow } from '../components/VaultItemRow.js'
import { useSecurityFindings, useVaultItems, type VaultItemSummary } from '../lib/api.js'
import { matchesVaultFilter, type VaultFilterId } from '../lib/vaultFilters.js'

const FILTERS: { id: VaultFilterId; labelKey: string; defaultLabel: string }[] = [
  { id: 'all', labelKey: 'vault.filter.all', defaultLabel: 'All' },
  { id: 'weak', labelKey: 'vault.filter.weak', defaultLabel: 'Weak' },
  { id: 'reused', labelKey: 'vault.filter.reused', defaultLabel: 'Reused' },
  { id: 'shared', labelKey: 'vault.filter.shared', defaultLabel: 'Shared' },
  { id: 'favorite', labelKey: 'vault.filter.favorite', defaultLabel: 'Favorites' },
]

function categoryFromType(t: string): VaultItem['category'] {
  if (t === 'card') return 'card'
  if (t === 'identity') return 'identity'
  if (t === 'note') return 'note'
  if (t === 'api_key') return 'api'
  if (t === 'ssh_key') return 'api'
  if (t === 'wifi') return 'wifi'
  return 'login'
}

function initialsOf(name: string): string {
  const parts = name.split(/[\s./-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase()
  return '??'
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function Vault() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<VaultFilterId>('all')
  const [refreshKey] = useState(0)

  const categoryParam = searchParams.get('category')
  const folderParam = (searchParams.get('folder') ?? '').trim()
  const searchParam = (searchParams.get('search') ?? '').trim()
  const items = useVaultItems(
    {
      type:
        categoryParam === 'card'
          ? 'card'
          : categoryParam === 'identity'
            ? 'identity'
            : categoryParam === 'note'
              ? 'note'
              : categoryParam === 'api'
                ? 'api_key,ssh_key'
                : categoryParam === 'wifi'
                  ? 'wifi'
                  : categoryParam === 'login'
                    ? 'login'
                    : undefined,
      folder: folderParam || undefined,
      is_trashed: false,
      search: searchParam || undefined,
    },
    refreshKey,
  )
  const findings = useSecurityFindings(refreshKey)

  const findingsByItem = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const f of findings.data) {
      if (!f.item_id) continue
      const set = map.get(f.item_id) ?? new Set<string>()
      set.add(f.kind)
      map.set(f.item_id, set)
    }
    return map
  }, [findings.data])

  const visible: VaultItem[] = useMemo(() => {
    return items.data
      .map((it: VaultItemSummary): VaultItem & { _kinds: Set<string> } => {
        const kinds = findingsByItem.get(it.id) ?? new Set<string>()
        const isWeak = kinds.has('weak')
        const isReused = kinds.has('reused')
        // Strength: 1 if weak finding, 2 if reused, 4 otherwise
        const strength: 1 | 2 | 3 | 4 | null =
          it.type === 'card' || it.type === 'identity' || it.type === 'note'
            ? null
            : isWeak
              ? 1
              : isReused
                ? 2
                : 4
        return {
          id: it.id,
          name: it.name,
          username: it.username ?? '',
          category: categoryFromType(it.type),
          strength,
          shared: false,
          favorite: it.favorite,
          lastUsed: relativeTime(it.updated_at),
          initials: initialsOf(it.name),
          icon: it.icon ?? undefined,
          weakHighlight: isWeak,
          _kinds: kinds,
        }
      })
      .filter((row) =>
        matchesVaultFilter(
          {
            strength: row.strength,
            weak: Boolean(row.weakHighlight),
            reused: row._kinds.has('reused'),
            shared: row.shared,
            favorite: row.favorite,
          },
          filter,
        ),
      )
  }, [items.data, findingsByItem, filter])

  const counts = useMemo(() => {
    const all = items.data.length
    const weakIds = new Set<string>()
    const reusedIds = new Set<string>()
    for (const f of findings.data) {
      if (!f.item_id || f.dismissed) continue
      if (f.kind === 'weak') weakIds.add(f.item_id)
      if (f.kind === 'reused') reusedIds.add(f.item_id)
    }
    const favorite = items.data.filter((it) => it.favorite).length
    return { all, weak: weakIds.size, reused: reusedIds.size, shared: 0, favorite }
  }, [items.data, findings.data])

  const strengthScore = useMemo(() => {
    if (counts.all === 0) return 100
    const flagged = counts.weak + counts.reused
    return Math.max(0, Math.min(100, Math.round(100 - (flagged / counts.all) * 100)))
  }, [counts])

  return (
    <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', gap: 'xl' }))}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-primary-dark',
            )}
          >
            {t('vault.eyebrow', {}, { defaultValue: 'Vault' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('vault.heading', {}, { defaultValue: 'All items' })}
            <span
              data-testid="vault-total-count"
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('normal'),
                'text-on-surface-variant ml-2',
              )}
            >
              · {counts.all}
            </span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/vault/new')}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            add
          </span>
          {t('vault.newItem', {}, { defaultValue: 'New item' })}
        </button>
      </header>

      <VaultHeroCard
        itemCount={counts.all}
        strengthScore={strengthScore}
        syncedLabel={t(
          'vault.syncedLabel',
          { count: counts.all },
          { defaultValue: '{{count}} items · vault sync up to date' },
        )}
      />

      <section
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {FILTERS.map((pill) => {
            const active = filter === pill.id
            const count = counts[pill.id] ?? 0
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilter(pill.id)}
                data-testid={`vault-filter-${pill.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('xs'),
                  'rounded-full py-1.5 transition-colors',
                  active
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-primary-light/40 text-on-surface-variant hover:border-primary',
                )}
              >
                {t(pill.labelKey, {}, { defaultValue: pill.defaultLabel })}
                <span
                  className={cm.cn(
                    'rounded-full text-[10px] px-1.5',
                    active
                      ? 'bg-surface/20 text-white'
                      : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            sort
          </span>
          {t('vault.sortBy', {}, { defaultValue: 'Sort by: Last used' })}
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col', gap: 'xs' }),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-on-surface-variant border-b border-surface-container',
          )}
        >
          <span className={cm.cn('w-9')} aria-hidden="true" />
          <span className={cm.cn(cm.flex1)}>
            {t('vault.col.item', {}, { defaultValue: 'Item' })}
          </span>
          <span className={cm.cn('w-[120px]')}>
            {t('form.category', {}, { defaultValue: 'Category' })}
          </span>
          <span className={cm.cn('w-[100px]')}>
            {t('vault.col.strength', {}, { defaultValue: 'Strength' })}
          </span>
          <span className={cm.cn('w-6 text-center')}>
            {t('vault.col.shared', {}, { defaultValue: '' })}
          </span>
          <span className={cm.cn('w-20 text-right')}>
            {t('vault.col.lastUsed', {}, { defaultValue: 'Last Used' })}
          </span>
          <span className={cm.cn('w-[18px]')} aria-hidden="true" />
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))} data-testid="vault-list">
          {items.loading ? (
            <p
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('vault.loading', {}, { defaultValue: 'Loading vault…' })}
            </p>
          ) : visible.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              )}
              data-testid="vault-empty"
            >
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {counts.all === 0
                  ? t(
                      'vault.emptyAll',
                      {},
                      { defaultValue: 'Your vault is empty. Add your first item.' },
                    )
                  : t('vault.empty', {}, { defaultValue: 'No items match this filter.' })}
              </p>
              {counts.all === 0 && (
                <Link
                  to="/vault/new"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 4),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors',
                  )}
                >
                  {t('vault.empty.add', {}, { defaultValue: 'Add an item' })}
                </Link>
              )}
            </div>
          ) : (
            visible.map((it) => (
              <div key={it.id} data-testid={`vault-item-row-${it.id}`}>
                <VaultItemRow item={it} />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default Vault
