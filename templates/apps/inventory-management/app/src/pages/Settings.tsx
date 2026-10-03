import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

const NAV = [
  { id: 'team', icon: 'group', labelKey: 'settings.nav.team', labelDefault: 'Team & roles' },
  {
    id: 'security',
    icon: 'shield_person',
    labelKey: 'settings.nav.security',
    labelDefault: 'Security',
  },
  {
    id: 'locations',
    icon: 'warehouse',
    labelKey: 'settings.nav.locations',
    labelDefault: 'Locations',
  },
  {
    id: 'integrations',
    icon: 'integration_instructions',
    labelKey: 'settings.nav.integrations',
    labelDefault: 'Integrations',
  },
  {
    id: 'notifications',
    icon: 'notifications_active',
    labelKey: 'settings.nav.notifications',
    labelDefault: 'Alert rules',
  },
  {
    id: 'appearance',
    icon: 'palette',
    labelKey: 'settings.nav.appearance',
    labelDefault: 'Appearance',
  },
  { id: 'language', icon: 'language', labelKey: 'settings.nav.language', labelDefault: 'Language' },
  { id: 'billing', icon: 'payments', labelKey: 'settings.nav.billing', labelDefault: 'Billing' },
] as const

interface BillingLimits {
  maxAlerts?: number
  maxProducts?: number
  maxStock?: number
  maxTransfers?: number
  maxWarehouses?: number
  advancedFeatures?: boolean
  canExport?: boolean
  retentionDays?: number
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  limits: BillingLimits
  isFree: boolean
}

interface ApiAlertRule {
  id: string
  type: string
  threshold: number
  enabled: boolean
  notify_email: string | null
}

interface BuiltInRuleDefinition {
  id: string
  type: string
  threshold: number
  notifyEmail: string | null
  labelKey: string
  labelDefault: string
  hintKey: string
  hintDefault: string
}

const BUILT_IN_RULES: BuiltInRuleDefinition[] = [
  {
    id: 'low',
    type: 'low_stock',
    threshold: 10,
    notifyEmail: null,
    labelKey: 'settings.notifications.rules.low.label',
    labelDefault: 'Low-stock threshold breached',
    hintKey: 'settings.notifications.rules.low.hint',
    hintDefault: 'Triggers when on-hand drops below the per-SKU reorder point.',
  },
  {
    id: 'out',
    type: 'out_of_stock',
    threshold: 0,
    notifyEmail: null,
    labelKey: 'settings.notifications.rules.out.label',
    labelDefault: 'SKU goes out of stock',
    hintKey: 'settings.notifications.rules.out.hint',
    hintDefault: 'Triggers the moment any warehouse hits zero on hand.',
  },
  {
    id: 'variance',
    type: 'variance',
    threshold: 2,
    notifyEmail: null,
    labelKey: 'settings.notifications.rules.variance.label',
    labelDefault: 'Cycle-count variance > 2%',
    hintKey: 'settings.notifications.rules.variance.hint',
    hintDefault: 'Pings the floor lead when an audit drifts more than 2% from system.',
  },
]

interface AuthUser {
  id?: string
  name?: string
  email?: string
  role?: string
}

interface IntegrationDef {
  id: string
  name: string
  detail: string
}

const INTEGRATIONS: IntegrationDef[] = [
  { id: 'shopify', name: 'Shopify', detail: 'Sync product catalog + sales orders' },
  { id: 'netsuite', name: 'NetSuite', detail: 'Mirror inventory + accounting movements' },
  { id: 'quickbooks', name: 'QuickBooks Online', detail: 'Cost-of-goods + invoice posting' },
  { id: 'easypost', name: 'EasyPost', detail: 'Carrier rates + tracking events' },
]

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

function formatPlanLabel(t: TranslateFn, status: BillingStatus | null): string {
  if (!status) return t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
  return status.name
}

function formatLimit(value: number | undefined, t: TranslateFn): string {
  if (value === undefined || value === null) return '—'
  if (value >= 999_000) return t('settings.billing.unlimited', {}, { defaultValue: 'Unlimited' })
  return new Intl.NumberFormat().format(value)
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth() as { user?: AuthUser; setUser?: (next: unknown) => void }
  const user = auth.user
  const [active, setActive] = useState<(typeof NAV)[number]['id']>('team')

  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [billingError, setBillingError] = useState<string>('')

  const [rules, setRules] = useState<ApiAlertRule[]>([])
  const [savingRule, setSavingRule] = useState<string>('')

  // Integration link states live in the server-side /preferences channel (the
  // platform user resource never returns app-specific oauthData on reads), so
  // the toggles seed from there and persist via PATCH /preferences.
  const [integrations, setIntegrations] = useState<Record<string, string>>({})
  const [savingIntegration, setSavingIntegration] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    http
      .get<BillingStatus>('/billing/status')
      .then((res) => {
        if (!cancelled) setBilling(res.data)
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setBillingError(err instanceof Error ? err.message : 'Failed to load billing')
      })
    http
      .get<ApiAlertRule[]>('/alerts/rules')
      .then((res) => {
        if (!cancelled) setRules(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => undefined)
    http
      .get<{ integrations?: Record<string, { status?: string }> }>('/preferences')
      .then((res) => {
        if (cancelled) return
        const stored = res.data?.integrations ?? {}
        const next: Record<string, string> = {}
        for (const it of INTEGRATIONS) {
          next[it.id] = stored[it.id]?.status ?? 'available'
        }
        setIntegrations(next)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [http])

  // Ensure each built-in rule has a backing record. Lazy create on first toggle.
  const ruleByType = (type: string): ApiAlertRule | undefined => rules.find((r) => r.type === type)

  const toggleRule = async (def: BuiltInRuleDefinition, nextEnabled: boolean) => {
    setSavingRule(def.id)
    try {
      const existing = ruleByType(def.type)
      if (existing) {
        const updated = await http.put<ApiAlertRule>(`/alerts/rules/${existing.id}`, {
          enabled: nextEnabled,
        })
        setRules((prev) => prev.map((r) => (r.id === existing.id ? updated.data : r)))
      } else {
        const created = await http.post<ApiAlertRule>('/alerts/rules', {
          type: def.type,
          threshold: def.threshold,
          notify_email: def.notifyEmail,
        })
        const initial = created.data
        if (!nextEnabled) {
          const updated = await http.put<ApiAlertRule>(`/alerts/rules/${initial.id}`, {
            enabled: false,
          })
          setRules((prev) => [...prev, updated.data])
        } else {
          setRules((prev) => [...prev, initial])
        }
      }
    } finally {
      setSavingRule('')
    }
  }

  const updateIntegration = async (id: string, nextStatus: string) => {
    setSavingIntegration(id)
    const prev = integrations[id] ?? 'available'
    const currentStatuses = integrations
    setIntegrations((current) => ({ ...current, [id]: nextStatus }))
    try {
      // Merge against the current client state and send the WHOLE
      // integrations slice — the server stores top-level keys verbatim.
      const mergedMap: Record<string, { status: string; updated_at: string }> = {}
      for (const it of INTEGRATIONS) {
        const status = it.id === id ? nextStatus : (currentStatuses[it.id] ?? 'available')
        if (status !== 'available') {
          mergedMap[it.id] = { status, updated_at: new Date().toISOString() }
        }
      }
      await http.patch('/preferences', { integrations: mergedMap })
    } catch (_error) {
      // optimistic update failed; revert integration state to previous value
      setIntegrations((current) => ({ ...current, [id]: prev }))
    } finally {
      setSavingIntegration('')
    }
  }

  return (
    <div className={cm.stack(6)}>
      <header className={cm.stack(1)}>
        <p className={cm.cn('text-[11px] font-bold uppercase tracking-[0.22em] text-primary')}>
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            {},
            {
              defaultValue:
                'Team, warehouses, integrations, and the alert rules that keep operations honest.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn('grid lg:grid-cols-[240px_1fr] gap-6 items-start [&>*]:min-w-0')}>
        <aside
          className={cm.cn(
            cm.stack(1),
            cm.sp('p', 4),
            'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest sticky top-24',
          )}
        >
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-md text-left transition-colors',
                active === item.id
                  ? 'bg-primary/10 text-primary border-l-[3px] border-primary'
                  : 'text-on-surface-variant hover:bg-background-secondary hover:text-on-surface',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[18px]')}
                data-icon={item.icon}
              >
                {item.icon}
              </span>
              {t(item.labelKey, {}, { defaultValue: item.labelDefault })}
            </button>
          ))}
        </aside>

        <section className={cm.stack(6)}>
          {active === 'team' && (
            <Card
              title={t('settings.team.title', {}, { defaultValue: 'Team & roles' })}
              description={t(
                'settings.team.description',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'You are the owner of this {{appName}} workspace. Multi-seat team management is on the roadmap — for now every signed-in user owns their own ledger.',
                },
              )}
            >
              <div className={cm.cn('overflow-x-auto')}>
                <table
                  className={cm.cn(cm.w('full'), 'text-left')}
                  aria-label={t('settings.team.title', {}, { defaultValue: 'Team & roles' })}
                >
                  <thead>
                    <tr
                      className={cm.cn(
                        'border-b border-outline-variant/40 text-[10px] font-black uppercase tracking-[0.16em] text-on-surface-variant',
                      )}
                    >
                      <th className={cm.cn('py-2')}>
                        {t('status.member', {}, { defaultValue: 'Member' })}
                      </th>
                      <th className={cm.cn('py-2')}>
                        {t('form.role', {}, { defaultValue: 'Role' })}
                      </th>
                      <th className={cm.cn('py-2 text-right')}>
                        {t('settings.team.col.action', {}, { defaultValue: 'Action' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cm.cn('divide-y divide-outline-variant/40')}>
                    <tr
                      data-testid="settings-team-row-self"
                      className={cm.cn('hover:bg-background-secondary transition-colors')}
                    >
                      <td className={cm.cn('py-3')}>
                        <p className={cm.cn('text-sm font-semibold text-on-surface')}>
                          {user?.name ?? user?.email ?? t('nav.you', {}, { defaultValue: 'You' })}
                        </p>
                        <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                          {user?.email ?? '—'}
                        </p>
                      </td>
                      <td className={cm.cn('py-3 text-sm text-on-surface')}>
                        {t('settings.team.role.owner', {}, { defaultValue: 'Owner' })}
                      </td>
                      <td className={cm.cn('py-3 text-right')}>
                        <Link
                          to="/profile"
                          data-testid="settings-team-edit-self"
                          className={cm.cn(
                            'text-[10px] font-black uppercase tracking-wider text-primary hover:underline',
                          )}
                        >
                          {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {active === 'security' && (
            <Card
              title={t('settings.security.title', {}, { defaultValue: 'Security' })}
              description={t(
                'settings.security.description',
                {},
                { defaultValue: 'Manage your password and authentication methods.' },
              )}
            >
              <div className={cm.stack(4)}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('pb', 4),
                    'border-b border-outline-variant/40',
                  )}
                >
                  <div>
                    <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {t('settings.security.password', {}, { defaultValue: 'Password' })}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                        cm.sp('mt', 1),
                      )}
                    >
                      {t(
                        'settings.security.passwordHint',
                        {},
                        {
                          defaultValue:
                            'Use a long, unique passphrase you never reuse anywhere else.',
                        },
                      )}
                    </p>
                  </div>
                  <Link
                    to="/forgot-password"
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-primary hover:underline shrink-0',
                    )}
                  >
                    {t('settings.security.changePassword', {}, { defaultValue: 'Change Password' })}
                  </Link>
                </div>
                <TwoFactorRow />
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
                  <div>
                    <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {t('settings.security.sessions', {}, { defaultValue: 'Active Sessions' })}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                        cm.sp('mt', 1),
                      )}
                    >
                      {t(
                        'settings.security.sessionsHint',
                        {},
                        { defaultValue: 'This browser is your one active session.' },
                      )}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-primary hover:underline shrink-0',
                    )}
                  >
                    {t('settings.security.manageSessions', {}, { defaultValue: 'View profile' })}
                  </Link>
                </div>
              </div>
            </Card>
          )}
          {active === 'locations' && (
            <Card
              title={t('settings.locations.title', {}, { defaultValue: 'Warehouse locations' })}
              description={t(
                'settings.locations.description',
                {},
                {
                  defaultValue:
                    'Pin shipping addresses, time zones, and default zone configurations per site.',
                },
              )}
            >
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'settings.locations.body',
                  {},
                  {
                    defaultValue:
                      'Open the Warehouses console to add a site, edit its capacity, or remove a stale location. Changes there propagate across the entire ledger.',
                  },
                )}
              </p>
              <Link
                to="/warehouses"
                data-testid="settings-add-warehouse"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95 self-start',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  data-icon="add_business"
                >
                  add_business
                </span>
                {t('settings.locations.add', {}, { defaultValue: 'Manage warehouses' })}
              </Link>
            </Card>
          )}
          {active === 'integrations' && (
            <Card
              title={t('nav.integrations', {}, { defaultValue: 'Integrations' })}
              description={t(
                'settings.integrations.description',
                {},
                { defaultValue: 'Channels, ERPs, accounting, and shipping providers.' },
              )}
            >
              <ul className={cm.cn('grid sm:grid-cols-2 gap-3')}>
                {INTEGRATIONS.map((it) => {
                  const status = integrations[it.id] ?? 'available'
                  const tone =
                    status === 'connected'
                      ? 'var(--color-stock-in)'
                      : status === 'pending'
                        ? 'var(--color-stock-low)'
                        : 'var(--color-stock-reserved)'
                  const nextStatus = status === 'connected' ? 'available' : 'connected'
                  const buttonLabel =
                    status === 'connected'
                      ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                      : t('common.connect', {}, { defaultValue: 'Connect' })
                  return (
                    <li
                      key={it.id}
                      className={cm.cn(
                        cm.flex({ align: 'start', gap: 'sm' }),
                        cm.sp('p', 4),
                        'rounded-xl border border-outline-variant/60 bg-background-secondary',
                      )}
                    >
                      <span
                        className={cm.cn(
                          'h-9 w-9 rounded-lg',
                          cm.flex({ align: 'center', justify: 'center' }),
                          'bg-primary/10 text-primary',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[18px]')}
                          data-icon="sync"
                        >
                          sync
                        </span>
                      </span>
                      <div className={cm.cn('flex-1')}>
                        <p className={cm.cn('text-sm font-bold text-on-surface')}>{it.name}</p>
                        <p className={cm.cn('text-[11px] text-on-surface-variant')}>{it.detail}</p>
                        <span
                          data-testid={`settings-integration-status-${it.id}`}
                          className={cm.cn(
                            'text-[10px] font-black uppercase tracking-wider mt-1 inline-block',
                          )}
                          style={{ color: tone }}
                        >
                          {t(
                            `settings.integrations.status.${status}`,
                            {},
                            { defaultValue: status },
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-testid={`settings-integration-toggle-${it.id}`}
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-wider text-primary hover:underline disabled:opacity-50',
                        )}
                        disabled={savingIntegration === it.id}
                        onClick={() => updateIntegration(it.id, nextStatus)}
                      >
                        {savingIntegration === it.id
                          ? t('settings.integrations.saving', {}, { defaultValue: 'Saving…' })
                          : buttonLabel}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
          {active === 'notifications' && (
            <Card
              title={t('settings.notifications.title', {}, { defaultValue: 'Alert rules' })}
              description={t(
                'settings.notifications.description',
                {},
                { defaultValue: 'Choose which signals trigger Slack DMs, emails, or floor pages.' },
              )}
            >
              <ul className={cm.stack(3)}>
                {BUILT_IN_RULES.map((def) => {
                  const existing = ruleByType(def.type)
                  const enabled = existing ? existing.enabled : true
                  return (
                    <li
                      key={def.id}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('p', 4),
                        'rounded-xl border border-outline-variant/60 bg-background-secondary',
                      )}
                    >
                      <div>
                        <p className={cm.cn('text-sm font-semibold text-on-surface')}>
                          {t(def.labelKey, {}, { defaultValue: def.labelDefault })}
                        </p>
                        <p className={cm.cn('text-[11px] text-on-surface-variant')}>
                          {t(def.hintKey, {}, { defaultValue: def.hintDefault })}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        disabled={savingRule === def.id}
                        onChange={(e) => toggleRule(def, (e.target as HTMLInputElement).checked)}
                        testId={`settings-rule-${def.id}`}
                        aria-label={t(def.labelKey, {}, { defaultValue: def.labelDefault })}
                      />
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
          {active === 'appearance' && (
            <Card
              title={t('nav.appearance', {}, { defaultValue: 'Appearance' })}
              description={t(
                'common.toggleLightDark',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            >
              <ThemeToggle />
            </Card>
          )}
          {active === 'language' && (
            <Card
              title={t('footer.language', {}, { defaultValue: 'Language' })}
              description={t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            >
              <LanguagePicker />
            </Card>
          )}
          {active === 'billing' && (
            <Card
              title={t('settings.billing', {}, { defaultValue: 'Billing' })}
              description={t(
                'settings.billing.description',
                {},
                { defaultValue: 'Plan, payment method, and invoice history.' },
              )}
            >
              {billingError ? (
                <p data-testid="settings-billing-error" className={cm.cn('text-sm text-error')}>
                  {billingError}
                </p>
              ) : null}
              <div className={cm.cn('grid sm:grid-cols-2 gap-3')}>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/60 bg-background-secondary',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-bold uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {t('nav.plan', {}, { defaultValue: 'Plan' })}
                  </p>
                  <p
                    data-testid="settings-billing-plan"
                    className={cm.cn('text-sm font-bold text-on-surface mt-1')}
                  >
                    {formatPlanLabel(t, billing)}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/60 bg-background-secondary',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-bold uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {t('settings.billing.tier', {}, { defaultValue: 'Tier' })}
                  </p>
                  <p
                    data-testid="settings-billing-tier"
                    className={cm.cn('text-sm font-bold text-on-surface mt-1')}
                  >
                    {billing?.category ?? '—'}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/60 bg-background-secondary',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-bold uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {t('settings.billing.warehouseLimit', {}, { defaultValue: 'Warehouse limit' })}
                  </p>
                  <p
                    data-testid="settings-billing-warehouse-limit"
                    className={cm.cn('text-sm font-bold text-on-surface mt-1')}
                  >
                    {formatLimit(billing?.limits.maxWarehouses, t)}
                  </p>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/60 bg-background-secondary',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-bold uppercase tracking-wider text-on-surface-variant',
                    )}
                  >
                    {t('settings.billing.skuLimit', {}, { defaultValue: 'SKU limit' })}
                  </p>
                  <p
                    data-testid="settings-billing-sku-limit"
                    className={cm.cn('text-sm font-bold text-on-surface mt-1')}
                  >
                    {formatLimit(billing?.limits.maxProducts, t)}
                  </p>
                </div>
              </div>
              <Link
                to="/pricing"
                data-testid="settings-billing-cta"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow shadow-primary/30 hover:opacity-95 self-start',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-[18px]')}
                  data-icon="upgrade"
                >
                  upgrade
                </span>
                {t('settings.billing.viewPlans', {}, { defaultValue: 'See plans' })}
              </Link>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

interface CardProps {
  title: string
  description: string
  children: React.ReactNode
}

/** Two-Factor Authentication row with a persisted-per-session toggle. */
function TwoFactorRow() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('pb', 4),
        'border-b border-outline-variant/40',
      )}
    >
      <div>
        <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
          {t('settings.security.twoFactor', {}, { defaultValue: 'Two-Factor Authentication' })}
        </h3>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.security.twoFactorHint',
            {},
            { defaultValue: 'Add an extra layer of security to your account.' },
          )}
        </p>
      </div>
      <Switch
        checked={enabled}
        onChange={(e) => setEnabled((e.target as HTMLInputElement).checked)}
        data-mol-id="two-factor-toggle"
        aria-label={t(
          'settings.security.twoFactor',
          {},
          { defaultValue: 'Two-Factor Authentication' },
        )}
      />
    </div>
  )
}

function Card({ title, description, children }: CardProps) {
  const cm = getClassMap()
  return (
    <article
      className={cm.cn(
        cm.stack(4),
        cm.sp('p', 6),
        'rounded-2xl border border-outline-variant/60 bg-surface-container-lowest',
      )}
    >
      <header className={cm.stack(1)}>
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>{title}</h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{description}</p>
      </header>
      {children}
    </article>
  )
}

export default Settings
