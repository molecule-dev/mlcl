import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents, formatDate } from '../lib/money.js'

interface ActivityRow {
  id: string
  group_id: string
  group_name: string
  kind: string
  payload: Record<string, unknown>
  created_at: string | null
}

interface FriendNet {
  name: string
  net_cents: number
  is_self: boolean
}

interface PendingSummary {
  friends: FriendNet[]
}

const KIND_ICONS: Record<string, string> = {
  group_created: 'group_add',
  member_added: 'person_add',
  member_removed: 'person_remove',
  expense_added: 'receipt_long',
  expense_deleted: 'delete',
  settlement_recorded: 'handshake',
}

/** Render one activity row's prose from its denormalized payload. */
function describe(row: ActivityRow, t: ReturnType<typeof useTranslation>['t']): string {
  const p = row.payload ?? {}
  switch (row.kind) {
    case 'group_created':
      return t(
        'activity.groupCreated',
        { actor: String(p.actor ?? 'Someone'), group: String(p.group_name ?? row.group_name) },
        { defaultValue: '{{actor}} created the group “{{group}}”' },
      )
    case 'member_added':
      return t(
        'activity.memberAdded',
        { actor: String(p.actor ?? 'Someone'), member: String(p.member_name ?? 'someone') },
        { defaultValue: '{{actor}} added {{member}}' },
      )
    case 'member_removed':
      return t(
        'activity.memberRemoved',
        { actor: String(p.actor ?? 'Someone') },
        { defaultValue: '{{actor}} removed a member' },
      )
    case 'expense_added':
      return t(
        'activity.expenseAdded',
        {
          actor: String(p.payer_name ?? p.actor ?? 'Someone'),
          description: String(p.description ?? ''),
          amount: formatCents(Number(p.amount_cents ?? 0)),
        },
        { defaultValue: '{{actor}} paid {{amount}} for {{description}}' },
      )
    case 'expense_deleted':
      return t(
        'activity.expenseDeleted',
        { actor: String(p.actor ?? 'Someone'), description: String(p.description ?? '') },
        { defaultValue: '{{actor}} deleted “{{description}}”' },
      )
    case 'settlement_recorded':
      return t(
        'activity.settlementRecorded',
        {
          from: String(p.from_name ?? 'someone'),
          to: String(p.to_name ?? 'someone'),
          amount: formatCents(Number(p.amount_cents ?? 0)),
        },
        { defaultValue: '{{from}} paid {{amount}} to {{to}}' },
      )
    default:
      return String(p.description ?? row.kind)
  }
}

export function Activity() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [pendingFriends, setPendingFriends] = useState<FriendNet[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<ActivityRow[]>('/api/activities?limit=100'),
      http.get<PendingSummary>('/api/dashboard/summary').catch(() => null),
    ])
      .then(([feed, summary]) => {
        if (cancelled) return
        setActivities(Array.isArray(feed?.data) ? (feed.data as ActivityRow[]) : [])
        const friends = (summary?.data as PendingSummary | null)?.friends ?? []
        setPendingFriends(friends.filter((f) => !f.is_self && f.net_cents !== 0))
        setError(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div data-mol-id="page-activity" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('activity.eyebrow', {}, { defaultValue: 'Everything that happened' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('activity.title', {}, { defaultValue: 'Activity' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'activity.subtitle',
            {},
            { defaultValue: 'Expenses, members, and settlements across all your groups.' },
          )}
        </p>
      </header>

      {error ? (
        <div
          data-mol-id="activity-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {t(
            'activity.loadFailed',
            {},
            { defaultValue: 'The feed is unavailable right now — refresh to retry.' },
          )}
        </div>
      ) : null}

      {/* Stitch panel — "Pending Actions": unsettled balances waiting on a
          reminder or a payment, derived from the live per-friend nets. */}
      <section
        data-mol-id="activity-pending-actions"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant/40',
          cm.stack(3),
        )}
      >
        <h2
          className={cm.cn(
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 2 }),
          )}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-8 w-8 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-primary',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>pending_actions</span>
          </span>
          {t('activity.pendingTitle', {}, { defaultValue: 'Pending Actions' })}
        </h2>
        {pendingFriends.length > 0 ? (
          <ul className={cm.stack(2)}>
            {pendingFriends.map((friend) => (
              <li
                key={friend.name}
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
                        'activity.pendingPay',
                        { name: friend.name, amount: formatCents(-friend.net_cents) },
                        { defaultValue: 'Pay {{name}} {{amount}}' },
                      )
                    : t(
                        'activity.pendingRemind',
                        { name: friend.name, amount: formatCents(friend.net_cents) },
                        { defaultValue: 'Remind {{name}} ({{amount}})' },
                      )}
                </span>
                <Link
                  to="/balances"
                  data-mol-id={`activity-pending-${friend.name}`}
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'text-primary-dark hover:underline shrink-0',
                  )}
                >
                  {t('activity.pendingOpen', {}, { defaultValue: 'Open balances' })}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'activity.pendingEmpty',
              {},
              { defaultValue: 'Nothing pending — every balance is settled.' },
            )}
          </p>
        )}
      </section>

      <ol data-mol-id="activity-feed" className={cm.cn(cm.stack(3))}>
        {activities.map((row) => (
          <li
            key={row.id}
            data-mol-id={`activity-${row.id}`}
            className={cm.cn(
              cm.flex({ align: 'start', gap: 'md' }),
              cm.sp('px', 5),
              cm.sp('py', 4),
              'rounded-2xl bg-surface border border-outline-variant/40',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-9 w-9 shrink-0 rounded-lg bg-primary-container text-on-primary-container',
              )}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>
                {KIND_ICONS[row.kind] ?? 'info'}
              </span>
            </span>
            <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
              <span className={cm.cn(cm.textSize('sm'))}>{describe(row, t)}</span>
              <Link
                to={`/groups/${row.group_id}`}
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 1),
                  'text-on-surface-variant hover:text-primary-dark hover:bg-surface-container-low',
                  'inline-flex items-center px-1.5 py-1.5 -ml-1.5 -mt-1 rounded-lg w-fit',
                )}
              >
                {row.group_name}
              </Link>
            </div>
            <time
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant shrink-0 tabular-nums')}
            >
              {row.created_at ? formatDate(row.created_at) : ''}
            </time>
          </li>
        ))}
      </ol>

      {loaded && activities.length === 0 && !error ? (
        <div
          data-mol-id="activity-empty"
          className={cm.cn(
            cm.sp('p', 10),
            cm.textCenter,
            'rounded-2xl bg-surface border border-dashed border-outline-variant',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl text-on-surface-variant')}
            aria-hidden="true"
          >
            notifications
          </span>
          <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 3), cm.fontWeight('semibold'))}>
            {t('activity.emptyTitle', {}, { defaultValue: 'Quiet for now' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'activity.emptyBody',
              {},
              { defaultValue: 'Group activity lands here as soon as it happens.' },
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}
