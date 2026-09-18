import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter.js'
import { useItemDetail } from '../lib/api.js'
import { itemTypeLabel } from '../lib/itemTypeLabel.js'

function strengthFromPassword(pw: string | null): 1 | 2 | 3 | 4 | null {
  if (!pw) return null
  if (pw.length >= 16) return 4
  if (pw.length >= 12) return 3
  if (pw.length >= 8) return 2
  return 1
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch (_error) {
    // invalid date string — return original as fallback
    return iso
  }
}

export function ItemDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [revealed, setRevealed] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { item, loading, error: fetchError } = useItemDetail(id, refreshKey)

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch (_error) {
      // clipboard API unavailable in non-secure contexts; copy failure is non-fatal
    }
  }

  const trashItem = async () => {
    if (!id) return
    if (!confirm(t('itemDetail.confirmTrash', {}, { defaultValue: 'Move this item to trash?' })))
      return
    setDeleting(true)
    setError(null)
    try {
      await http.post(`/api/items/${id}/trash`)
      navigate('/vault', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to trash item'
      setError(message)
      setDeleting(false)
    }
  }

  const togglePinned = async () => {
    if (!item) return
    try {
      await http.post(`/api/items/${item.id}/favorite`)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update item'
      setError(message)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.maxW('4xl'), 'mx-auto')}>
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-testid="item-detail-loading"
        >
          {t('itemDetail.loading', {}, { defaultValue: 'Loading item…' })}
        </p>
      </div>
    )
  }

  if (fetchError || !item) {
    return (
      <div
        className={cm.cn(
          cm.sp('p', 8),
          cm.maxW('4xl'),
          'mx-auto',
          cm.flex({ direction: 'col', gap: 'sm' }),
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} data-testid="item-detail-error">
          {fetchError ?? t('itemDetail.notFound', {}, { defaultValue: 'Item not found.' })}
        </p>
        <Link to="/vault" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('itemDetail.backToVault', {}, { defaultValue: 'Back to vault' })}
        </Link>
      </div>
    )
  }

  const password = item.password ?? ''
  const strength = strengthFromPassword(item.password)
  const category = itemTypeLabel(t, item.type)

  const fieldRow = (label: string, value: string, keyName: string, mono = false) => (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 4),
        'rounded-xl bg-surface-container-low/60 border border-primary-light/20 group',
      )}
      data-testid={`item-detail-field-${keyName}`}
    >
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
        <span
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            mono ? 'font-mono text-on-surface tracking-[0.05em]' : 'text-on-surface',
            'truncate',
          )}
        >
          {value || '—'}
        </span>
      </div>
      {value && (
        <button
          type="button"
          onClick={() => copy(keyName, value)}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            'rounded-md py-1.5 bg-surface border border-primary-light/40 text-primary hover:bg-primary-light transition-colors',
          )}
          data-testid={`item-detail-copy-${keyName}`}
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            {copiedKey === keyName ? 'check' : 'content_copy'}
          </span>
          {copiedKey === keyName
            ? t('common.copied', {}, { defaultValue: 'Copied' })
            : t('common.copy', {}, { defaultValue: 'Copy' })}
        </button>
      )}
    </div>
  )

  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.maxW('4xl'),
        'mx-auto',
      )}
    >
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/vault" className={cm.cn('hover:text-primary transition-colors')}>
          {t('itemDetail.breadcrumb.vault', {}, { defaultValue: 'Vault' })}
        </Link>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          chevron_right
        </span>
        <span className="text-on-surface font-medium" data-testid="item-detail-name">
          {item.name}
        </span>
      </nav>

      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('p', 6),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm flex-wrap gap-4',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              'w-14 h-14 rounded-xl bg-primary-light text-primary-dark text-xl',
            )}
            aria-hidden="true"
          >
            {item.name.slice(0, 2).toUpperCase()}
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                'tracking-tight text-on-surface',
              )}
            >
              {item.name}
            </h1>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 2),
                cm.fontWeight('medium'),
                cm.textSize('xs'),
                'self-start rounded-md py-0.5 bg-primary-light text-primary-dark',
              )}
            >
              <span className={cm.cn('w-1.5 h-1.5 rounded-full bg-primary')} aria-hidden="true" />
              {category}
            </span>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <button
            onClick={togglePinned}
            type="button"
            data-testid="item-detail-favorite"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg py-2 bg-surface border border-primary-light/40 text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {item.favorite ? 'star' : 'star_border'}
            </span>
            {item.favorite
              ? t('itemDetail.unfavorite', {}, { defaultValue: 'Unfavorite' })
              : t('itemDetail.favorite', {}, { defaultValue: 'Favorite' })}
          </button>
          <button
            onClick={trashItem}
            disabled={deleting}
            type="button"
            data-testid="item-detail-trash"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg py-2 bg-error-light border border-red-200/40 text-error hover:bg-error-light transition-colors disabled:opacity-60',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              delete
            </span>
            {deleting
              ? t('itemDetail.deleting', {}, { defaultValue: 'Trashing…' })
              : t('itemDetail.delete', {}, { defaultValue: 'Move to trash' })}
          </button>
        </div>
      </header>

      {error && (
        <p
          className={cm.cn(cm.textSize('xs'), 'text-error')}
          data-testid="item-detail-action-error"
        >
          {error}
        </p>
      )}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'sm' }),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
        )}
      >
        <h2
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            cm.sp('mb', 1),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('itemDetail.credentialsHeading', {}, { defaultValue: 'Credentials' })}
        </h2>
        {fieldRow(
          t('auth.username', {}, { defaultValue: 'Username' }),
          item.username ?? '',
          'username',
          true,
        )}

        {item.password !== null && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              'rounded-xl bg-surface-container-low/60 border border-primary-light/20',
            )}
            data-testid="item-detail-password-row"
          >
            <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
              <span
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.login.password', {}, { defaultValue: 'Password' })}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'font-mono text-on-surface tracking-[0.08em] truncate',
                )}
                data-testid="item-detail-password-value"
              >
                {revealed ? password : '••••••••••••••••••••'}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                data-testid="item-detail-password-toggle"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-md py-1.5 bg-surface border border-primary-light/40 text-primary hover:bg-primary-light transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  {revealed ? 'visibility_off' : 'visibility'}
                </span>
                {revealed
                  ? t('itemDetail.hide', {}, { defaultValue: 'Hide' })
                  : t('itemDetail.reveal', {}, { defaultValue: 'Reveal' })}
              </button>
              <button
                type="button"
                onClick={() => copy('password', password)}
                data-testid="item-detail-password-copy"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-md py-1.5 bg-surface border border-primary-light/40 text-primary hover:bg-primary-light transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  {copiedKey === 'password' ? 'check' : 'content_copy'}
                </span>
                {copiedKey === 'password'
                  ? t('common.copied', {}, { defaultValue: 'Copied' })
                  : t('common.copy', {}, { defaultValue: 'Copy' })}
              </button>
            </div>
          </div>
        )}

        {strength !== null && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg' }),
              cm.sp('p', 4),
              'rounded-xl bg-primary-light/40',
            )}
          >
            <PasswordStrengthMeter segments={strength} width="md" />
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'itemDetail.strengthHint',
                { length: password.length },
                { defaultValue: '{{length}} characters' },
              )}
            </span>
          </div>
        )}

        {fieldRow(t('itemDetail.uri', {}, { defaultValue: 'URI' }), item.url ?? '', 'uri')}
      </section>

      {item.notes && (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
          )}
        >
          <h2
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.notes', {}, { defaultValue: 'Notes' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface leading-relaxed whitespace-pre-line',
            )}
            data-testid="item-detail-notes"
          >
            {item.notes}
          </p>
        </section>
      )}

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg' }),
          cm.textSize('xs'),
          'text-on-surface-variant',
        )}
      >
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            schedule
          </span>
          {t(
            'itemDetail.created',
            { date: formatDate(item.created_at) },
            { defaultValue: 'Created {{date}}' },
          )}
        </span>
        <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            update
          </span>
          {t(
            'itemDetail.modified',
            { date: formatDate(item.updated_at) },
            { defaultValue: 'Updated {{date}}' },
          )}
        </span>
      </footer>
    </div>
  )
}

export default ItemDetail
