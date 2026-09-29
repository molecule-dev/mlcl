import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InventoryKpiCard } from '../components/InventoryKpiCard.js'

interface WarehouseOption {
  id: string
  name: string
  code: string
}

/** Operator permission scope shown on the profile card. */
const PROFILE_PERMISSIONS: ReadonlyArray<{ key: string; label: string; granted: boolean }> = [
  { key: 'manageInventory', label: 'Manage Inventory', granted: true },
  { key: 'approveTransfers', label: 'Approve Transfers', granted: true },
  { key: 'viewCostData', label: 'View Cost Data', granted: true },
  { key: 'manageUsers', label: 'Manage Users', granted: false },
  { key: 'systemConfig', label: 'System Config', granted: false },
]

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth() as {
    user?: {
      id?: string
      name?: string
      email?: string
      avatar?: string
      role?: string
    }
  }
  const user = auth.user
  const name = user?.name ?? user?.email?.split('@')[0] ?? 'Operator'
  const email = user?.email ?? ''
  const role =
    user?.role ?? t('profile.contact.defaultRole', {}, { defaultValue: 'Operations Lead' })

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [warehousesLoaded, setWarehousesLoaded] = useState(false)
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string>('')
  const [savingPref, setSavingPref] = useState(false)
  const [savedAt, setSavedAt] = useState<number>(0)

  // The default warehouse lives in the server-side /preferences channel (the
  // platform user resource never returns app-specific oauthData on reads), so
  // seed the selection from there once it resolves — this is what makes the
  // choice survive a reload.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ defaultWarehouseId?: string | null }>('/preferences')
      .then((res) => {
        if (cancelled) return
        const persisted = res.data?.defaultWarehouseId ?? ''
        setDefaultWarehouseId(String(persisted))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    http
      .get<WarehouseOption[]>('/warehouses')
      .then((res) => {
        if (cancelled) return
        const data = Array.isArray(res.data) ? res.data : []
        setWarehouses(data)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setWarehousesLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const handleDefaultWarehouseChange = async (next: string) => {
    const previous = defaultWarehouseId
    setDefaultWarehouseId(next)
    setSavingPref(true)
    try {
      await http.patch('/preferences', { defaultWarehouseId: next || null })
      setSavedAt(Date.now())
    } catch (_error) {
      // Revert on failure — the select reflects the server's last known value.
      setDefaultWarehouseId(previous)
    } finally {
      setSavingPref(false)
    }
  }

  // Profile completeness: share of contact fields actually filled in.
  const completenessPct = Math.round(
    (100 * [name, email, role, defaultWarehouseId].filter((v) => Boolean(v)).length) / 4,
  )

  return (
    <div className={cm.stack(8)}>
      <header className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap')}>
        <span
          className={cm.cn(
            'h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-3xl font-extrabold',
            cm.flex({ align: 'center', justify: 'center' }),
            'shadow-lg shadow-primary/30',
          )}
        >
          {name
            .split(' ')
            .map((p) => p[0])
            .join('')}
        </span>
        <div className={cm.stack(1)}>
          <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
            {t('profile.eyebrow', {}, { defaultValue: 'Operator profile' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>{name}</h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {role} · {email}
          </p>
        </div>
      </header>

      <section className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
        <InventoryKpiCard
          label={t('profile.kpis.actions', {}, { defaultValue: 'Actions logged' })}
          value="412"
          tone="primary"
          icon="history"
          hint={t('profile.kpis.actionsHint', {}, { defaultValue: 'Past 30 days' })}
        />
        <InventoryKpiCard
          label={t('profile.kpis.transfers', {}, { defaultValue: 'Transfers managed' })}
          value="34"
          tone="info"
          icon="sync_alt"
        />
        <InventoryKpiCard
          label={t('profile.kpis.cycle', {}, { defaultValue: 'Cycle counts owned' })}
          value="9"
          tone="success"
          icon="verified"
          trend={{ value: '+2', positive: true }}
        />
      </section>

      <div className={cm.cn('grid lg:grid-cols-2 gap-6 [&>*]:min-w-0')}>
        <section
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('nav.contact', {}, { defaultValue: 'Contact' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('profile.contact.title', {}, { defaultValue: 'Personal details' })}
            </h2>
          </header>
          <FieldRow
            label={t('form.displayName', {}, { defaultValue: 'Display name' })}
            value={name}
          />
          <FieldRow
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            value={email}
          />
          <FieldRow label={t('form.role', {}, { defaultValue: 'Role' })} value={role} />
          <FieldRow
            label={t('profile.contact.warehouse', {}, { defaultValue: 'Default warehouse' })}
            value={defaultWarehouseId}
            // Only mount the real <select> once the warehouse options have
            // loaded. The select is a controlled component whose value can only
            // resolve to a warehouse id when the matching <option> exists, so
            // rendering it before the fetch would read back "" on reload. Tests
            // (and users) wait for the select to appear, so this also makes the
            // persisted-selection-across-reload behavior deterministic.
            loading={!warehousesLoaded}
            loadingLabel={t('common.loading', {}, { defaultValue: 'Loading…' })}
            input={{
              options: [
                {
                  value: '',
                  label: t(
                    'profile.contact.noDefaultWarehouse',
                    {},
                    { defaultValue: '— None selected —' },
                  ),
                },
                ...warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
              ],
              onChange: handleDefaultWarehouseChange,
              disabled: savingPref,
            }}
            footnote={savedAt ? t('common.saved', {}, { defaultValue: 'Saved' }) : undefined}
          />
        </section>

        <section
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('nav.security', {}, { defaultValue: 'Security' })}
            </p>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('profile.security.title', {}, { defaultValue: 'Sign-in & devices' })}
            </h2>
          </header>
          <ul
            className={cm.stack(3)}
            aria-label={t('nav.activeSessions', {}, { defaultValue: 'Active sessions' })}
          >
            <li
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('p', 3),
                'rounded-lg border border-outline-variant/60 bg-background-secondary',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-primary text-[20px]')}
                data-icon="laptop"
              >
                laptop
              </span>
              <div className={cm.cn('flex-1 min-w-0')}>
                <p className={cm.cn('text-sm font-semibold text-on-surface truncate')}>
                  {t(
                    'profile.security.thisSessionLabel',
                    { email },
                    { defaultValue: 'This browser · {{email}}' },
                  )}
                </p>
                <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                  {t(
                    'profile.security.thisSessionHint',
                    {},
                    { defaultValue: 'Signed in on this device' },
                  )}
                </p>
              </div>
              <span
                className={cm.cn('text-[10px] font-black uppercase tracking-wider')}
                style={{ color: 'var(--color-stock-in)' }}
              >
                {t('profile.security.active', {}, { defaultValue: 'active' })}
              </span>
            </li>
          </ul>
          <Link
            to="/forgot-password"
            data-testid="profile-change-password"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-lg border border-outline-variant text-on-surface hover:bg-background-secondary self-start',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="lock_reset">
              lock_reset
            </span>
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Link>
        </section>
      </div>

      {/* Account health + permission scope — profile posture at a glance */}
      <div className={cm.cn('grid lg:grid-cols-2 gap-6 [&>*]:min-w-0')}>
        <section
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
          data-mol-id="account-health"
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('profile.health.eyebrow', {}, { defaultValue: 'Standing' })}
            </p>
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('lg'),
                'font-extrabold tracking-tight',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-primary text-xl')}
              >
                health_and_safety
              </span>
              {t('profile.health.title', {}, { defaultValue: 'Account Health' })}
            </h2>
          </header>
          <div>
            <div
              className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'), cm.sp('mb', 2))}
            >
              <span className={cm.cn('text-on-surface-variant font-medium')}>
                {t('profile.health.completeness', {}, { defaultValue: 'Profile Completeness' })}
              </span>
              <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                {completenessPct}%
              </span>
            </div>
            <div className={cm.cn('w-full bg-surface-container rounded-full h-2 overflow-hidden')}>
              <div
                className={cm.cn('h-2 rounded-full bg-success')}
                style={{ width: `${completenessPct}%` }}
              />
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-lg bg-surface-container text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>password</span>
              </span>
              <div>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('profile.health.password', {}, { defaultValue: 'Password' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'profile.health.passwordHint',
                    {},
                    { defaultValue: 'Passphrase-protected sign-in' },
                  )}
                </p>
              </div>
            </div>
            <Link
              to="/forgot-password"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('profile.health.update', {}, { defaultValue: 'Update' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  cm.sp('p', 2),
                  'rounded-lg bg-surface-container text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-xl')}>devices</span>
              </span>
              <div>
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('profile.health.sessions', {}, { defaultValue: 'Active Sessions' })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t('profile.health.sessionsHint', {}, { defaultValue: 'Web & mobile' })}
                </p>
              </div>
            </div>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>1</span>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.stack(4),
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
          )}
          data-mol-id="permissions"
        >
          <header>
            <p
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
              )}
            >
              {t('profile.permissions.eyebrow', {}, { defaultValue: 'Scope' })}
            </p>
            <h2
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('lg'),
                'font-extrabold tracking-tight',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined text-on-surface-variant text-xl')}
              >
                shield_person
              </span>
              {t('profile.permissions.title', {}, { defaultValue: 'Permissions' })}
            </h2>
          </header>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
            {PROFILE_PERMISSIONS.map((perm) => (
              <span
                key={perm.key}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'rounded-full border',
                  perm.granted
                    ? 'bg-success-container text-on-success-container border-success/30'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant',
                )}
              >
                <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
                  {perm.granted ? 'check_circle' : 'cancel'}
                </span>
                {t(`profile.permissions.${perm.key}`, {}, { defaultValue: perm.label })}
              </span>
            ))}
          </div>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'profile.permissions.footnote',
              {},
              {
                defaultValue: 'Contact your administrator to request additional permissions.',
              },
            )}
          </p>
        </section>
      </div>
    </div>
  )
}

interface FieldRowProps {
  label: string
  value: string
  input?: {
    options: Array<{ value: string; label: string }>
    onChange: (value: string) => void
    disabled?: boolean
  }
  footnote?: string
  /** When true, render a placeholder instead of the real <select> (options not yet loaded). */
  loading?: boolean
  loadingLabel?: string
}

function FieldRow({ label, value, input, footnote, loading, loadingLabel }: FieldRowProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), 'flex-wrap')}
    >
      <p
        className={cm.cn(
          'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant',
        )}
      >
        {label}
      </p>
      {input ? (
        loading ? (
          // No testid here: tests + users wait for the real <select> to appear,
          // which only happens once the options have loaded and the controlled
          // value can resolve to a matching <option>.
          <p className={cm.cn('text-sm font-semibold text-on-surface-variant')}>
            {loadingLabel ?? '…'}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <select
              data-testid="profile-default-warehouse"
              value={value}
              onChange={(e) => input.onChange(e.target.value)}
              disabled={input.disabled}
              className={cm.cn(
                'text-sm font-semibold text-on-surface bg-background-secondary border border-outline-variant rounded-md px-3 py-1',
              )}
            >
              {input.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {footnote ? (
              <span
                data-testid="profile-default-warehouse-saved"
                className={cm.cn('text-[10px] uppercase tracking-wider text-on-surface-variant')}
              >
                {footnote}
              </span>
            ) : null}
          </div>
        )
      ) : (
        <p className={cm.cn('text-sm font-semibold text-on-surface')}>{value}</p>
      )}
    </div>
  )
}

export default Profile
