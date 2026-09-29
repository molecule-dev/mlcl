import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface SelfPayload {
  id: string
  email: string | null
  name: string | null
  username: string | null
  createdAt?: string
}

export function Account() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [self, setSelf] = useState<SelfPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get('/api/users/me')
        if (cancelled) return
        setSelf(unwrapSingle<SelfPayload>(res))
      } catch (_e) {
        if (!cancelled) {
          setError(t('account.loadError', {}, { defaultValue: 'Failed to load your account.' }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, t])

  const rows: Array<{ label: string; value: string | null; icon: string; mono?: boolean }> = self
    ? [
        {
          label: t('account.email', {}, { defaultValue: 'Email' }),
          value: self.email,
          icon: 'mail',
          mono: true,
        },
        {
          label: t('account.name', {}, { defaultValue: 'Name' }),
          value: self.name ?? self.username,
          icon: 'person',
        },
        {
          label: t('account.username', {}, { defaultValue: 'Username' }),
          value: self.username,
          icon: 'badge',
          mono: true,
        },
      ]
    : []

  const displayName = self?.name ?? self?.username ?? '—'
  const initials = /^[\p{L}]/u.test(displayName)
    ? displayName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]!.toUpperCase())
        .join('')
    : 'S'

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      {/* Header strip — eyebrow ledger trail, serif headline */}
      <div className="border-b border-outline-variant/60 pb-6">
        <p
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-wider text-on-surface-variant',
          )}
        >
          <span>{t('account.eyebrow', {}, { defaultValue: 'Switchboard autonomous ledger' })}</span>
          <span className="sb-icon flex h-3 w-3 items-center justify-center" aria-hidden="true">
            <span className="material-symbols-outlined">chevron_right</span>
          </span>
          <span className="text-secondary">
            {t('account.eyebrowSegment', {}, { defaultValue: 'Operator account' })}
          </span>
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 2))}>
          <span
            aria-hidden="true"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-12 w-12 shrink-0 rounded-lg bg-primary text-on-primary',
              'sb-serif text-lg',
            )}
          >
            {self === null ? '—' : initials}
          </span>
          <div>
            <h1
              className={cm.cn('sb-serif text-3xl font-normal tracking-tight text-primary')}
              data-mol-id="account-heading"
            >
              {t('account.heading', {}, { defaultValue: 'Your account' })}
            </h1>
            <p className={cm.cn(cm.sp('mt', 0.5), cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'account.subheading',
                {},
                {
                  defaultValue:
                    'Front desk sign-in details and devices. Manage passwords and sessions from the menu.',
                },
              )}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p
          data-mol-id="account-loading"
          className={cm.cn(cm.sp('mt', 6), 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p
          data-mol-id="account-error"
          className={cm.cn(
            cm.sp('mt', 6),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-lg bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : (
        <section
          className={cm.cn(
            cm.sp('mt', 6),
            cm.sp('p', 5),
            'sb-card-shadow rounded-lg border border-outline-variant/50 bg-surface-container-lowest',
          )}
          aria-label={t('account.profileLabel', {}, { defaultValue: 'Operator profile' })}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.sp('mb', 4),
              cm.sp('pb', 3),
              'border-b border-outline-variant/40',
            )}
          >
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'sb-serif text-lg font-medium text-primary',
              )}
            >
              <span
                className="sb-icon flex h-5 w-5 items-center justify-center text-secondary"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">account_circle</span>
              </span>
              {t('account.profile', {}, { defaultValue: 'Operator profile' })}
            </h2>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 0.5),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'rounded border border-tertiary-fixed bg-tertiary-fixed/40 text-on-tertiary-fixed-variant',
              )}
            >
              {t('account.role', {}, { defaultValue: 'Front desk' })}
            </span>
          </div>
          <dl className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4">
                <dt
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  <span
                    className="sb-icon flex h-4 w-4 items-center justify-center text-secondary"
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">{row.icon}</span>
                  </span>
                  {row.label}
                </dt>
                <dd
                  data-mol-id={'account-field-' + row.label.toLowerCase()}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-right text-primary',
                    row.mono && 'font-mono',
                  )}
                >
                  {row.value ?? '—'}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
