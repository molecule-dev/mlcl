import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import type { TranslateFunction } from '@molecule/app-i18n'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface RecoveryKey {
  id: string
  user_id: string
  // The kit as plain text — an export/copy artifact, deliberately NOT named
  // or shaped like a ciphertext.
  recovery_kit: string
  created_at: string
}

function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  ) {
    return (res as { data: T[] }).data
  }
  return []
}

function unwrapOne<T>(res: unknown): T | null {
  if (res && typeof res === 'object') {
    if ('data' in res && (res as { data: unknown }).data) return (res as { data: T }).data
    if (!('data' in res)) return res as T
  }
  return null
}

/**
 * Maps a billing plan key (see api/src/tiers.ts) to its display name.
 * Falls back to the Free tier for unknown/absent keys.
 */
function planLabelFor(t: TranslateFunction, planKey: string | null | undefined): string {
  if (planKey?.toLowerCase().includes('team')) {
    return t('plans.team', {}, { defaultValue: 'Team' })
  }
  if (planKey && planKey !== 'free') {
    return t('plans.pro', {}, { defaultValue: 'Pro' })
  }
  return t('plans.free', {}, { defaultValue: 'Free' })
}

function generateLocalRecoveryKit(): { recoveryCode: string } {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  const recoveryCode = Array.from(arr)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 32)
    .toUpperCase()
  // The kit IS the code — plain text by design (an export/copy artifact),
  // never dressed up as an encrypted payload.
  return { recoveryCode }
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [keys, setKeys] = useState<RecoveryKey[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [planKey, setPlanKey] = useState<string | null>(null)
  const displayName =
    user?.name || user?.email || t('profile.defaultName', {}, { defaultValue: 'Vault owner' })
  const email = user?.email ?? ''

  useEffect(() => {
    let cancelled = false
    http
      .get<unknown>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        // GET /users/me responds { props: { …user, planKey }, plan? }.
        const body = unwrapOne<{ props?: { planKey?: string | null } }>(res)
        setPlanKey(body?.props?.planKey ?? null)
      })
      .catch((_error) => {
        // plan pill falls back to the Free tier when /users/me is unavailable
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<unknown>('/api/recovery-keys')
      .then((res) => {
        if (!cancelled) {
          setKeys(unwrapList<RecoveryKey>(res))
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load recovery keys')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, refreshKey])

  const generate = async () => {
    setWorking(true)
    setError(null)
    setRecoveryCode(null)
    try {
      const kit = generateLocalRecoveryKit()
      const res = await http.post<unknown>('/api/recovery-keys', {
        recovery_kit: kit.recoveryCode,
      })
      const created = unwrapOne<RecoveryKey>(res)
      if (created) {
        setKeys((prev) => [created, ...prev])
      }
      setRecoveryCode(kit.recoveryCode)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recovery kit')
    } finally {
      setWorking(false)
    }
  }

  const purge = async (id: string) => {
    if (!confirm(t('profile.confirmDelete', {}, { defaultValue: 'Delete this recovery key?' })))
      return
    setWorking(true)
    setError(null)
    try {
      await http.delete(`/api/recovery-keys/${id}`)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recovery key')
    } finally {
      setWorking(false)
    }
  }

  const printKit = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
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
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg' }),
          'p-4 md:p-8',
          'bg-gradient-to-br from-primary to-indigo-900 text-white rounded-3xl relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            'w-20 h-20 rounded-full bg-surface/15 backdrop-blur-md text-3xl border border-surface/20',
          )}
          aria-hidden="true"
        >
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'relative z-10')}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'uppercase tracking-widest text-emerald-300',
            )}
          >
            {t('nav.identity', {}, { defaultValue: 'Identity' })}
          </span>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            data-testid="profile-display-name"
          >
            {displayName}
          </h1>
          <span className={cm.cn(cm.textSize('sm'), 'text-white/80')} data-testid="profile-email">
            {email}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              'self-start rounded-full py-1 mt-1 bg-surface/15 backdrop-blur-md',
            )}
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              workspace_premium
            </span>
            {t(
              'profile.tier',
              { appName: APP_NAME, plan: planLabelFor(t, planKey) },
              { defaultValue: '{{appName}} {{plan}}' },
            )}
          </span>
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-emerald-300/20 blur-3xl',
          )}
          aria-hidden="true"
        />
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'md' }),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('profile.recoveryHeading', {}, { defaultValue: 'Recovery kit' })}
        </h2>
        <div
          className={cm.cn(
            cm.flex({ align: 'start', gap: 'sm' }),
            cm.sp('p', 4),
            'rounded-xl bg-primary-light/40 border border-primary-light/60',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-primary mt-0.5')}
            aria-hidden="true"
          >
            shield_lock
          </span>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
            >
              {keys.length === 0
                ? t(
                    'profile.recoveryNone',
                    {},
                    { defaultValue: 'No recovery kit yet — generate one below.' },
                  )
                : t(
                    'profile.recoveryCount',
                    { count: keys.length },
                    { defaultValue: '{{count}} recovery key(s) on file' },
                  )}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'profile.recoveryBody',
                {},
                {
                  defaultValue:
                    'Your recovery kit is a printable copy of your recovery code. It is stored on file as plain text, not encrypted — keep it somewhere safe. Reprint after every device change.',
                },
              )}
            </span>
          </div>
        </div>

        {recoveryCode && (
          <div
            data-testid="profile-recovery-code"
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl bg-success-light border border-emerald-200',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-success mb-1',
              )}
            >
              {t(
                'profile.recoveryCodeLabel',
                {},
                { defaultValue: 'Save this code now — it will not be shown again' },
              )}
            </p>
            <p className={cm.cn('font-mono text-success text-lg tracking-widest break-all')}>
              {recoveryCode}
            </p>
          </div>
        )}

        {error && (
          <p className={cm.cn(cm.textSize('xs'), 'text-error')} data-testid="profile-error">
            {error}
          </p>
        )}

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <button
            onClick={generate}
            disabled={working}
            type="button"
            data-testid="profile-generate-recovery"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg py-2 bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {working ? 'progress_activity' : 'autorenew'}
            </span>
            {working
              ? t('profile.generating', {}, { defaultValue: 'Generating…' })
              : keys.length === 0
                ? t('profile.generate', {}, { defaultValue: 'Generate recovery kit' })
                : t('profile.regenerate', {}, { defaultValue: 'Generate new key' })}
          </button>
          <button
            onClick={printKit}
            type="button"
            data-testid="profile-print"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg py-2 bg-surface border border-primary-light/40 text-primary hover:bg-primary-light transition-colors',
            )}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              print
            </span>
            {t('profile.print', {}, { defaultValue: 'Print kit' })}
          </button>
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ direction: 'col', gap: 'md' }),
          'bg-surface rounded-2xl border border-primary-light/30 shadow-sm',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
          {t('profile.keysHeading', {}, { defaultValue: 'Recovery keys' })}
        </h2>
        {loading ? (
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            data-testid="profile-keys-loading"
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : keys.length === 0 ? (
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            data-testid="profile-keys-empty"
          >
            {t('profile.keysEmpty', {}, { defaultValue: 'No recovery keys generated yet.' })}
          </p>
        ) : (
          <ul
            className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
            data-testid="profile-keys-list"
          >
            {keys.map((k) => (
              <li
                key={k.id}
                data-testid={`profile-key-${k.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('p', 4),
                  'rounded-xl border border-primary-light/20 bg-surface-container-low/40',
                )}
              >
                <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface')}>
                    {t('profile.keyLabel', {}, { defaultValue: 'Recovery kit' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'profile.keyCreated',
                      { date: new Date(k.created_at).toLocaleDateString() },
                      { defaultValue: 'Created {{date}}' },
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => purge(k.id)}
                  disabled={working}
                  data-testid={`profile-key-delete-${k.id}`}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    'rounded-md py-1.5 bg-surface border border-red-200 text-error hover:bg-error-light transition-colors disabled:opacity-60',
                  )}
                >
                  {t('common.delete', {}, { defaultValue: 'Delete' })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Profile
