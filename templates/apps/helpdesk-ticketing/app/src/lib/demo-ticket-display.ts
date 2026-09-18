/**
 * Demo-only display enrichment: maps fixture UUIDs to readable labels and
 * fills gaps when the API returns ids without denormalized names.
 */

export type TranslateLike = (
  key: string,
  values?: Record<string, string | number | boolean>,
  options?: { defaultValue?: string },
) => string

const REQUESTER_BY_ID: Record<string, { name: string; company?: string }> = {
  '3336ef1b-7957-4874-f1b9-0865f9ed8c07': { name: 'Sarah Jenkins', company: 'Acme Corp' },
  '43edb62f-fc0c-400c-b824-4856c6e0c6b1': { name: 'Jordan Lee', company: 'SOC Monitoring' },
  '568396b8-697f-4d31-0adf-ca994214b6ce': { name: 'Marcus Reid', company: 'Global Tech' },
  '5db72fef-a971-4e73-8523-0fdfc803cc49': { name: 'Elena Park', company: 'Design Labs' },
}

const ASSIGNEE_BY_ID: Record<string, { name: string }> = {
  '43edb62f-fc0c-400c-b824-4856c6e0c6b1': { name: 'Alice Wong' },
  '278da854-7c49-4ccb-10a7-098f78344dd6': { name: 'Markus Aurel' },
}

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function demoSlaLabel(
  row: { id: string; priority?: string; status?: string },
  t: TranslateLike,
): string | undefined {
  const st = (row.status || '').toLowerCase()
  if (st === 'resolved' || st === 'closed') {
    return t('ticketsTable.sla.closed', {}, { defaultValue: 'Closed' })
  }
  const pr = (row.priority || 'medium').toLowerCase()
  const h = hashId(row.id)
  if (pr === 'urgent' && st === 'open') {
    if (h % 3 === 0) return 'expired'
    return t('ticketsTable.sla.minutesLeft', { m: 10 + (h % 50) }, { defaultValue: '{{m}}m left' })
  }
  if (pr === 'high' && h % 4 === 0) {
    return t(
      'ticketsTable.sla.hoursLeft',
      { h: 1 + (h % 5), m: 10 + (h % 45) },
      { defaultValue: '{{h}}h {{m}}m' },
    )
  }
  if (h % 5 === 0) {
    return 'on_track'
  }
  const hours = 2 + (h % 8)
  const mins = 5 + (h % 50)
  return t('ticketsTable.sla.hoursLeft', { h: hours, m: mins }, { defaultValue: '{{h}}h {{m}}m' })
}

export interface RawTicketRow {
  id: string
  subject: string
  status: string
  priority: string
  category?: string | null
  created_at: string
  updated_at?: string
  assignee_id?: string | null
  requester_id?: string | null
  requester_name?: string
  assignee_name?: string
  assignee_avatar?: string
  sla?: string
}

export function enrichTicketListRow(row: RawTicketRow, t: TranslateLike): RawTicketRow {
  const requesterName =
    row.requester_name ||
    (row.requester_id ? REQUESTER_BY_ID[row.requester_id]?.name : undefined) ||
    undefined
  const assigneeName =
    row.assignee_name ||
    (row.assignee_id ? ASSIGNEE_BY_ID[row.assignee_id]?.name : undefined) ||
    undefined
  const sla = row.sla ?? demoSlaLabel(row, t)
  return {
    ...row,
    requester_name: requesterName,
    assignee_name: assigneeName,
    sla,
  }
}

export interface TicketDetailShape {
  id: string
  subject: string
  status: string
  priority: string
  created_at: string
  updated_at?: string
  assignee_id?: string | null
  requester_id?: string | null
  requester_name?: string
  requester_email?: string
  assignee_name?: string
  sla_due_at?: string
  team_name?: string
  channel?: string
  tags?: string[]
  customer_company?: string
  customer_plan?: string
  customer_ticket_count?: number
  customer_satisfaction?: number
  related_articles?: Array<{ id: string; title: string; excerpt: string }>
  replies?: Array<{
    id: string
    body: string
    is_internal: boolean
    author_name?: string
    created_at: string
  }>
}

const DEMO_THREAD_TICKET = 'tkt01a2b-3c4d-4e5f-a6b7-c8d9e0f1a2b3'

export function enrichTicketDetail(ticket: TicketDetailShape, t: TranslateLike): TicketDetailShape {
  const base = enrichTicketListRow(ticket, t)
  if (ticket.id !== DEMO_THREAD_TICKET) {
    return {
      ...ticket,
      requester_name: base.requester_name ?? ticket.requester_name,
      assignee_name: base.assignee_name ?? ticket.assignee_name,
    }
  }
  const requester = REQUESTER_BY_ID['3336ef1b-7957-4874-f1b9-0865f9ed8c07']?.name ?? 'John Martinez'
  const replies =
    ticket.replies && ticket.replies.length > 0
      ? ticket.replies
      : [
          {
            id: 'demo-reply-1',
            body: t(
              'demoTicket.thread.customer',
              {},
              {
                defaultValue:
                  "I reset my password yesterday and now I can't log into the billing portal. Can you help?",
              },
            ),
            is_internal: false,
            author_name: requester,
            created_at: '2026-03-28T14:30:00Z',
          },
          {
            id: 'demo-reply-2',
            body: t(
              'demoTicket.thread.agent',
              {},
              {
                defaultValue:
                  'Hi, I can see your account was flagged for a security review. I have cleared the flag—please try signing in again.',
              },
            ),
            is_internal: false,
            author_name: ASSIGNEE_BY_ID['43edb62f-fc0c-400c-b824-4856c6e0c6b1']?.name ?? 'Mike R.',
            created_at: '2026-03-28T15:15:00Z',
          },
          {
            id: 'demo-reply-3',
            body: t(
              'demoTicket.thread.system',
              {},
              { defaultValue: 'Ticket escalated to Billing Team' },
            ),
            is_internal: true,
            author_name: t('demoTicket.thread.systemAuthor', {}, { defaultValue: 'System' }),
            created_at: '2026-03-28T15:16:00Z',
          },
        ]
  const related =
    ticket.related_articles && ticket.related_articles.length > 0
      ? ticket.related_articles
      : [
          {
            id: 'art-1',
            title: t(
              'demoTicket.article.loginTitle',
              {},
              { defaultValue: 'Troubleshooting Login Issues' },
            ),
            excerpt: t(
              'demoTicket.article.loginExcerpt',
              {},
              { defaultValue: 'Reset sessions, clear cache, and verify SSO metadata.' },
            ),
          },
          {
            id: 'art-2',
            title: t(
              'demoTicket.article.billingTitle',
              {},
              { defaultValue: 'Managing Billing Portal Access' },
            ),
            excerpt: t(
              'demoTicket.article.billingExcerpt',
              {},
              { defaultValue: 'Roles, permissions, and audit logs for billing admins.' },
            ),
          },
        ]
  return {
    ...ticket,
    ...base,
    requester_name: requester,
    requester_email: ticket.requester_email ?? 'john.martinez@acme.example',
    assignee_name:
      ticket.assignee_name ?? ASSIGNEE_BY_ID['43edb62f-fc0c-400c-b824-4856c6e0c6b1']?.name,
    team_name:
      ticket.team_name ?? t('demoTicket.team.billing', {}, { defaultValue: 'Billing Support' }),
    channel: ticket.channel ?? 'email',
    tags: ticket.tags?.length ? ticket.tags : ['billing', 'auth', 'password-reset'],
    customer_company: ticket.customer_company ?? 'Acme Corp',
    customer_plan:
      ticket.customer_plan ?? t('demoTicket.plan.enterprise', {}, { defaultValue: 'Enterprise' }),
    customer_ticket_count: ticket.customer_ticket_count ?? 3,
    customer_satisfaction: ticket.customer_satisfaction ?? 98,
    sla_due_at: ticket.sla_due_at ?? '2026-03-28T18:00:00Z',
    related_articles: related,
    replies,
  }
}

export function dashboardRequesterLabel(row: RawTicketRow): string {
  return (
    row.requester_name ||
    (row.requester_id ? REQUESTER_BY_ID[row.requester_id]?.company : undefined) ||
    (row.requester_id ? REQUESTER_BY_ID[row.requester_id]?.name : undefined) ||
    ''
  )
}

export function reportsAgentRows(
  tickets: Array<RawTicketRow & { assignee_id?: string | null }>,
  t: TranslateLike,
): Array<{ id: string; name: string; tickets_resolved: number; avg_time: string; rating: number }> {
  const counts: Record<string, { resolved: number; open: number }> = {}
  for (const tk of tickets) {
    const id = tk.assignee_id || ''
    const name = tk.assignee_name || (id ? ASSIGNEE_BY_ID[id]?.name : '') || ''
    if (!name) continue
    if (!counts[name]) counts[name] = { resolved: 0, open: 0 }
    const st = (tk.status || '').toLowerCase()
    if (st === 'resolved' || st === 'closed') counts[name].resolved += 1
    else counts[name].open += 1
  }
  const rows = Object.entries(counts).map(([name, c], i) => ({
    id: `agent-${i}`,
    name,
    tickets_resolved: c.resolved + Math.floor(c.open / 2),
    avg_time: t(
      'common.time.hours',
      { value: (2.5 + (hashId(name) % 30) / 10).toFixed(1) },
      { defaultValue: '{{value}}h' },
    ),
    rating: 4 + (hashId(name) % 10) / 10,
  }))
  if (rows.length > 0) return rows
  return [
    {
      id: 'a1',
      name: 'Alice Wong',
      tickets_resolved: 42,
      avg_time: t('common.time.hours', { value: '3.2' }, { defaultValue: '{{value}}h' }),
      rating: 4.8,
    },
    {
      id: 'a2',
      name: 'Markus Aurel',
      tickets_resolved: 36,
      avg_time: t('common.time.hours', { value: '3.8' }, { defaultValue: '{{value}}h' }),
      rating: 4.6,
    },
  ]
}
