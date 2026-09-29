import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents, formatDate } from '../lib/money.js'

interface UserRecord extends UserProfile {
  username?: string
}

interface DashboardGroup {
  id: string
  name: string
  member_count: number
  my_balance_cents: number
  total_expenses_cents: number
}

interface DashboardActivity {
  id: string
  group_id: string
  group_name: string
  kind: string
  payload: Record<string, unknown>
  created_at: string | null
}

interface DashboardSummary {
  you_owe_cents: number
  you_are_owed_cents: number
  groups: DashboardGroup[]
  friends: { name: string; net_cents: number; is_self: boolean }[]
  recent_activities: DashboardActivity[]
}

const FALLBACK: DashboardSummary = {
  you_owe_cents: 0,
  you_are_owed_cents: 0,
  groups: [],
  friends: [],
  recent_activities: [],
}

const ACTIVITY_ICONS: Record<string, string> = {
  group_created: 'group_add',
  member_added: 'person_add',
  member_removed: 'person_remove',
  expense_added: 'receipt_long',
  expense_deleted: 'delete',
  settlement_recorded: 'handshake',
}

/* Stitch "Upcoming Recurring Bills" — a labeled SAMPLE schedule. bill-split
 * has no recurring-bills model, so this panel is explicitly marked as a
 * sample of what a subscription split looks like, never real user data. */
const SAMPLE_RECURRING_BILLS = [
  {
    icon: 'wifi',
    name: 'Spectrum 1Gbps',
    group: 'Bushwick (Apt 4B)',
    amount: '$80.00',
    split: 'Split 4 ways: $20.00 / person',
    due: 'Due in 4 days',
  },
  {
    icon: 'electric_bolt',
    name: 'ConEd Electric',
    group: 'Bushwick (Apt 4B)',
    amount: '$120.00',
    split: 'Split 3 ways: $40.00 / person',
    due: 'Due in 9 days',
  },
] as const

/** Time-boxed greeting — Stitch opens the dashboard with "Good morning, …". */
function greetingKey(
  hour: number,
): 'dashboard.greetingMorning' | 'dashboard.greetingAfternoon' | 'dashboard.greetingEvening' {
  if (hour < 12) return 'dashboard.greetingMorning'
  if (hour < 18) return 'dashboard.greetingAfternoon'
  return 'dashboard.greetingEvening'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserRecord>()
  const [summary, setSummary] = useState<DashboardSummary>(FALLBACK)
  const [error, setError] = useState<string | null>(null)

  const firstName = (user?.name ?? user?.username ?? '').trim().split(/\s+/)[0] ?? ''
  const netPositiveFriends = summary.friends.filter((f) => !f.is_self && f.net_cents > 0)
  const netNegativeFriends = summary.friends.filter((f) => !f.is_self && f.net_cents < 0)
  const squareAwayActions = [...netNegativeFriends, ...netPositiveFriends]

  useEffect(() => {
    let cancelled = false
    http
      .get<DashboardSummary>('/api/dashboard/summary')
      .then((response) => {
        if (cancelled) return
        const data = response?.data
        if (data && typeof data === 'object' && Array.isArray((data as DashboardSummary).groups)) {
          setSummary(data as DashboardSummary)
        }
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('summary')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const netCents = summary.you_are_owed_cents - summary.you_owe_cents

  return (
    <div data-mol-id="page-dashboard" className={cm.stack(8)}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('dashboard.eyebrow', {}, { defaultValue: 'Today, at a glance' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}
          >
            {t(
              greetingKey(new Date().getHours()),
              { name: firstName },
              {
                defaultValue:
                  firstName.length > 0 ? 'Good morning, {{name}} 👋' : 'Good morning 👋',
              },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {squareAwayActions.length > 0
              ? t(
                  'dashboard.settlementSuggestions',
                  {},
                  { defaultValue: 'Settlement suggestions are pending your quick approval.' },
                )
              : t(
                  'dashboard.allInSync',
                  {},
                  { defaultValue: 'All your shared ledgers are in sync.' },
                )}
          </p>
        </div>
        <Link
          to="/expenses/new"
          data-mol-id="dashboard-add-expense"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full text-white inline-flex items-center gap-2 transition-colors shadow-sm',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {t('dashboard.addExpense', {}, { defaultValue: 'Add expense' })}
        </Link>
      </header>

      {error ? (
        <div
          data-mol-id="dashboard-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {t(
            'dashboard.summaryFallback',
            {},
            { defaultValue: 'Live summary unavailable — please refresh to try again.' },
          )}
        </div>
      ) : null}

      <section
        data-mol-id="dashboard-balance-cards"
        className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}
      >
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-error-container/40 border border-error/30 text-on-surface',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span
              className={cm.cn('material-symbols-outlined text-lg text-error')}
              aria-hidden="true"
            >
              arrow_outward
            </span>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.youOwe', {}, { defaultValue: 'You owe' })}
            </p>
          </div>
          <p className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 3), 'font-extrabold tabular-nums')}>
            {formatCents(summary.you_owe_cents)}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.youOweHint',
              {},
              { defaultValue: 'Across all your groups, still to pay out.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-primary-container/50 border border-primary/30 text-on-surface',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            {/* arrow_outward + rotate: the shipped MaterialSymbolsOutlined
                subset has no `arrow_inward` ligature (it renders as literal
                text — caught in mobile QA), so mirror the proven glyph. */}
            <span
              className={cm.cn(
                'material-symbols-outlined text-lg text-primary inline-block rotate-180',
              )}
              aria-hidden="true"
            >
              arrow_outward
            </span>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.owedToYou', {}, { defaultValue: 'Owed to you' })}
            </p>
          </div>
          <p className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 3), 'font-extrabold tabular-nums')}>
            {formatCents(summary.you_are_owed_cents)}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'dashboard.owedHint',
              {},
              { defaultValue: 'Friends still owe you this across all groups.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40 text-on-surface',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span
              className={cm.cn('material-symbols-outlined text-lg text-on-surface-variant')}
              aria-hidden="true"
            >
              balance
            </span>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.net', {}, { defaultValue: 'Net position' })}
            </p>
          </div>
          <p
            className={cm.cn(
              cm.textSize('3xl'),
              cm.sp('mt', 3),
              'font-extrabold tabular-nums',
              netCents < 0 ? 'text-error' : netCents > 0 ? 'text-primary' : '',
            )}
          >
            {netCents < 0 ? '−' : ''}
            {formatCents(Math.abs(netCents))}
          </p>
          <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {netCents === 0
              ? t('dashboard.netSettled', {}, { defaultValue: 'All settled up. Nice.' })
              : netCents > 0
                ? t(
                    'dashboard.netPositive',
                    {},
                    { defaultValue: 'You are owed more than you owe.' },
                  )
                : t(
                    'dashboard.netNegative',
                    {},
                    { defaultValue: 'You owe more than you are owed.' },
                  )}
          </p>
        </div>
      </section>

      <section className={cm.stack(4)}>
        {/* Stitch card — "Ready to square away": cross-group 1-tap settlement
            suggestions derived from the real per-friend nets. */}
        <div
          data-mol-id="dashboard-square-away"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40',
            cm.stack(4),
          )}
        >
          <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-9 w-9 shrink-0 rounded-lg bg-primary-container text-on-primary-container',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>electric_bolt</span>
              </span>
              <div>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                  {t('dashboard.squareAway', {}, { defaultValue: 'Ready to square away' })}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'dashboard.squareAwayHint',
                    {},
                    { defaultValue: '1-tap settlement suggestions across your circles' },
                  )}
                </p>
              </div>
            </div>
            {squareAwayActions.length > 0 ? (
              <span
                className={cm.cn(
                  cm.sp('px', 2.5),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-primary-container text-on-primary-container',
                )}
              >
                {t(
                  'dashboard.squareAwayCount',
                  { count: squareAwayActions.length },
                  { defaultValue: '{{count}} actions' },
                )}
              </span>
            ) : null}
          </header>
          {squareAwayActions.length > 0 ? (
            <ul className={cm.stack(2)}>
              {squareAwayActions.map((friend) => (
                <li
                  key={friend.name}
                  data-mol-id={`dashboard-square-away-${friend.name}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-8 w-8 shrink-0 rounded-full text-[11px] font-bold uppercase',
                      friend.net_cents < 0
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-primary-container text-on-primary-container',
                    )}
                    aria-hidden="true"
                  >
                    {friend.name.slice(0, 2)}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.flex1, 'min-w-0')}>
                    {friend.net_cents < 0
                      ? t(
                          'dashboard.squareAwayPay',
                          { name: friend.name, amount: formatCents(-friend.net_cents) },
                          { defaultValue: 'Pay {{name}} {{amount}}' },
                        )
                      : t(
                          'dashboard.squareAwayRemind',
                          { name: friend.name, amount: formatCents(friend.net_cents) },
                          { defaultValue: 'Remind {{name}} ({{amount}})' },
                        )}
                  </span>
                  <Link
                    to="/balances"
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'rounded-full text-white transition-colors shrink-0',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
                    }}
                  >
                    {friend.net_cents < 0
                      ? t('dashboard.squareAwaySettle', {}, { defaultValue: 'Settle up' })
                      : t('dashboard.squareAwayView', {}, { defaultValue: 'View' })}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'dashboard.squareAwayEmpty',
                {},
                { defaultValue: 'Everyone is square — nothing to settle right now.' },
              )}
            </p>
          )}
        </div>

        {/* Stitch panel — "Upcoming Recurring Bills" (labeled sample). */}
        <div
          data-mol-id="dashboard-recurring-bills"
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-outline-variant/40',
            cm.stack(4),
          )}
        >
          <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-9 w-9 shrink-0 rounded-lg bg-secondary-container text-on-secondary-container',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>calendar_month</span>
              </span>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
                {t('dashboard.recurringBills', {}, { defaultValue: 'Upcoming Recurring Bills' })}
              </h3>
            </div>
            <span
              className={cm.cn(
                cm.sp('px', 2.5),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest rounded-full bg-surface-container-high text-on-surface-variant',
              )}
            >
              {t('dashboard.recurringSample', {}, { defaultValue: 'Sample schedule' })}
            </span>
          </header>
          <ul className={cm.stack(2)}>
            {SAMPLE_RECURRING_BILLS.map((bill) => (
              <li
                key={bill.name}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'rounded-xl bg-surface-container-low',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-lg bg-surface-container-high text-on-surface-variant',
                  )}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-base')}>{bill.icon}</span>
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(`dashboard.recurringBill.${bill.name}`, {}, { defaultValue: bill.name })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {bill.group} ·{' '}
                    {t(`dashboard.recurringSplit.${bill.name}`, {}, { defaultValue: bill.split })}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      'tabular-nums block',
                    )}
                  >
                    {bill.amount}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(`dashboard.recurringDue.${bill.name}`, {}, { defaultValue: bill.due })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-mol-id="dashboard-groups" className={cm.stack(4)}>
        <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.groups.title', {}, { defaultValue: 'Active Circles & Groups' })}
          </h2>
          <Link
            to="/groups"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary-dark hover:underline',
              'inline-flex items-center px-1.5 py-1.5 -my-1.5 -mx-1.5 rounded-lg',
            )}
          >
            {t('dashboard.groups.viewAll', {}, { defaultValue: 'View all groups' })}
          </Link>
        </header>
        <div
          className={cm.cn(
            'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
          )}
        >
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {summary.groups.map((group) => (
              <li key={group.id}>
                <Link
                  to={`/groups/${group.id}`}
                  data-mol-id={`dashboard-group-${group.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('px', 5),
                    cm.sp('py', 4),
                    'hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-9 w-9 shrink-0 rounded-lg bg-primary-container text-on-primary-container',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>group</span>
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface truncate',
                      )}
                    >
                      {group.name}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'dashboard.groups.memberCount',
                        { count: group.member_count },
                        { defaultValue: '{{count}} members' },
                      )}{' '}
                      ·{' '}
                      {t(
                        'dashboard.groups.totalExpenses',
                        { total: formatCents(group.total_expenses_cents) },
                        { defaultValue: '{{total}} tracked' },
                      )}
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      'text-base font-bold tabular-nums tracking-tight',
                      group.my_balance_cents < 0
                        ? 'text-error'
                        : group.my_balance_cents > 0
                          ? 'text-primary'
                          : 'text-on-surface-variant',
                    )}
                  >
                    {group.my_balance_cents < 0 ? '−' : ''}
                    {formatCents(Math.abs(group.my_balance_cents))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {summary.groups.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'dashboard.groups.empty',
                {},
                { defaultValue: 'No groups yet — create your first one from the Groups page.' },
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section data-mol-id="dashboard-recent-activity" className={cm.stack(4)}>
        <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.activity.title', {}, { defaultValue: 'Recent activity' })}
          </h2>
          <Link
            to="/activity"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-primary-dark hover:underline',
              'inline-flex items-center px-1.5 py-1.5 -my-1.5 -mx-1.5 rounded-lg',
            )}
          >
            {t('dashboard.activity.viewAll', {}, { defaultValue: 'View all activity' })}
          </Link>
        </header>
        <ul className={cm.cn(cm.stack(2))}>
          {summary.recent_activities.map((activity) => (
            <li
              key={activity.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('px', 5),
                cm.sp('py', 3),
                'rounded-xl bg-surface border border-outline-variant/40',
              )}
            >
              <span
                className={cm.cn(
                  'material-symbols-outlined text-lg text-on-surface-variant shrink-0',
                )}
                aria-hidden="true"
              >
                {ACTIVITY_ICONS[activity.kind] ?? 'info'}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.flex1, 'min-w-0 truncate')}>
                {String(activity.payload?.description ?? activity.group_name ?? '')}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant shrink-0')}>
                {activity.created_at ? formatDate(activity.created_at) : ''}
              </span>
            </li>
          ))}
          {summary.recent_activities.length === 0 ? (
            <li
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'dashboard.activity.empty',
                {},
                { defaultValue: 'Nothing yet — add an expense to get the feed going.' },
              )}
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  )
}
