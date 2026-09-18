import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { t } from '@molecule/app-i18n'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { ApprovalBadge, type ApprovalStatus } from '../components/ApprovalBadge.js'

interface PolicyRow {
  id: string
  category: string
  cap: string
  receiptThreshold: string
  status: ApprovalStatus
}

interface PolicyRecord {
  id?: string
  name?: string
  description?: string | null
  max_amount?: number | string | null
  categories?: string[] | null
  requires_receipt_above?: number | string | null
  auto_approve_below?: number | string | null
  is_active?: boolean
}

interface ReimbursementPrefs {
  method?: 'ach' | 'card'
  notify?: {
    submitted?: boolean
    reviewed?: boolean
    reimbursed?: boolean
    policy?: boolean
  }
}

interface UserRecord extends UserProfile {
  username?: string
  oauthData?: ReimbursementPrefs & Record<string, unknown>
}

interface UserResponse {
  props?: UserRecord
}

const DEFAULT_NOTIFY = {
  submitted: true,
  reviewed: true,
  reimbursed: true,
  policy: true,
}

function formatPolicy(p: PolicyRecord): PolicyRow {
  const max = Number(p.max_amount ?? 0)
  const cap =
    !p.max_amount || max === 0
      ? t('settings.policies.managerApproval', {}, { defaultValue: 'Manager approval' })
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(max)
  const receipt = Number(p.requires_receipt_above ?? 0)
  const receiptThreshold =
    receipt > 0
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(receipt)
      : '$0'
  return {
    id: p.id ?? p.name ?? 'unknown',
    category: p.name ?? t('settings.policies.unnamed', {}, { defaultValue: 'Policy' }),
    cap,
    receiptThreshold,
    status: (p.is_active === false ? 'draft' : 'approved') as ApprovalStatus,
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserRecord>()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reimbursementMethod, setReimbursementMethod] = useState<'ach' | 'card'>('ach')
  const [notify, setNotify] = useState({ ...DEFAULT_NOTIFY })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [policies, setPolicies] = useState<PolicyRow[]>([])
  const [policiesError, setPoliciesError] = useState<string | null>(null)

  // Hydrate from `/api/users/:id` directly — `useAuth().user` is the
  // initial sign-up snapshot and does NOT refresh after PATCH, so values
  // saved by this page on a previous visit would otherwise round-trip as
  // stale defaults.
  useEffect(() => {
    let cancelled = false
    if (!user?.id) return
    setName(user.name ?? user.username ?? '')
    setEmail(user.email ?? '')
    const initialPrefs = (user.oauthData as ReimbursementPrefs | undefined) ?? {}
    if (initialPrefs.method === 'ach' || initialPrefs.method === 'card') {
      setReimbursementMethod(initialPrefs.method)
    }
    setNotify({
      submitted: initialPrefs.notify?.submitted ?? DEFAULT_NOTIFY.submitted,
      reviewed: initialPrefs.notify?.reviewed ?? DEFAULT_NOTIFY.reviewed,
      reimbursed: initialPrefs.notify?.reimbursed ?? DEFAULT_NOTIFY.reimbursed,
      policy: initialPrefs.notify?.policy ?? DEFAULT_NOTIFY.policy,
    })

    void (async () => {
      try {
        const response = await http.get<UserResponse>(`/users/${encodeURIComponent(user.id)}`)
        if (cancelled) return
        const fresh = response.data?.props
        if (!fresh) return
        if (fresh.name) setName(fresh.name)
        else if (fresh.username) setName(fresh.username)
        if (fresh.email) setEmail(fresh.email)
        const remotePrefs = (fresh.oauthData as ReimbursementPrefs | undefined) ?? {}
        if (remotePrefs.method === 'ach' || remotePrefs.method === 'card') {
          setReimbursementMethod(remotePrefs.method)
        }
        setNotify({
          submitted: remotePrefs.notify?.submitted ?? DEFAULT_NOTIFY.submitted,
          reviewed: remotePrefs.notify?.reviewed ?? DEFAULT_NOTIFY.reviewed,
          reimbursed: remotePrefs.notify?.reimbursed ?? DEFAULT_NOTIFY.reimbursed,
          policy: remotePrefs.notify?.policy ?? DEFAULT_NOTIFY.policy,
        })
      } catch (_error) {
        // network error — keep the snapshot we hydrated from useAuth().user; ignoring is correct
      }
    })()

    return () => {
      cancelled = true
    }
  }, [http, user])

  // Load policies from the API (real, per-user data).
  useEffect(() => {
    let cancelled = false
    http
      .get<PolicyRecord[]>('/api/policies')
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        if (Array.isArray(data) && data.length > 0) {
          setPolicies(data.map(formatPolicy))
        }
        setPoliciesError(null)
      })
      .catch(() => {
        if (cancelled) return
        setPoliciesError('list')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function saveProfile(): Promise<void> {
    if (!user?.id) return
    setSavingProfile(true)
    setProfileError(null)
    setProfileSaved(false)
    try {
      const payload: Record<string, unknown> = {}
      if (name && name !== (user.name ?? '')) payload.name = name
      if (email && email !== (user.email ?? '')) payload.email = email
      if (Object.keys(payload).length === 0) {
        setProfileSaved(true)
        return
      }
      await http.patch(`/users/${encodeURIComponent(user.id)}`, payload)
      setProfileSaved(true)
    } catch (err) {
      console.warn('Profile save failed', err)
      setProfileError(
        t(
          'settings.profileSaveFailed',
          {},
          {
            defaultValue: 'Could not update profile. Please try again.',
          },
        ),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePrefs(next: ReimbursementPrefs): Promise<void> {
    if (!user?.id) return
    setSavingPrefs(true)
    try {
      // Re-read current oauthData so a sibling tab that wrote unrelated
      // keys (e.g. analytics opt-in) doesn't get clobbered by this PATCH.
      let currentOauth: Record<string, unknown> = {}
      try {
        const fresh = await http.get<UserResponse>(`/users/${encodeURIComponent(user.id)}`)
        currentOauth = (fresh.data?.props?.oauthData as Record<string, unknown>) ?? {}
      } catch (_error) {
        // fallback to cached oauthData if the GET fails — ignoring fetch error is correct here
        currentOauth = (user.oauthData as Record<string, unknown> | undefined) ?? {}
      }
      const merged = {
        ...currentOauth,
        method: next.method,
        notify: next.notify,
      }
      await http.patch(`/users/${encodeURIComponent(user.id)}`, {
        oauthData: merged,
      })
    } catch (err) {
      console.warn('Preference save failed', err)
    } finally {
      setSavingPrefs(false)
    }
  }

  function setMethod(method: 'ach' | 'card'): void {
    setReimbursementMethod(method)
    void savePrefs({ method, notify })
  }

  function toggleNotify(key: keyof typeof notify): void {
    const next = { ...notify, [key]: !notify[key] }
    setNotify(next)
    void savePrefs({ method: reimbursementMethod, notify: next })
  }

  return (
    <div data-mol-id="page-settings" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Workspace preferences' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-3 gap-6')}>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-5',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.profile', {}, { defaultValue: 'Profile' })}
          </h2>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="profile-name"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            >
              {t('form.displayName', {}, { defaultValue: 'Display name' })}
            </label>
            <input
              id="profile-name"
              data-mol-id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
            />
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="profile-email"
              className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            >
              {t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            </label>
            <input
              id="profile-email"
              data-mol-id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
              )}
            />
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
            <button
              type="button"
              data-mol-id="settings-save-profile"
              disabled={savingProfile}
              onClick={() => void saveProfile()}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full text-white shadow-sm disabled:opacity-60',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
              }}
            >
              {savingProfile
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
            </button>
            {profileSaved ? (
              <span
                data-mol-id="settings-profile-saved"
                className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
              >
                {t('settings.profile.saved', {}, { defaultValue: 'Saved ✓' })}
              </span>
            ) : null}
          </div>
          {profileError ? (
            <p
              data-mol-id="settings-profile-error"
              className={cm.cn(cm.textSize('xs'), 'text-error')}
            >
              {profileError}
            </p>
          ) : null}
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-5',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.payouts.title', {}, { defaultValue: 'Reimbursement method' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.payouts.subtitle',
              {},
              {
                defaultValue:
                  'How your approved reports are paid out after the finance team marks them reimbursed.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {(
              [
                { value: 'ach', icon: 'account_balance', label: 'ACH direct deposit' },
                { value: 'card', icon: 'credit_card', label: 'Corporate card credit' },
              ] as const
            ).map((opt) => {
              const active = reimbursementMethod === opt.value
              return (
                <button
                  type="button"
                  key={opt.value}
                  data-mol-id={`payout-${opt.value}`}
                  disabled={savingPrefs}
                  onClick={() => setMethod(opt.value)}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl text-left transition-colors disabled:opacity-60',
                    active
                      ? 'bg-primary-container border border-primary text-on-primary-container'
                      : 'bg-surface-container-low border border-outline-variant',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-xl')} aria-hidden="true">
                    {opt.icon}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(`settings.payouts.${opt.value}`, {}, { defaultValue: opt.label })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-4',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.notifications.title', {}, { defaultValue: 'Notifications' })}
          </h2>
          {(
            [
              { key: 'submitted', defaultValue: 'When my report is submitted' },
              { key: 'reviewed', defaultValue: 'When my report is reviewed' },
              { key: 'reimbursed', defaultValue: 'When I receive reimbursement' },
              { key: 'policy', defaultValue: 'Policy violation alerts' },
            ] as const
          ).map((row) => (
            <label
              key={row.key}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer',
              )}
            >
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t(`settings.notifications.${row.key}`, {}, { defaultValue: row.defaultValue })}
              </span>
              <input
                type="checkbox"
                data-mol-id={`notify-${row.key}`}
                checked={notify[row.key]}
                onChange={() => toggleNotify(row.key)}
                disabled={savingPrefs}
                className={cm.cn(
                  'h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary/30',
                )}
              />
            </label>
          ))}
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-4',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.language.title', {}, { defaultValue: 'Language' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
          <LanguagePicker />
        </div>
      </section>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
      <section className={cm.stack(4)}>
        <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('settings.policies.title', {}, { defaultValue: 'Approval policies' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.policies.scope', {}, { defaultValue: 'Workspace-wide · admins only' })}
          </span>
        </header>
        {policiesError ? (
          <div
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl bg-warning-container/40 text-on-warning-container',
            )}
          >
            {t(
              'settings.policies.error',
              {},
              { defaultValue: 'Could not load policies — try refreshing.' },
            )}
          </div>
        ) : null}
        <div
          className={cm.cn(
            'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
          )}
        >
          <table className={cm.cn('w-full text-sm')}>
            <thead>
              <tr
                className={cm.cn(
                  'bg-surface-container-low text-on-surface-variant uppercase tracking-widest text-[10px]',
                )}
              >
                <th className={cm.cn('text-left px-5 py-3 font-bold')}>
                  {t('form.category', {}, { defaultValue: 'Category' })}
                </th>
                <th className={cm.cn('text-left px-5 py-3 font-bold')}>
                  {t('settings.policies.cap', {}, { defaultValue: 'Daily cap' })}
                </th>
                <th className={cm.cn('text-left px-5 py-3 font-bold')}>
                  {t('settings.policies.receipt', {}, { defaultValue: 'Receipt required over' })}
                </th>
                <th className={cm.cn('text-right px-5 py-3 font-bold')}>
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
              {policies.map((policy) => (
                <tr
                  key={policy.id}
                  data-mol-id={`policy-row-${policy.id}`}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.cn('px-5 py-3 font-semibold')}>{policy.category}</td>
                  <td className={cm.cn('px-5 py-3 tabular-nums text-on-surface-variant')}>
                    {policy.cap}
                  </td>
                  <td className={cm.cn('px-5 py-3 tabular-nums text-on-surface-variant')}>
                    {policy.receiptThreshold}
                  </td>
                  <td className={cm.cn('px-5 py-3 text-right')}>
                    <ApprovalBadge status={policy.status} />
                  </td>
                </tr>
              ))}
              {policies.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className={cm.cn(
                      cm.sp('p', 6),
                      cm.textCenter,
                      cm.textSize('sm'),
                      'text-on-surface-variant',
                    )}
                  >
                    {t('settings.policies.empty', {}, { defaultValue: 'No policies yet.' })}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
