import { type ReactNode, useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeHtml } from '../components/SafeHtml.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface SignView {
  signerName: string
  status: string
  expired: boolean
  alreadySigned: boolean
  contract: { title: string; body_html: string; body_md: string }
}

/**
 * Public counterparty signing page — the destination of the emailed `/sign/:token` link.
 * The external signer has no account; the token in the URL is the credential. Fetches the
 * contract via `GET /api/sign/:token` and records the signature via `POST /api/sign/:token`.
 */
export function Sign() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<SignView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/sign/${token}`)
      .then((res) => {
        if (cancelled) return
        const v = unwrapSingle<SignView>(res)
        setView(v)
        if (v?.alreadySigned) setSigned(true)
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t(
              'sign.loadError',
              {},
              {
                defaultValue: 'This signing link is invalid or has expired.',
              },
            ),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, token, t])

  async function handleSign() {
    if (!token || signing) return
    setSigning(true)
    setError(null)
    try {
      await http.post(`/api/sign/${token}`, {})
      // Public counterparty signature — the funnel's conversion point. No
      // account exists here, so no ids travel beyond the (opaque) token path.
      void track({ name: 'contract.signed_external', properties: { via: 'public-link' } })
      setSigned(true)
    } catch (err) {
      logError('sign.submit', err)
      setError(
        t(
          'sign.submitError',
          {},
          {
            defaultValue: 'Could not record your signature — the link may have expired.',
          },
        ),
      )
    } finally {
      setSigning(false)
    }
  }

  const shell = (children: ReactNode) => (
    <div className={cm.cn(cm.minH('screen'), cm.flex(), 'bg-surface text-on-surface antialiased')}>
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('p', 8),
          cm.w('full'),
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[720px]')}>{children}</div>
      </main>
    </div>
  )

  if (loading) {
    return shell(
      <p className={cm.textSize('sm')}>{t('sign.loading', {}, { defaultValue: 'Loading…' })}</p>,
    )
  }
  if (!view) {
    return shell(
      <p className={cm.cn(cm.textSize('base'), 'text-error')}>
        {error ??
          t('sign.loadError', {}, { defaultValue: 'This signing link is invalid or has expired.' })}
      </p>,
    )
  }

  return shell(
    <div className={cm.cn(cm.card(), cm.sp('p', 8))}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('extrabold'),
          'text-on-surface-variant uppercase tracking-wide',
        )}
      >
        {t('sign.eyebrow', {}, { defaultValue: 'Signature requested' })}
      </p>
      <h1 className={cm.cn(cm.sp('mt', 2), cm.textSize('2xl'), cm.fontWeight('extrabold'))}>
        {view.contract.title}
      </h1>
      <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
        {t('sign.for', { name: view.signerName }, { defaultValue: 'For {{name}}' })}
      </p>

      <article
        className={cm.cn(
          cm.sp('mt', 6),
          cm.sp('p', 5),
          'rounded-lg border border-outline-variant/40 overflow-y-auto max-h-[420px]',
        )}
      >
        <SafeHtml
          html={view.contract.body_html}
          className="prose prose-sm max-w-none text-on-surface"
          style={{ fontFamily: 'var(--mol-font-serif, "Source Serif 4", Georgia, serif)' }}
        />
      </article>

      <div className={cm.sp('mt', 6)}>
        {view.expired ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
            {t(
              'sign.expiredNotice',
              {},
              {
                defaultValue: 'This signing link has expired. Ask the sender for a new one.',
              },
            )}
          </p>
        ) : signed ? (
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-success')}>
            {t(
              'sign.done',
              {},
              {
                defaultValue: '✓ Signed. Thank you — the sender has been notified.',
              },
            )}
          </p>
        ) : (
          <>
            {error && (
              <p className={cm.cn(cm.sp('mb', 3), cm.textSize('sm'), 'text-error')}>{error}</p>
            )}
            <button
              type="button"
              data-mol-id="sign-contract"
              disabled={signing}
              onClick={handleSign}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-lg bg-primary text-on-primary disabled:opacity-60',
              )}
            >
              {signing
                ? t('sign.signing', {}, { defaultValue: 'Signing…' })
                : t('sign.action', {}, { defaultValue: 'Sign this document' })}
            </button>
          </>
        )}
      </div>
    </div>,
  )
}
