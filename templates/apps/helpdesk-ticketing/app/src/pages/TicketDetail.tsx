import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'
import TicketBreadcrumbHeader from '../components/TicketBreadcrumbHeader.js'
import TicketConversationThread from '../components/TicketConversationThread.js'
import TicketCustomerInfoCard from '../components/TicketCustomerInfoCard.js'
import TicketDetailsCard from '../components/TicketDetailsCard.js'
import TicketDetailTopNavBar from '../components/TicketDetailTopNavBar.js'
import TicketInfoBar from '../components/TicketInfoBar.js'
import TicketRelatedArticles from '../components/TicketRelatedArticles.js'
import TicketReplyEditor from '../components/TicketReplyEditor.js'
import { enrichTicketDetail, type TicketDetailShape } from '../lib/demo-ticket-display.js'

export interface TicketReply {
  id: string
  body: string
  is_internal: boolean
  author_name?: string
  created_at: string
}

export interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  created_at: string
  assignee_name?: string
  requester_name?: string
  requester_email?: string
  sla_due_at?: string
  team_name?: string
  channel?: string
  tags?: string[]
  customer_company?: string
  customer_plan?: string
  customer_ticket_count?: number
  customer_satisfaction?: number
  related_articles?: Array<{ id: string; title: string; excerpt: string }>
  replies: TicketReply[]
}

function parseTicketResponse(res: unknown): Ticket | null {
  if (!res || typeof res !== 'object') return null
  const o = res as Record<string, unknown>
  const payload = o.data !== undefined ? o.data : o
  if (!payload || typeof payload !== 'object') return null
  const row = payload as Record<string, unknown>
  if (typeof row.id !== 'string') return null
  return payload as Ticket
}

function TicketDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const fetchTicket = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      setReplyError(null)
      const res = await http.get<Ticket>(`/api/tickets/${id}`)
      const parsed = parseTicketResponse(res as unknown)
      if (!parsed) {
        setTicket(null)
        setError(t('ticketDetail.notFound', {}, { defaultValue: 'Ticket not found' }))
        return
      }
      setTicket(enrichTicketDetail(parsed as TicketDetailShape, t) as Ticket)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setTicket(null)
      setError(
        err instanceof Error && err.message
          ? err.message
          : t('ticketDetail.loadError', {}, { defaultValue: 'Failed to load ticket.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void fetchTicket()
  }, [fetchTicket])

  async function handleStatusChange(nextStatus: string) {
    if (!id || statusUpdating || !ticket || nextStatus === ticket.status) return
    const previousStatus = ticket.status
    setStatusUpdating(true)
    setReplyError(null)
    try {
      await http.patch(`/api/tickets/${id}`, { status: nextStatus })
      void track({
        name: 'ticket.status_changed',
        properties: { ticket_id: id, from: previousStatus, to: nextStatus },
      })
      await fetchTicket()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setReplyError(
        err instanceof Error && err.message
          ? err.message
          : t(
              'ticketDetail.statusUpdateError',
              {},
              { defaultValue: 'Could not update status. Try again.' },
            ),
      )
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!replyBody.trim() || !id) return
    setSubmitting(true)
    setReplyError(null)
    try {
      await http.post(`/api/tickets/${id}/replies`, { body: replyBody, is_internal: isInternal })
      void track({
        name: 'ticket.replied',
        properties: { ticket_id: id, is_internal: isInternal },
      })
      setReplyBody('')
      setIsInternal(false)
      await fetchTicket()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setReplyError(
        err instanceof Error && err.message
          ? err.message
          : t(
              'ticketDetail.replyError',
              {},
              { defaultValue: 'Failed to send reply. Please try again.' },
            ),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'bg-surface text-on-surface selection:bg-primary-fixed',
        )}
      >
        <div
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'animate-spin border-4 border-primary border-t-transparent',
          )}
        />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.minH('screen'),
          'bg-surface text-on-surface selection:bg-primary-fixed',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 4 }),
            cm.sp('p', 8),
            cm.maxW('md'),
            cm.textCenter,
          )}
          role="alert"
        >
          <h1 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('ticketDetail.errorTitle', {}, { defaultValue: 'Something went wrong' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {error ?? t('ticketDetail.notFound', {}, { defaultValue: 'Ticket not found' })}
          </p>
          <button
            type="button"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-lg bg-primary text-on-primary hover:opacity-90',
            )}
            onClick={() => void fetchTicket()}
          >
            {t('ticketDetail.retry', {}, { defaultValue: 'Try again' })}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface selection:bg-primary-fixed')}>
      <div className={cm.cn(cm.flex(), cm.minH('screen'))}>
        <SideNavBar />
        <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0 md:ml-[240px]')}>
          <TicketDetailTopNavBar />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.w('full'),
              cm.stack(10),
              'p-4 pt-24 md:p-8',
            )}
          >
            {replyError && (
              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-lg bg-error-container text-on-error-container',
                )}
                role="status"
              >
                <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{replyError}</p>
              </div>
            )}
            <TicketBreadcrumbHeader ticket={ticket} />
            {/* Two-column desktop layout stacks below lg so the 65/35 split
                never crams side-by-side on a phone. */}
            <div
              className={cm.cn(cm.flex({ align: 'start' }), 'gap-4 lg:gap-10 flex-col lg:flex-row')}
            >
              <div className={cm.cn(cm.stack(10), 'w-full lg:w-[65%] min-w-0')}>
                <TicketInfoBar
                  ticket={ticket}
                  statusUpdating={statusUpdating}
                  onStatusChange={handleStatusChange}
                />
                <TicketConversationThread replies={ticket.replies ?? []} />
                <TicketReplyEditor
                  replyBody={replyBody}
                  setReplyBody={setReplyBody}
                  isInternal={isInternal}
                  setIsInternal={setIsInternal}
                  submitting={submitting}
                  onSubmit={handleReply}
                />
              </div>
              <div className={cm.cn(cm.stack(10), 'w-full lg:w-[35%] min-w-0')}>
                <TicketDetailsCard ticket={ticket} />
                <TicketCustomerInfoCard ticket={ticket} />
                <TicketRelatedArticles articles={ticket.related_articles ?? []} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default TicketDetail
export { TicketDetail, TicketDetail as TicketDetailPage }
