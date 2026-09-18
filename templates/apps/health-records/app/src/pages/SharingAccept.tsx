import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface AcceptedGrant {
  id: string
  role?: string
  scope?: string[]
  owner_name?: string
}

/**
 * `/sharing/accept?token=…` — the landing page for the invitation email a patient
 * sends from "Share records". It claims the grant for the signed-in user (the API
 * binds `recipient_user_id`). It sits behind the app's AuthGuard, so a recipient
 * who isn't signed in is sent to log in / sign up first and returned here.
 */
export function SharingAccept() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [grant, setGrant] = useState<AcceptedGrant | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    if (!token) {
      setStatus('error')
      setError(
        t(
          'sharingAccept.noToken',
          {},
          { defaultValue: 'This invitation link is missing its token.' },
        ),
      )
      return
    }
    void (async () => {
      try {
        const res = await http.post('/api/sharing/accept', { token })
        setGrant(unwrapSingle<AcceptedGrant>(res))
        setStatus('success')
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('sharingAccept.error', {}, { defaultValue: 'Could not accept this invitation.' }),
        )
        setStatus('error')
      }
    })()
  }, [token, http, t])

  return (
    <div
      className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('p', 8))}
      data-mol-id="page-sharing-accept"
    >
      <div className={cm.cn(cm.surface, 'rounded-lg', cm.sp('p', 8), 'border border-outline/30')}>
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
          {t('sharingAccept.eyebrow', {}, { defaultValue: 'Shared records' })}
        </p>

        {status === 'loading' && (
          <h1
            className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}
            data-mol-id="accept-loading"
          >
            {t('sharingAccept.loading', {}, { defaultValue: 'Accepting your invitation…' })}
          </h1>
        )}

        {status === 'success' && (
          <div data-mol-id="accept-success">
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
              {t('sharingAccept.success', {}, { defaultValue: 'Invitation accepted' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'sharingAccept.successBody',
                {
                  owner: grant?.owner_name ?? 'The patient',
                  scope: (grant?.scope ?? []).join(', '),
                },
                {
                  defaultValue:
                    '{{owner}} has shared their {{scope}} with you. It now appears under “Shared with me”.',
                },
              )}
            </p>
            <Link
              to="/sharing"
              className={cm.cn(
                cm.sp('mt', 6),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'inline-flex text-primary hover:underline',
              )}
              data-mol-id="accept-continue"
            >
              {t('sharingAccept.continue', {}, { defaultValue: 'Go to sharing' })}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div data-mol-id="accept-error">
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
              {t('sharingAccept.failed', {}, { defaultValue: 'Could not accept invitation' })}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.sp('mt', 6),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'inline-flex text-primary hover:underline',
              )}
            >
              {t('sharingAccept.backHome', {}, { defaultValue: 'Back to dashboard' })}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
