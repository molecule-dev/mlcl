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
        const res = await http.get('/users/me')
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

  const rows: Array<{ label: string; value: string | null }> = self
    ? [
        { label: t('account.email', {}, { defaultValue: 'Email' }), value: self.email },
        {
          label: t('account.name', {}, { defaultValue: 'Name' }),
          value: self.name ?? self.username,
        },
        {
          label: t('account.username', {}, { defaultValue: 'Username' }),
          value: self.username,
        },
      ]
    : []

  return (
    <div className={cm.cn(cm.maxW('3xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <h1
        className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
        data-mol-id="account-heading"
      >
        {t('account.heading', {}, { defaultValue: 'Your account' })}
      </h1>
      <p className={cm.cn(cm.sp('mt', 2), 'text-on-surface-variant')}>
        {t(
          'account.subheading',
          {},
          {
            defaultValue:
              'Front desk sign-in details and devices. Manage passwords and sessions from the menu.',
          },
        )}
      </p>

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
            'rounded-xl bg-error/10 text-error border border-error/30',
          )}
        >
          {error}
        </p>
      ) : (
        <dl
          className={cm.cn(
            cm.sp('mt', 6),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'rounded-2xl bg-surface border border-outline-variant',
            cm.sp('p', 6),
          )}
        >
          {rows.map((row) => (
            <div key={row.label} className={cm.flex({ align: 'center', justify: 'between' })}>
              <dt
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {row.label}
              </dt>
              <dd data-mol-id={'account-field-' + row.label.toLowerCase()}>{row.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
