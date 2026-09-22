import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PermissionBadge, type PermissionVariant } from '../components/PermissionBadge.js'
import { unwrapList } from '../lib/unwrap.js'

interface ShareGrantRaw {
  id: string
  recipient_name?: string | null
  recipient_email: string
  organization?: string | null
  role?: string
  scope?: string | string[] | null
  starts_at?: string | null
  granted_at?: string | null
  created_at?: string | null
  expires_at?: string | null
  revoked_at?: string | null
}

interface ShareGrant {
  id: string
  recipient_name: string
  recipient_email: string
  organization?: string
  variant: PermissionVariant
  scope: ReadonlyArray<string>
  granted_at: string
  expires_at?: string | null
  revoked_at?: string | null
}

const ROLE_TO_VARIANT: Record<string, PermissionVariant> = {
  provider: 'provider',
  caregiver: 'caregiver',
  viewer: 'readonly',
}

function parseScope(raw: ShareGrantRaw['scope']): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch (_error) {
    // invalid JSON scope falls back to empty array — safe to ignore
    return []
  }
}

function normalizeGrant(r: ShareGrantRaw): ShareGrant {
  const scopes = parseScope(r.scope).map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  return {
    id: r.id,
    recipient_name: r.recipient_name ?? r.recipient_email,
    recipient_email: r.recipient_email,
    organization: r.organization ?? undefined,
    variant: ROLE_TO_VARIANT[r.role ?? 'viewer'] ?? 'readonly',
    scope: scopes,
    granted_at: r.starts_at ?? r.created_at ?? r.granted_at ?? new Date().toISOString(),
    expires_at: r.expires_at,
    revoked_at: r.revoked_at,
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Sharing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [shares, setShares] = useState<ShareGrant[]>([])
  const [received, setReceived] = useState<
    Array<{ id: string; role?: string; scope: string[]; owner_name?: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  // Two-step inline confirm for the destructive revoke: the first click arms
  // the button, the second commits; navigating away or re-clicking elsewhere
  // disarms. Auto-disarms after 5s so a stray tap never leaves a live fuse.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const fetchShares = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/api/sharing?patient_id=me')
      const list = unwrapList<ShareGrantRaw>(res)
      setShares(list.map(normalizeGrant).filter((g) => !g.revoked_at))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('sharing.loadError', {}, { defaultValue: 'Failed to load sharing list.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  // The recipient side: grants OTHER patients have shared with (and been accepted
  // by) this user — populated once they accept an invitation at /sharing/accept.
  const fetchReceived = async () => {
    try {
      const res = await http.get('/api/sharing/received')
      setReceived(
        unwrapList<{ id: string; role?: string; scope?: string[]; owner_name?: string }>(res).map(
          (g) => ({ ...g, scope: Array.isArray(g.scope) ? g.scope : [] }),
        ),
      )
    } catch (_error) {
      // Best-effort — the owner-side list is the primary content of this page.
    }
  }

  useEffect(() => {
    fetchShares()
    fetchReceived()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRevoke = async (id: string) => {
    if (revokingId) return
    // First click: arm. Second click (same grant, armed): commit.
    if (confirmingId !== id) {
      setConfirmingId(id)
      return
    }
    setRevokingId(id)
    setConfirmingId(null)
    setError(null)
    try {
      await http.post(`/api/sharing/${id}/revoke`, {})
      track({ name: 'sharing.revoked', properties: { grant_id: id } })
      await fetchShares()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('sharing.revokeError', {}, { defaultValue: 'Could not revoke access.' }),
      )
    } finally {
      setRevokingId(null)
    }
  }

  useEffect(() => {
    if (!confirmingId) return
    const timer = window.setTimeout(() => setConfirmingId(null), 5000)
    return () => window.clearTimeout(timer)
  }, [confirmingId])

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-sharing">
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 6),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('sharing.eyebrow', {}, { defaultValue: 'Access control' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('sharing.title', {}, { defaultValue: 'Sharing & access' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'text-on-surface-variant max-w-2xl',
            )}
          >
            {t(
              'sharing.subtitle',
              {},
              {
                defaultValue:
                  'Control exactly who can view which slices of your record. Revoke access anytime — keys roll forward, never backward.',
              },
            )}
          </p>
        </div>
        <Link
          to="/sharing/new"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>person_add</span>
          {t('sharing.invite', {}, { defaultValue: 'Invite someone' })}
        </Link>
      </div>

      {error && (
        <p
          className={cm.cn(
            cm.sp('mb', 4),
            cm.textSize('xs'),
            'text-on-surface-variant uppercase tracking-widest font-bold',
          )}
        >
          {error}
        </p>
      )}

      {received.length > 0 && (
        <section className={cm.cn(cm.sp('mb', 8))} data-mol-id="shared-with-me">
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
              cm.sp('mb', 3),
            )}
          >
            {t('sharing.received.title', {}, { defaultValue: 'Shared with me' })}
          </h2>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {received.map((g) => (
              <article
                key={g.id}
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface-container-lowest rounded-2xl shadow-sm',
                )}
                data-mol-id={`received-${g.id}`}
              >
                <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {g.owner_name ??
                    t('sharing.received.aPatient', {}, { defaultValue: 'A patient' })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                  {t(
                    'sharing.received.body',
                    { role: g.role ?? 'viewer', scope: g.scope.join(', ') },
                    { defaultValue: 'Shared their {{scope}} with you ({{role}} access).' },
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : shares.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
          <span className={cm.cn('text-3xl material-symbols-outlined text-outline')}>
            shield_person
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 4))}>
            {t('sharing.empty.title', {}, { defaultValue: 'No one has access yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {t(
              'sharing.empty.body',
              {},
              {
                defaultValue:
                  'Invite a provider, caregiver, or family member to view selected records.',
              },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {shares.map((s) => (
            <article
              key={s.id}
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }),
                )}
              >
                <div className={cm.cn(cm.flex({ gap: 'md', align: 'start' }))}>
                  <div
                    className={cm.cn(
                      cm.shrink0,
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(12),
                      cm.h(12),
                      cm.roundedFull,
                      'bg-primary-container text-on-primary-container',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div>
                    <p className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                      {s.recipient_name}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {s.recipient_email}
                    </p>
                    {s.organization && (
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          'text-on-surface-variant uppercase tracking-wider font-bold',
                        )}
                      >
                        {s.organization}
                      </p>
                    )}
                  </div>
                </div>
                <PermissionBadge variant={s.variant} />
              </div>

              <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 4))}>
                {s.scope.map((scope) => (
                  <span
                    key={scope}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'rounded-full bg-surface-container-low text-on-surface-variant',
                    )}
                  >
                    {scope}
                  </span>
                ))}
              </div>

              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                  cm.sp('mt', 4),
                  cm.sp('pt', 4),
                  'border-t border-outline-variant/20',
                )}
              >
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {s.expires_at
                    ? t(
                        'sharing.grantedExpires',
                        { granted: fmtDate(s.granted_at), expires: fmtDate(s.expires_at) },
                        { defaultValue: 'Granted {{granted}} · Expires {{expires}}' },
                      )
                    : t(
                        'sharing.granted',
                        { granted: fmtDate(s.granted_at) },
                        { defaultValue: 'Granted {{granted}} · No expiration' },
                      )}
                </p>
                <button
                  type="button"
                  onClick={() => handleRevoke(s.id)}
                  disabled={revokingId === s.id}
                  data-mol-id={`revoke-${s.id}`}
                  aria-label={
                    confirmingId === s.id
                      ? t(
                          'sharing.confirmRevokeAria',
                          { name: s.recipient_name },
                          {
                            defaultValue: 'Confirm revoking access for {{name}}',
                          },
                        )
                      : undefined
                  }
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest hover:underline disabled:opacity-50',
                    confirmingId === s.id
                      ? 'text-on-error bg-error-container rounded-full px-4 py-2'
                      : 'text-error',
                  )}
                >
                  {revokingId === s.id
                    ? t('sharing.revoking', {}, { defaultValue: 'Revoking…' })
                    : confirmingId === s.id
                      ? t('sharing.confirmRevoke', {}, { defaultValue: 'Tap again to revoke' })
                      : t('sharing.revoke', {}, { defaultValue: 'Revoke access' })}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
