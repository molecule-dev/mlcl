/**
 * One-time demo seed for a freshly signed-up user.
 *
 * Idempotent: only runs if the user has zero clients yet, so calling it
 * again on subsequent requests is a no-op. Triggered lazily on the first
 * `GET /api/clients` (and other list endpoints) so a brand-new account
 * lands with realistic invoice/client/payment data instead of empty
 * tables.
 *
 * @module
 */

import { count, create, findMany } from '@molecule/api-database'

const SEED_FLAG = '__invoiceBillingSeeded'

// In-process lock keyed by userId. Multiple concurrent requests from a
// freshly signed-up dashboard hit /api/dashboard/summary, /api/invoices,
// /api/clients and /api/dashboard/activity in parallel; without this
// lock all four would observe count=0 and each would run the seed,
// producing 4× duplicate rows.
const seedLocks = new Map<string, Promise<void>>()

export async function ensureDemoSeeded(userId: string): Promise<void> {
  const inflight = seedLocks.get(userId)
  if (inflight) return inflight
  const promise = (async () => {
    await runSeed(userId)
  })().finally(() => {
    seedLocks.delete(userId)
  })
  seedLocks.set(userId, promise)
  return promise
}

async function runSeed(userId: string): Promise<void> {
  const existing = await count('clients', [{ field: 'user_id', operator: '=', value: userId }])
  if (Number(existing) > 0) return

  const now = Date.now()
  const day = 86400000

  const clients = [
    {
      name: 'Aperture Studio',
      company: 'Aperture LLC',
      email: 'billing@aperture.studio',
      phone: '+1 (555) 010-1142',
    },
    {
      name: 'Northwind Coffee Co',
      company: 'Northwind LLC',
      email: 'finance@northwind.coffee',
      phone: '+1 (555) 010-2240',
    },
    {
      name: 'Vega Print Group',
      company: 'Vega Print',
      email: 'ap@vegaprint.io',
      phone: '+1 (555) 010-9938',
    },
    {
      name: 'Kestrel Architects',
      company: 'Kestrel & Co',
      email: 'studio@kestrel.archi',
      phone: '+1 (555) 010-4014',
    },
  ]

  const clientIds: Record<string, string> = {}
  for (const c of clients) {
    const r = await create('clients', {
      user_id: userId,
      name: c.name,
      email: c.email,
      company: c.company,
      phone: c.phone,
      address: null,
      tax_id: null,
      notes: null,
      total_billed: 0,
      total_paid: 0,
      created_at: new Date(now - 30 * day),
    })
    const data = r.data as { id?: string } | null | undefined
    if (data?.id) clientIds[c.name] = data.id
  }

  const invoiceSeeds: Array<{
    client: keyof typeof clientIds
    items: Array<{ description: string; quantity: number; unit_price: number }>
    daysAgo: number
    dueDaysAhead: number
    status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'viewed'
    amountPaid?: number
  }> = [
    {
      client: 'Aperture Studio',
      items: [
        { description: 'Brand strategy workshop', quantity: 1, unit_price: 1800 },
        { description: 'Logo system & guidelines', quantity: 1, unit_price: 2400 },
        { description: 'Web hero photography (8 hrs)', quantity: 8, unit_price: 75 },
      ],
      daysAgo: 1,
      dueDaysAhead: -1,
      status: 'paid',
    },
    {
      client: 'Northwind Coffee Co',
      items: [
        { description: 'Monthly subscription marketing retainer', quantity: 1, unit_price: 2150 },
      ],
      daysAgo: 5,
      dueDaysAhead: 4,
      status: 'sent',
    },
    {
      client: 'Vega Print Group',
      items: [{ description: 'Print catalog redesign', quantity: 1, unit_price: 1290 }],
      daysAgo: 18,
      dueDaysAhead: -9,
      status: 'overdue',
    },
    {
      client: 'Kestrel Architects',
      items: [{ description: 'Architectural visualization', quantity: 1, unit_price: 8400 }],
      daysAgo: 12,
      dueDaysAhead: 12,
      status: 'partial',
      amountPaid: 4200,
    },
    {
      client: 'Aperture Studio',
      items: [{ description: 'Quarterly retainer', quantity: 1, unit_price: 3200 }],
      daysAgo: 22,
      dueDaysAhead: -8,
      status: 'paid',
    },
  ]

  let invoiceSeq = 1042
  const invoiceIds: Array<{
    id: string
    number: string
    client: string
    total: number
    amountPaid: number
  }> = []
  for (const s of invoiceSeeds) {
    const clientId = clientIds[s.client]
    if (!clientId) continue
    const subtotal = s.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
    const taxRate = 8.5
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    const number = `INV-${invoiceSeq--}`
    const created = new Date(now - s.daysAgo * day)
    const due = new Date(now + s.dueDaysAhead * day)
    const sent = s.status !== 'draft' ? new Date(now - (s.daysAgo - 1) * day) : null
    const r = await create('invoices', {
      user_id: userId,
      client_id: clientId,
      client_name: s.client,
      client_company: clients.find((c) => c.name === s.client)?.company ?? null,
      invoice_number: number,
      items: JSON.stringify(s.items),
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      currency: 'USD',
      due_date: due,
      sent_at: sent,
      notes: 'Net 14. Thanks for the partnership!',
      status: s.status,
      amount_paid: s.amountPaid ?? (s.status === 'paid' ? total : 0),
      created_at: created,
    })
    const data = r.data as { id?: string } | null | undefined
    if (data?.id) {
      invoiceIds.push({
        id: data.id,
        number,
        client: s.client,
        total,
        amountPaid: s.amountPaid ?? (s.status === 'paid' ? total : 0),
      })
    }
  }

  for (const inv of invoiceIds) {
    if (inv.amountPaid <= 0) continue
    await create('invoice_payments', {
      user_id: userId,
      invoice_id: inv.id,
      invoice_number: inv.number,
      client_name: inv.client,
      amount: inv.amountPaid,
      method: 'stripe',
      reference: `pi_test_${Math.random().toString(36).slice(2, 12)}`,
      status: 'completed',
      created_at: new Date(now - day),
    })
  }

  await create('tax_rates', {
    user_id: userId,
    name: 'NY State Sales Tax',
    rate_pct: 8.875,
    region: 'New York',
    created_at: new Date(now - 30 * day),
  })
  await create('tax_rates', {
    user_id: userId,
    name: 'GST',
    rate_pct: 10,
    region: 'Australia',
    created_at: new Date(now - 30 * day),
  })

  const recurringClient = clientIds['Northwind Coffee Co']
  if (recurringClient) {
    await create('recurring_invoices', {
      user_id: userId,
      client_id: recurringClient,
      items: JSON.stringify([{ description: 'Monthly retainer', quantity: 1, unit_price: 2150 }]),
      amount: 2333.275,
      currency: 'USD',
      cadence: 'monthly',
      frequency: 'monthly',
      start_date: new Date(now + 7 * day),
      next_run_at: new Date(now + 7 * day),
      next_date: new Date(now + 7 * day),
      tax_rate: 8.5,
      notes: 'Auto-billed monthly',
      label: 'Northwind monthly retainer',
      active: true,
      is_active: true,
      created_at: new Date(now - 60 * day),
    })
  }

  void SEED_FLAG
  void findMany
}
