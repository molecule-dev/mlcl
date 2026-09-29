import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { formatCents } from '../lib/money.js'

interface FriendRow {
  id: string
  name: string
  email: string | null
  is_self: boolean
  created_at: string | null
}

interface SharedCircle {
  id: string
  name: string
  member_count: number
}

interface FriendNet {
  name: string
  net_cents: number
  is_self: boolean
}

interface SettleSummary {
  friends: FriendNet[]
}

export function Friends() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [circles, setCircles] = useState<SharedCircle[]>([])
  const [pendingFriends, setPendingFriends] = useState<FriendNet[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  /** Two-step remove: the friend id awaiting its confirm click. */
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<FriendRow[]>('/api/friends'),
      http
        .get<{ id: string; name: string; member_count: number }[]>('/api/groups')
        .catch(() => null),
      http.get<SettleSummary>('/api/dashboard/summary').catch(() => null),
    ])
      .then(([friendRes, groupsRes, summaryRes]) => {
        if (cancelled) return
        setFriends(Array.isArray(friendRes?.data) ? (friendRes.data as FriendRow[]) : [])
        const groups = Array.isArray(groupsRes?.data) ? (groupsRes.data as SharedCircle[]) : []
        setCircles(groups)
        const nets = (summaryRes?.data as SettleSummary | null)?.friends ?? []
        setPendingFriends(nets.filter((f) => !f.is_self && f.net_cents !== 0))
        setLoadError(false)
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function reload(): Promise<void> {
    const response = await http.get<FriendRow[]>('/api/friends')
    setFriends(Array.isArray(response?.data) ? (response.data as FriendRow[]) : [])
  }

  async function handleAdd(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setAdding(true)
    setError(null)
    setNotice(null)
    try {
      const response = await http.post<{ reused?: boolean }>('/api/friends', { name, email })
      track({
        name: 'friend.added',
        properties: { name, reused: (response?.data as { reused?: boolean })?.reused === true },
      })
      setName('')
      setEmail('')
      if ((response?.data as { reused?: boolean })?.reused) {
        setNotice(
          t(
            'friends.reused',
            {},
            { defaultValue: 'That email was already in your list — nothing duplicated.' },
          ),
        )
      }
      await reload()
    } catch (err) {
      console.warn('Friend add failed', err)
      setError(
        t('friends.addFailed', {}, { defaultValue: 'Could not add that friend. Check the email.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(friendId: string): Promise<void> {
    setError(null)
    setNotice(null)
    setRemovingId(friendId)
    try {
      await http.delete(`/api/friends/${friendId}`)
      track({ name: 'friend.removed', properties: { friend_id: friendId } })
      setConfirmRemoveId(null)
      await reload()
    } catch (err) {
      console.warn('Friend remove failed', err)
      setError(t('friends.removeFailed', {}, { defaultValue: 'Could not remove that friend.' }))
    } finally {
      setRemovingId(null)
    }
  }

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    cm.textSize('sm'),
    'rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
  )
  const labelClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('bold'),
    'uppercase tracking-widest text-on-surface-variant',
  )

  return (
    <div data-mol-id="page-friends" className={cm.stack(8)}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('friends.eyebrow', {}, { defaultValue: 'Your address book' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.sp('mt', 1), 'font-extrabold tracking-tight')}>
          {t('friends.title', {}, { defaultValue: 'Friends & Co-Splitters' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'friends.subtitle',
            {},
            {
              defaultValue:
                'The people you split with. Add them once by email and drop them into any group.',
            },
          )}
        </p>
      </header>

      {loadError ? (
        <div
          data-mol-id="friends-load-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-warning-container/40 text-on-warning-container',
          )}
        >
          {t(
            'friends.loadFailed',
            {},
            { defaultValue: 'Friends could not be loaded — refresh to retry.' },
          )}
        </div>
      ) : null}

      {error ? (
        <div
          data-mol-id="friends-error"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          data-mol-id="friends-notice"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-primary-container/40 text-on-primary-container',
          )}
        >
          {notice}
        </div>
      ) : null}

      <form
        onSubmit={handleAdd}
        data-mol-id="form-add-friend"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface border border-outline-variant/40',
          'space-y-4',
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
            <span className={cm.cn('material-symbols-outlined text-base')}>person_add</span>
          </span>
          {t(
            'friends.inviteTitle',
            { app: 'Evenly' },
            { defaultValue: 'Invite Friends to {{app}}' },
          )}
        </h2>
        <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label htmlFor="friend-name" className={labelClass}>
              {t('friends.name', {}, { defaultValue: 'Name' })}
            </label>
            <input
              id="friend-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder={t('friends.namePlaceholder', {}, { defaultValue: 'Priya Nair' })}
              className={inputClass}
            />
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label htmlFor="friend-email" className={labelClass}>
              {t('friends.email', {}, { defaultValue: 'Email' })}
            </label>
            <input
              id="friend-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('friends.emailPlaceholder', {}, { defaultValue: 'priya@example.com' })}
              className={inputClass}
            />
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs', justify: 'end' }))}>
            <button
              type="submit"
              data-mol-id="btn-submit-friend"
              disabled={adding}
              className={cm.cn(
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full text-white shadow-md shadow-primary/20 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary-hover), var(--color-gradient-end))',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                person_add
              </span>
              {adding
                ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                : t('friends.add', {}, { defaultValue: 'Add friend' })}
            </button>
          </div>
        </div>
      </form>

      {/* Stitch panel — "Quick Settle Center": one-tap access to every
          unsettled balance, derived from the live per-friend nets. */}
      <section
        data-mol-id="friends-quick-settle"
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
              'h-8 w-8 rounded-lg bg-[color-mix(in_srgb,var(--color-tertiary)_10%,transparent)] text-tertiary',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>handshake</span>
          </span>
          {t('friends.quickSettleTitle', {}, { defaultValue: 'Quick Settle Center' })}
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
                <span className={cm.cn(cm.textSize('sm'), cm.flex1, 'min-w-0 truncate')}>
                  {friend.net_cents < 0
                    ? t(
                        'friends.quickSettlePay',
                        { name: friend.name, amount: formatCents(-friend.net_cents) },
                        { defaultValue: 'You owe {{name}} {{amount}}' },
                      )
                    : t(
                        'friends.quickSettleRemind',
                        { name: friend.name, amount: formatCents(friend.net_cents) },
                        { defaultValue: '{{name}} owes you {{amount}}' },
                      )}
                </span>
                <Link
                  to="/balances"
                  data-mol-id={`friends-settle-${friend.name}`}
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
                  {t('friends.quickSettleAction', {}, { defaultValue: 'Settle up' })}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'friends.quickSettleEmpty',
              {},
              { defaultValue: 'Everyone is settled — nothing to chase.' },
            )}
          </p>
        )}
      </section>

      {/* Stitch panel — "Shared Circles": the groups these friends split in. */}
      <section
        data-mol-id="friends-shared-circles"
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
              'h-8 w-8 rounded-lg bg-surface-container-high text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-base')}>group</span>
          </span>
          {t('friends.sharedCirclesTitle', {}, { defaultValue: 'Shared Circles' })}
        </h2>
        {circles.length > 0 ? (
          <ul className={cm.flex({ wrap: 'wrap', gap: 'sm' })}>
            {circles.map((circle) => (
              <li key={circle.id}>
                <Link
                  to={`/groups/${circle.id}`}
                  data-mol-id={`friends-circle-${circle.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-full bg-surface-container-low border border-outline-variant/50 text-on-surface hover:border-outline transition-colors',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-base text-primary')}
                    aria-hidden="true"
                  >
                    group
                  </span>
                  {circle.name}
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'friends.circleMembers',
                      { count: circle.member_count },
                      { defaultValue: '{{count}} members' },
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'friends.sharedCirclesEmpty',
              {},
              { defaultValue: 'Create a circle and your friends join it there.' },
            )}
          </p>
        )}
      </section>

      <section data-mol-id="friends-list" className={cm.stack(4)}>
        <header className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('friends.listTitle', {}, { defaultValue: 'People you split with' })}
          </h2>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('friends.count', { count: friends.length }, { defaultValue: '{{count}} friends' })}
          </span>
        </header>
        <div
          className={cm.cn(
            'rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
          )}
        >
          <ul className={cm.cn('divide-y divide-outline-variant/40')}>
            {friends.map((friend) => (
              <li
                key={friend.id}
                data-mol-id={`friend-row-${friend.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'hover:bg-surface-container-low transition-colors',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'h-9 w-9 shrink-0 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase',
                  )}
                  aria-hidden="true"
                >
                  {friend.name.slice(0, 2)}
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {friend.name}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                    {friend.email ?? ''}
                  </span>
                </div>
                {confirmRemoveId === friend.id ? (
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'shrink-0')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant whitespace-nowrap',
                      )}
                    >
                      {t('friends.removeConfirmLabel', {}, { defaultValue: 'Remove?' })}
                    </span>
                    <button
                      type="button"
                      data-mol-id={`btn-confirm-remove-friend-${friend.id}`}
                      disabled={removingId === friend.id}
                      onClick={() => void handleRemove(friend.id)}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'rounded-lg bg-error text-on-error transition-opacity disabled:opacity-60',
                      )}
                    >
                      {removingId === friend.id
                        ? t('common.removingEllipsis', {}, { defaultValue: 'Removing…' })
                        : t('friends.removeConfirm', {}, { defaultValue: 'Yes, remove' })}
                    </button>
                    <button
                      type="button"
                      data-mol-id={`btn-cancel-remove-friend-${friend.id}`}
                      onClick={() => setConfirmRemoveId(null)}
                      aria-label={t(
                        'friends.removeCancel',
                        { name: friend.name },
                        { defaultValue: 'Keep {{name}} in friends' },
                      )}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 2),
                        'rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-base')}
                        aria-hidden="true"
                      >
                        close
                      </span>
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    data-mol-id={`btn-remove-friend-${friend.id}`}
                    onClick={() => setConfirmRemoveId(friend.id)}
                    aria-label={t(
                      'friends.removeLabel',
                      { name: friend.name },
                      { defaultValue: 'Remove {{name}} from friends' },
                    )}
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 2),
                      'rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors shrink-0',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      person_remove
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {loaded && friends.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'friends.empty',
                {},
                {
                  defaultValue:
                    'No friends yet — add someone above, or they appear here automatically when you seed a group with names.',
                },
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
