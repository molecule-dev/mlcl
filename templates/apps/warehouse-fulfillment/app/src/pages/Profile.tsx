import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FulfillmentKpiCard } from '../components/FulfillmentKpiCard.js'

interface UserBlob {
  id: string
  email?: string
  name?: string | null
  role?: string
  avatar?: string
  oauthData?: { profile?: { displayName?: string; role?: string; shift?: string } } | null
}

interface OrderStats {
  pending?: number
  picking?: number
  packed?: number
  shipped?: number
  cancelled?: number
  returned?: number
  rush?: number
  total?: number
}

interface InventoryStats {
  total: number
  units: number
  lowStock: number
  outOfStock: number
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth<UserBlob>()
  const userId = auth.user?.id ?? null
  const fallbackName = auth.user?.name ?? auth.user?.email?.split('@')[0] ?? 'Floor lead'

  const [displayName, setDisplayName] = useState<string>(fallbackName)
  const [role, setRole] = useState<string>('Dock supervisor · Zone A')
  const [shift, setShift] = useState<string>('06:00 — 14:00')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [invStats, setInvStats] = useState<InventoryStats | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    async function load() {
      try {
        const [userRes, prefsRes, orderRes, invRes] = await Promise.all([
          http.get<{ props?: UserBlob }>(`/users/${userId}`),
          http
            .get<{ profile?: { displayName?: string; role?: string; shift?: string } }>(
              '/preferences',
            )
            .catch(() => null),
          http.get<OrderStats>(`/orders/stats/counts`).catch(() => null),
          http.get<InventoryStats>(`/inventory/stats`).catch(() => null),
        ])
        if (cancelled) return
        const blob = userRes.data?.props
        // Profile details live in the server-side preferences channel — the
        // platform user resource never returns `oauthData` on reads.
        const profile = prefsRes?.data?.profile ?? {}
        if (profile.displayName) setDisplayName(profile.displayName)
        else if (blob?.name) setDisplayName(blob.name)
        if (profile.role) setRole(profile.role)
        if (profile.shift) setShift(profile.shift)
        if (orderRes) setOrderStats(orderRes.data ?? null)
        if (invRes) setInvStats(invRes.data ?? null)
      } catch (_error) {
        if (!cancelled)
          setError(t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' }))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, userId, t])

  async function save() {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      await Promise.all([
        // Operator details persist server-side (oauthData reads never come
        // back); the display name also syncs to the user row so the shell
        // sidebar shows it.
        http.patch('/preferences', { profile: { displayName, role, shift } }),
        http.patch(`/users/${userId}`, { name: displayName }),
      ])
      setSavedAt(new Date())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const initial = displayName.slice(0, 1).toUpperCase()
  const fulfilled = Number(orderStats?.shipped ?? 0)
  const inFlight = Number(orderStats?.picking ?? 0) + Number(orderStats?.packed ?? 0)
  const totalOrders = Number(orderStats?.total ?? 0)
  const accuracyPct =
    totalOrders > 0
      ? Math.max(0, 100 - Math.round((Number(orderStats?.cancelled ?? 0) / totalOrders) * 100))
      : 100

  return (
    <div className={cm.stack(8)} data-testid="profile-page">
      <header
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-2xl text-white',
        )}
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 70%, var(--color-sidebar) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'h-20 w-20 rounded-2xl bg-surface/15 backdrop-blur-md flex items-center justify-center font-extrabold text-3xl',
          )}
        >
          {initial}
        </div>
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-white/70')}>
            {t('profile.eyebrow', {}, { defaultValue: 'Operator profile' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}
            data-testid="profile-name-display"
          >
            {displayName}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), 'text-white/80')}
            data-testid="profile-role-display"
          >
            {role}
          </p>
          {auth.user?.email && (
            <p
              className={cm.cn('font-mono text-xs text-white/60')}
              data-testid="profile-email-display"
            >
              {auth.user.email}
            </p>
          )}
        </div>
      </header>

      <section
        className={cm.cn('grid grid-cols-2 sm:grid-cols-4 gap-4')}
        data-testid="profile-kpis"
      >
        <FulfillmentKpiCard
          label={t('profile.kpis.fulfilled', {}, { defaultValue: 'Orders fulfilled' })}
          value={String(fulfilled)}
          tone="picking"
          icon="inventory_2"
        />
        <FulfillmentKpiCard
          label={t('profile.kpis.inFlight', {}, { defaultValue: 'In-flight orders' })}
          value={String(inFlight)}
          tone="primary"
          icon="speed"
        />
        <FulfillmentKpiCard
          label={t('profile.kpis.accuracy', {}, { defaultValue: 'Order accuracy' })}
          value={`${accuracyPct}%`}
          tone="success"
          icon="verified"
        />
        <FulfillmentKpiCard
          label={t('profile.kpis.skus', {}, { defaultValue: 'SKUs managed' })}
          value={String(invStats?.total ?? 0)}
          tone="info"
          icon="qr_code_2"
        />
      </section>

      <article
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          cm.stack(4),
        )}
        data-testid="profile-form"
      >
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('profile.editTitle', {}, { defaultValue: 'Operator details' })}
        </h2>
        <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('form.displayName', {}, { defaultValue: 'Display name' })}
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              data-testid="profile-name"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
          </label>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('form.role', {}, { defaultValue: 'Role' })}
            </span>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              data-testid="profile-role"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
          </label>
          <label className={cm.stack(2)}>
            <span
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-wider text-on-surface-variant',
              )}
            >
              {t('profile.field.shift', {}, { defaultValue: 'Shift window' })}
            </span>
            <input
              type="text"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              data-testid="profile-shift"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
          </label>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            data-testid="profile-save"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-lg bg-primary text-on-primary hover:opacity-95 disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
          </button>
          {savedAt && (
            <span className={cm.cn(cm.textSize('xs'), 'text-stock-in')} data-testid="profile-saved">
              {t(
                'common.savedAt',
                { time: savedAt.toLocaleTimeString() },
                { defaultValue: 'Saved at {{time}}' },
              )}
            </span>
          )}
          {error && (
            <span className={cm.cn(cm.textSize('xs'), 'text-error')} data-testid="profile-error">
              {error}
            </span>
          )}
        </div>
      </article>
    </div>
  )
}

export default Profile
