import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface VaultDetail {
  id: string
  owner_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data
  }
  return res as T
}

export function SharedVaultDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [vault, setVault] = useState<VaultDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    http
      .get<unknown>(`/api/vaults/${id}`)
      .then((res) => {
        if (cancelled) return
        const data = unwrap<VaultDetail>(res)
        setVault(data)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load vault')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  if (loading) {
    return (
      <div className={cm.cn('p-4 md:p-8', cm.maxW('5xl'), 'mx-auto')}>
        <p
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          data-testid="shared-detail-loading"
        >
          {t('sharedDetail.loading', {}, { defaultValue: 'Loading vault…' })}
        </p>
      </div>
    )
  }

  if (error || !vault) {
    return (
      <div
        className={cm.cn(
          'p-4 md:p-8',
          cm.maxW('5xl'),
          'mx-auto',
          cm.flex({ direction: 'col', gap: 'sm' }),
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} data-testid="shared-detail-error">
          {error ?? t('sharedDetail.notFound', {}, { defaultValue: 'Vault not found.' })}
        </p>
        <Link to="/shared" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('sharedDetail.backToShared', {}, { defaultValue: 'Back to shared vaults' })}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        'p-4 md:p-8',
        cm.flex({ direction: 'col', gap: 'xl' }),
        cm.maxW('5xl'),
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
        <Link to="/shared" className={cm.cn('hover:text-primary transition-colors')}>
          {t('sharedDetail.breadcrumb.shared', {}, { defaultValue: 'Shared vaults' })}
        </Link>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          chevron_right
        </span>
        <span className="text-on-surface font-medium" data-testid="shared-detail-name">
          {vault.name}
        </span>
      </nav>

      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('p', 6),
          'bg-gradient-to-br from-primary/95 to-indigo-900 text-white rounded-2xl relative overflow-hidden flex-wrap gap-4',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'relative z-10')}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-emerald-300',
            )}
          >
            {t('sharedDetail.eyebrow', {}, { defaultValue: 'Shared vault' })}
          </span>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {vault.name}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-white/80 max-w-xl')}>
            {vault.description ||
              t('sharedDetail.noDescription', {}, { defaultValue: 'No description set.' })}
          </p>
          <span className={cm.cn(cm.textSize('xs'), 'text-white/60 font-mono')}>
            vault://{vault.id}
          </span>
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-emerald-300/20 blur-3xl',
          )}
          aria-hidden="true"
        />
      </header>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <article
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'md' }),
            'lg:col-span-12 bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('sharedDetail.detailsHeading', {}, { defaultValue: 'Vault details' })}
          </h2>
          <dl className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 md:grid-cols-2')}>
            <div>
              <dt
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('sharedDetail.created', {}, { defaultValue: 'Created' })}
              </dt>
              <dd
                className={cm.cn(cm.textSize('sm'), 'text-on-surface')}
                data-testid="shared-detail-created"
              >
                {new Date(vault.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('sharedDetail.updated', {}, { defaultValue: 'Last updated' })}
              </dt>
              <dd
                className={cm.cn(cm.textSize('sm'), 'text-on-surface')}
                data-testid="shared-detail-updated"
              >
                {new Date(vault.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  )
}

export default SharedVaultDetail
