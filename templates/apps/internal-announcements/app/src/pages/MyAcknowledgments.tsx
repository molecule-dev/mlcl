/**
 * MyAcknowledgments — /my-acknowledgments hub for the user's pending +
 * completed acknowledgments.
 *
 * Layout: header with totals → tab bar (Pending / Acknowledged / Sent) →
 * single-column AnnouncementCard list filtered to that tab.
 *
 * Reads the live announcement list, acknowledgment ledger for "me", and
 * the team roster — partitions cards into:
 *   - pending: requires_acknowledgment=true & I have NOT acknowledged
 *   - acknowledged: requires_acknowledgment=true & I HAVE acknowledged
 *   - sent: I am the author
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnnouncementCard } from '../components/AnnouncementCard.js'
import {
  type ApiAcknowledgment,
  type ApiAnnouncement,
  type ApiCategory,
  type ApiComment,
  type ApiUser,
  buildCardData,
} from '../lib/announcements.js'

const TABS = [
  {
    id: 'pending',
    icon: 'pending_actions',
    labelKey: 'myAcks.tabPending',
    defaultLabel: 'Pending',
  },
  {
    id: 'acknowledged',
    icon: 'check_circle',
    labelKey: 'myAcks.tabDone',
    defaultLabel: 'Acknowledged',
  },
  { id: 'sent', icon: 'send', labelKey: 'myAcks.tabSent', defaultLabel: 'Sent by me' },
] as const

type TabId = (typeof TABS)[number]['id']

export function MyAcknowledgments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<ApiUser>()
  const meId = (user as ApiUser | null)?.id ?? null

  const [tab, setTab] = useState<TabId>('pending')
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [acks, setAcks] = useState<ApiAcknowledgment[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [annsR, catsR, teamR, acksR] = await Promise.all([
        http.get<ApiAnnouncement[]>('/announcements'),
        http.get<ApiCategory[]>('/categories'),
        http.get<ApiUser[]>('/team'),
        http.get<ApiAcknowledgment[]>('/announcements/me/acknowledgments'),
      ])
      setAnnouncements(annsR.data)
      setCategories(catsR.data)
      setUsers(Array.isArray(teamR.data) ? teamR.data : [])
      setAcks(acksR.data)
      const counts: Record<string, number> = {}
      await Promise.all(
        annsR.data.map(async (a) => {
          try {
            const r = await http.get<ApiComment[]>(`/comments/${a.id}`)
            counts[a.id] = r.data.length
          } catch (_error) {
            // best-effort — comment count fetch fails gracefully; defaults to 0
            counts[a.id] = 0
          }
        }),
      )
      setCommentCounts(counts)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    refresh()
  }, [refresh])

  const usersIndex = useMemo(
    () => ({ byId: Object.fromEntries(users.map((u) => [u.id, u])) }),
    [users],
  )
  const ackedSet = useMemo(() => new Set(acks.map((a) => a.announcement_id)), [acks])

  const cards = useMemo(
    () =>
      announcements
        .filter((a) => a.status === 'published')
        .map((a) => {
          const ackTotal = a.requires_acknowledgment ? Math.max(users.length, 1) : 0
          const card = buildCardData(a, {
            categories,
            users: usersIndex,
            ackCount: ackedSet.has(a.id) ? 1 : 0,
            ackTotal,
            hasAcknowledged: ackedSet.has(a.id),
            commentCount: commentCounts[a.id] ?? 0,
            unread: !ackedSet.has(a.id) && a.requires_acknowledgment,
          })
          return { card, ann: a, isMine: meId != null && a.author_id === meId }
        }),
    [announcements, categories, usersIndex, ackedSet, commentCounts, users.length, meId],
  )

  const pending = cards.filter((c) => c.ann.requires_acknowledgment && !ackedSet.has(c.ann.id))
  const acked = cards.filter((c) => c.ann.requires_acknowledgment && ackedSet.has(c.ann.id))
  const sent = cards.filter((c) => c.isMine)

  const counts: Record<TabId, number> = {
    pending: pending.length,
    acknowledged: acked.length,
    sent: sent.length,
  }
  const visible = tab === 'pending' ? pending : tab === 'acknowledged' ? acked : sent

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('myAcks.eyebrow', {}, { defaultValue: 'Your acknowledgments' })}
        </span>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
          {t('myAcks.title', {}, { defaultValue: 'Catch up on what needs your sign-off.' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl leading-relaxed')}>
          {t(
            'myAcks.subtitle',
            { count: counts.pending },
            {
              defaultValue:
                'You have {{count}} pending acknowledgments. Acknowledge to clear your inbox and let the sender know it landed.',
            },
          )}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/40 bg-error-container/40 text-on-error-container',
          )}
        >
          {error}
        </div>
      )}

      <div
        data-testid="my-acks-tabs"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'flex-wrap border-b border-outline-variant/30',
        )}
      >
        {TABS.map((current) => {
          const isActive = current.id === tab
          return (
            <button
              key={current.id}
              type="button"
              data-testid={`my-acks-tab-${current.id}`}
              onClick={() => setTab(current.id)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'transition-colors',
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant border-b-2 border-transparent hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')}>{current.icon}</span>
              {t(current.labelKey, {}, { defaultValue: current.defaultLabel })}
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('px', 2),
                  'rounded-full text-[10px] tabular-nums',
                )}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--mol-color-primary, #4f46e5)',
                        color: 'var(--mol-color-text-inverse)',
                      }
                    : {
                        backgroundColor: 'var(--color-priority-fyi-light, #f1f5f9)',
                        color: 'var(--color-priority-fyi, #64748b)',
                      }
                }
              >
                {counts[current.id]}
              </span>
            </button>
          )
        })}
      </div>

      <section
        data-testid="my-acks-list"
        className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'max-w-[640px] w-full mx-auto')}
      >
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('myAcks.loading', {}, { defaultValue: 'Refreshing…' })}
          </p>
        ) : visible.length === 0 ? (
          <div
            data-testid="my-acks-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              cm.sp('py', 16),
              'text-center text-on-surface-variant',
            )}
          >
            <span className="material-symbols-outlined text-5xl" aria-hidden="true">
              {tab === 'pending' ? 'check_circle' : 'inbox'}
            </span>
            <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'), 'text-on-surface')}>
              {tab === 'pending'
                ? t('myAcks.emptyPendingTitle', {}, { defaultValue: 'Inbox zero. Nicely done.' })
                : t('myAcks.emptyOtherTitle', {}, { defaultValue: 'Nothing here yet.' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'max-w-sm')}>
              {tab === 'pending'
                ? t(
                    'myAcks.emptyPendingBody',
                    {},
                    {
                      defaultValue:
                        'You are caught up on every required acknowledgment. New ones will show up here as they’re posted.',
                    },
                  )
                : t(
                    'myAcks.emptyOtherBody',
                    {},
                    { defaultValue: 'Switch tabs to see other items.' },
                  )}
            </p>
          </div>
        ) : (
          visible.map(({ card }) => <AnnouncementCard key={card.id} announcement={card} />)
        )}
      </section>
    </div>
  )
}

export default MyAcknowledgments
