import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

interface Subscriber {
  id: string
  email?: string | null
  status?: string | null
  tier?: string | null
  source?: string | null
  subscribed_at?: string | null
  created_at?: string | null
}

const STATUS_FILTERS = ['all', 'subscribed', 'unsubscribed', 'pending'] as const

const STATUS_KEY: Record<string, string> = {
  subscribed: 'subscribers.statusSubscribed',
  unsubscribed: 'subscribers.statusUnsubscribed',
  pending: 'subscribers.statusPending',
}

/**
 * Subscribers — the list: email, status, tier, source, subscribed_at.
 * Manual-add only (no CSV import in this template): the add form takes an
 * email + tier and creates the row server-side, which also mints the
 * deterministic unsubscribe token.
 */
function Subscribers() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [addEmail, setAddEmail] = useState('')
  const [addTier, setAddTier] = useState<'free' | 'paid'>('free')
  const [adding, setAdding] = useState(false)
  const [addMessage, setAddMessage] = useState<string | null>(null)
  const http = useHttpClient()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (tierFilter !== 'all') params.set('tier', tierFilter)
    if (search.trim()) params.set('q', search.trim())
    params.set('page', '1')
    params.set('limit', '50')
    http
      .get<{ data: Subscriber[]; total: number } | Subscriber[]>(`/api/subscribers?${params}`)
      .then((res) => {
        if (!active) return
        const body = res.data
        if (Array.isArray(body)) {
          setSubscribers(body)
          setTotal(body.length)
        } else {
          setSubscribers(body?.data ?? [])
          setTotal(typeof body?.total === 'number' ? body.total : (body?.data ?? []).length)
        }
      })
      .catch(
        (err: unknown) =>
          active &&
          setError(
            err instanceof Error
              ? err.message
              : t('subscribers.loadError', {}, { defaultValue: 'Failed to load subscribers' }),
          ),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [statusFilter, tierFilter, search, reloadKey, http, t])

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!addEmail.trim()) return
    setAdding(true)
    setAddMessage(null)
    try {
      const res = await http.post<Subscriber>('/api/subscribers', {
        email: addEmail.trim(),
        tier: addTier,
      })
      const row = res.data
      if (row) {
        setSubscribers((prev) => [row, ...prev.filter((s) => s.id !== row.id)])
        setTotal((n) => n + 1)
      }
      setAddEmail('')
      setAddMessage(t('subscribers.added', {}, { defaultValue: 'Subscriber added.' }))
      void track({
        name: 'subscriber.added',
        properties: { subscriber_id: row?.id, tier: addTier, source: 'manual-add' },
      })
      setReloadKey((k) => k + 1)
    } catch (err) {
      setAddMessage(
        err instanceof Error
          ? err.message
          : t('subscribers.addFailed', {}, { defaultValue: 'Failed to add subscriber' }),
      )
    } finally {
      setAdding(false)
    }
  }

  async function handleStatusChange(subscriber: Subscriber, next: string) {
    try {
      await http.patch(`/api/subscribers/${subscriber.id}`, { status: next })
      void track({
        name: next === 'unsubscribed' ? 'subscriber.unsubscribed' : 'subscriber.resubscribed',
        properties: { subscriber_id: subscriber.id },
      })
      setSubscribers((prev) =>
        prev.map((s) => (s.id === subscriber.id ? { ...s, status: next } : s)),
      )
      if (statusFilter !== 'all') setReloadKey((k) => k + 1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('subscribers.updateFailed', {}, { defaultValue: 'Failed to update subscriber' }),
      )
    }
  }

  async function handleDelete(id: string) {
    try {
      await http.delete(`/api/subscribers/${id}`)
      void track({ name: 'subscriber.deleted', properties: { subscriber_id: id } })
      setSubscribers((prev) => prev.filter((s) => s.id !== id))
      setTotal((n) => Math.max(0, n - 1))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('subscribers.deleteFailed', {}, { defaultValue: 'Failed to delete subscriber' }),
      )
    }
  }

  return (
    // Chrome (sidebar/topbar/drawer) comes from StudioLayout; this is content
    // only — padding stays inside the page.
    <div className={cm.cn('px-4 pt-6 md:px-12 md:pt-10 pb-16', 'max-w-[1200px]')}>
      <div className={cm.stack(8)}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                "font-['Newsreader'] text-on-background",
              )}
            >
              {t('subscribers.title', {}, { defaultValue: 'Subscribers' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'subscribers.subhead',
                { count: total },
                {
                  defaultValue: '{{count}} people on the list — manual add only, no import needed.',
                },
              )}
            </p>
          </div>
        </div>

        {/* Manual add */}
        <form
          data-mol-id="subscribers-add-form"
          className={cm.cn(
            'flex flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-4',
            cm.sp('p', 6),
            'rounded-xl bg-surface-container-lowest',
          )}
          onSubmit={(e) => void handleAdd(e)}
        >
          <label htmlFor="add-subscriber-email" className="sr-only">
            {t('subscribers.emailLabel', {}, { defaultValue: 'Email address' })}
          </label>
          <input
            id="add-subscriber-email"
            type="email"
            required
            data-mol-id="subscribers-add-email"
            className={cm.cn(
              cm.flex1,
              cm.sp('px', 4),
              cm.sp('py', 2),
              'min-w-[240px] rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary outline-none',
              cm.textSize('sm'),
            )}
            placeholder={t(
              'subscribers.addPlaceholder',
              {},
              { defaultValue: 'add reader by email' },
            )}
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
          />
          <label htmlFor="add-subscriber-tier" className="sr-only">
            {t('subscribers.tierLabel', {}, { defaultValue: 'Tier' })}
          </label>
          <select
            id="add-subscriber-tier"
            data-mol-id="subscribers-add-tier"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-lg bg-surface-container-lowest border border-outline-variant',
              cm.textSize('sm'),
            )}
            value={addTier}
            onChange={(e) => setAddTier(e.target.value as 'free' | 'paid')}
          >
            <option value="free">{t('subscribers.freeTier', {}, { defaultValue: 'Free' })}</option>
            <option value="paid">{t('subscribers.paidTier', {}, { defaultValue: 'Paid' })}</option>
          </select>
          <button
            type="submit"
            data-mol-id="subscribers-add-submit"
            disabled={adding}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.roundedFull,
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50',
            )}
          >
            {t('subscribers.add', {}, { defaultValue: 'Add subscriber' })}
          </button>
          {addMessage && (
            <span role="status" className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {addMessage}
            </span>
          )}
        </form>

        {/* Filters */}
        <div
          data-mol-id="subscribers-filters"
          className={cm.cn('flex flex-wrap items-center gap-2 md:gap-3')}
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              data-mol-id={`subscribers-filter-${filter}`}
              aria-pressed={statusFilter === filter}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                statusFilter === filter
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              )}
              onClick={() => {
                setStatusFilter(filter)
                setReloadKey((k) => k + 1)
              }}
            >
              {t(`subscribers.filter_${filter}`, {}, { defaultValue: filter })}
            </button>
          ))}
          <select
            aria-label={t('subscribers.tierLabel', {}, { defaultValue: 'Tier' })}
            data-mol-id="subscribers-tier-filter"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-lg bg-surface-container border border-transparent',
              cm.textSize('sm'),
            )}
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value as 'all' | 'free' | 'paid')
              setReloadKey((k) => k + 1)
            }}
          >
            <option value="all">
              {t('subscribers.allTiers', {}, { defaultValue: 'All tiers' })}
            </option>
            <option value="free">{t('subscribers.freeTier', {}, { defaultValue: 'Free' })}</option>
            <option value="paid">{t('subscribers.paidTier', {}, { defaultValue: 'Paid' })}</option>
          </select>
          <label htmlFor="subscriber-search" className="sr-only">
            {t('common.search', {}, { defaultValue: 'Search' })}
          </label>
          <input
            id="subscriber-search"
            type="search"
            data-mol-id="subscribers-search"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-surface-container-lowest border border-outline-variant',
              cm.textSize('sm'),
            )}
            placeholder={t(
              'subscribers.searchPlaceholder',
              {},
              { defaultValue: 'Search by email' },
            )}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setReloadKey((k) => k + 1)
            }}
          />
        </div>

        {/* Table — min-w forces horizontal scroll inside the
              overflow-x-auto wrapper on phones instead of crushing every
              cell to one character per line. */}
        <div
          className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface-container-lowest overflow-x-auto')}
        >
          {loading ? (
            <p
              className={cm.cn(
                cm.sp('py', 8),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('common.loading', {}, { defaultValue: 'Loading...' })}
            </p>
          ) : error ? (
            <div
              role="alert"
              className={cm.cn(
                cm.sp('p', 4),
                'rounded-lg bg-error-container text-on-error-container',
                cm.textSize('sm'),
              )}
            >
              {error}
            </div>
          ) : subscribers.length === 0 ? (
            <p
              data-mol-id="subscribers-empty"
              className={cm.cn(
                cm.sp('py', 8),
                cm.textCenter,
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {t('subscribers.none', {}, { defaultValue: 'No subscribers match this view.' })}
            </p>
          ) : (
            <table className={cm.cn(cm.w('full'), cm.textSize('sm'), 'min-w-[640px]')}>
              <thead>
                <tr
                  className={cm.cn(
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  <th scope="col" className={cm.cn(cm.sp('pb', 3), 'text-left font-semibold')}>
                    {t('subscribers.emailColumn', {}, { defaultValue: 'Email' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('pb', 3), 'text-left font-semibold')}>
                    {t('subscribers.statusColumn', {}, { defaultValue: 'Status' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('pb', 3), 'text-left font-semibold')}>
                    {t('subscribers.tierColumn', {}, { defaultValue: 'Tier' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('pb', 3), 'text-left font-semibold')}>
                    {t('subscribers.sourceColumn', {}, { defaultValue: 'Source' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('pb', 3), 'text-left font-semibold')}>
                    {t('subscribers.subscribedAtColumn', {}, { defaultValue: 'Subscribed' })}
                  </th>
                  <th scope="col" className={cm.cn(cm.sp('pb', 3), 'text-right font-semibold')}>
                    {t('subscribers.actionsColumn', {}, { defaultValue: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr
                    key={subscriber.id}
                    data-mol-id={`subscriber-row-${subscriber.id}`}
                    className="border-t border-outline-variant/20"
                  >
                    <td className={cm.cn(cm.sp('py', 3), 'text-on-surface')}>{subscriber.email}</td>
                    <td className={cm.sp('py', 3)}>
                      <span
                        data-mol-id={`subscriber-status-${subscriber.id}`}
                        className={cm.cn(
                          cm.roundedFull,
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          subscriber.status === 'subscribed'
                            ? 'bg-primary-container text-on-primary-container'
                            : subscriber.status === 'pending'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-error-container text-on-error-container',
                        )}
                      >
                        {t(
                          STATUS_KEY[subscriber.status ?? 'pending'] ?? 'subscribers.statusPending',
                          {},
                          { defaultValue: subscriber.status ?? 'pending' },
                        )}
                      </span>
                    </td>
                    <td className={cm.cn(cm.sp('py', 3), 'text-on-surface-variant')}>
                      {t(
                        subscriber.tier === 'paid'
                          ? 'subscribers.paidTier'
                          : 'subscribers.freeTier',
                        {},
                        // Capitalized to match the tier select's labels —
                        // the raw enum ('paid') leaked here before.
                        { defaultValue: subscriber.tier === 'paid' ? 'Paid' : 'Free' },
                      )}
                    </td>
                    <td className={cm.cn(cm.sp('py', 3), 'text-on-surface-variant')}>
                      {subscriber.source ?? '—'}
                    </td>
                    <td className={cm.cn(cm.sp('py', 3), 'text-on-surface-variant')}>
                      {(subscriber.subscribed_at ?? subscriber.created_at ?? '')
                        ? new Date(
                            subscriber.subscribed_at ?? subscriber.created_at ?? '',
                          ).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className={cm.cn(cm.sp('py', 3), cm.textRight)}>
                      <span
                        className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'justify-end')}
                      >
                        {subscriber.status === 'subscribed' ? (
                          <button
                            type="button"
                            data-mol-id={`subscriber-unsubscribe-${subscriber.id}`}
                            className={cm.cn(
                              cm.textSize('sm'),
                              'px-2 py-1.5',
                              'text-on-surface-variant hover:text-error',
                            )}
                            onClick={() => void handleStatusChange(subscriber, 'unsubscribed')}
                          >
                            {t('subscribers.unsubscribe', {}, { defaultValue: 'Unsubscribe' })}
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-mol-id={`subscriber-resubscribe-${subscriber.id}`}
                            className={cm.cn(
                              cm.textSize('sm'),
                              'px-2 py-1.5',
                              'text-primary hover:underline',
                            )}
                            onClick={() => void handleStatusChange(subscriber, 'subscribed')}
                          >
                            {t('subscribers.resubscribe', {}, { defaultValue: 'Resubscribe' })}
                          </button>
                        )}
                        <ConfirmButton
                          label={t('subscribers.delete', {}, { defaultValue: 'Delete' })}
                          confirmLabel={t(
                            'subscribers.deleteConfirm',
                            {},
                            {
                              defaultValue: 'Remove this subscriber? Their history is deleted too.',
                            },
                          )}
                          onConfirm={() => handleDelete(subscriber.id)}
                          color="error"
                          size="sm"
                          disarmSeconds={6}
                          testId={`subscriber-delete-${subscriber.id}`}
                          data-mol-id={`subscriber-delete-${subscriber.id}`}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Subscribers
export { Subscribers, Subscribers as SubscribersPage }
