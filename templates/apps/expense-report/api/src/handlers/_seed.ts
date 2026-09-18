/**
 * Demo seed for expense-report.
 *
 * On first authenticated request from a freshly signed-up user, seeds
 * realistic content so the dashboard, expense list, reports and approval
 * queue are populated with believable data without forcing the user to
 * grind through manual entry before the app feels alive.
 *
 * Seeds (idempotent on user_id — returns early if any expense_policies row
 * is already owned by the user):
 *
 * - 4 expense_policies (Meals / Lodging / Transport / Software)
 * - 8 expenses across mixed categories, 4 of them already grouped into
 *   the submitted report and the rest free-floating drafts
 * - 3 expense_reports owned by the user — one submitted, one approved,
 *   one reimbursed — so the Reports list and detail pages have variety
 * - 2 expense_reports where the user is `approver_id` and status is
 *   `submitted` — these populate the Approvals queue with real rows
 * - 5 notifications spanning submitted / approved / reimbursed / policy
 *   / reminder kinds
 *
 * The seed is forensic, not blocking: any error is swallowed and the
 * caller proceeds with whatever data already exists. Concurrent first-
 * load fan-outs (Dashboard hits multiple endpoints in parallel) share a
 * single in-flight promise so we never seed twice.
 *
 * @module
 */

import { count, create, updateById } from '@molecule/api-database'

interface Row {
  id: string
  [key: string]: unknown
}

const unwrap = (result: unknown): Row => {
  const r = result as { data?: Row } | Row
  return ('data' in r && r.data ? r.data : r) as Row
}

const minutesAgo = (m: number): Date => new Date(Date.now() - m * 60 * 1000)
const daysAgo = (d: number): Date => new Date(Date.now() - d * 24 * 60 * 60 * 1000)

interface SeedResult {
  policiesCreated: number
  expensesCreated: number
  reportsCreated: number
  approvalsCreated: number
  notificationsCreated: number
}

const ZERO: SeedResult = {
  policiesCreated: 0,
  expensesCreated: 0,
  reportsCreated: 0,
  approvalsCreated: 0,
  notificationsCreated: 0,
}

const seedInFlight = new Map<string, Promise<SeedResult>>()

/**
 * Seed a freshly signed-up user with realistic demo content.
 *
 * Idempotent: returns early if the user already has any expense_policies.
 * Race-safe: concurrent calls share a single in-flight promise.
 */
export async function seedDemoForUser(userId: string): Promise<SeedResult> {
  if (!userId) return ZERO
  const existing = seedInFlight.get(userId)
  if (existing) return existing
  const p = doSeed(userId).finally(() => {
    seedInFlight.delete(userId)
  })
  seedInFlight.set(userId, p)
  return p
}

async function doSeed(userId: string): Promise<SeedResult> {
  const existing = await count('expense_policies', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing > 0) return ZERO

  const policies = [
    {
      name: 'Meals & Entertainment',
      description: 'Daily meal cap with itemized receipts.',
      max_amount: 80,
      categories: ['meals', 'entertainment'],
      requires_receipt_above: 25,
      auto_approve_below: 20,
    },
    {
      name: 'Lodging',
      description: 'Standard business class lodging up to $300/night.',
      max_amount: 300,
      categories: ['lodging'],
      requires_receipt_above: 0,
      auto_approve_below: 0,
    },
    {
      name: 'Transport',
      description: 'Coach class travel, ground transport reimbursed.',
      max_amount: 1500,
      categories: ['travel', 'transport'],
      requires_receipt_above: 25,
      auto_approve_below: 25,
    },
    {
      name: 'Software & SaaS',
      description: 'Manager approval required, no monthly cap.',
      max_amount: 0,
      categories: ['software', 'supplies'],
      requires_receipt_above: 0,
      auto_approve_below: 0,
    },
  ]

  for (const p of policies) {
    await create('expense_policies', {
      user_id: userId,
      name: p.name,
      description: p.description,
      max_amount: p.max_amount,
      categories: p.categories,
      requires_receipt_above: p.requires_receipt_above,
      auto_approve_below: p.auto_approve_below,
      is_active: true,
      created_at: daysAgo(30),
    })
  }

  const submitted = unwrap(
    await create('expense_reports', {
      user_id: userId,
      submitter_email: null,
      approver_email: null,
      approver_id: null,
      title: 'Berlin sales offsite',
      description: 'Customer summit + sales planning. Flights, lodging, and team dinners.',
      total_amount: 0,
      currency: 'USD',
      status: 'submitted',
      submitted_at: daysAgo(2),
      created_at: daysAgo(5),
    }),
  )

  const approved = unwrap(
    await create('expense_reports', {
      user_id: userId,
      title: 'Q2 client dinners',
      description: 'Renewal-week dinners with three top accounts.',
      total_amount: 0,
      currency: 'USD',
      status: 'approved',
      submitted_at: daysAgo(14),
      approved_at: daysAgo(13),
      created_at: daysAgo(16),
    }),
  )

  const reimbursed = unwrap(
    await create('expense_reports', {
      user_id: userId,
      title: 'NYC product summit',
      description: 'Engineering all-hands logistics.',
      total_amount: 0,
      currency: 'USD',
      status: 'reimbursed',
      submitted_at: daysAgo(28),
      approved_at: daysAgo(26),
      reimbursed_at: daysAgo(24),
      created_at: daysAgo(30),
    }),
  )

  // Expenses linked to the submitted report (Berlin offsite)
  const submittedExpenses = [
    { merchant: 'Lufthansa LH 9020', category: 'travel', amount: 884.0, days: 9 },
    { merchant: 'Hotel Adlon Kempinski', category: 'lodging', amount: 925.0, days: 8 },
    { merchant: 'Restaurant Tim Raue', category: 'meals', amount: 186.5, days: 7 },
    { merchant: 'Berlin S-Bahn day pass', category: 'transport', amount: 9.5, days: 7 },
  ]

  // Expenses linked to the approved report (client dinners)
  const approvedExpenses = [
    { merchant: 'The Continental — dinner', category: 'meals', amount: 224.0, days: 16 },
    { merchant: 'Eleven Madison Park', category: 'meals', amount: 412.5, days: 17 },
  ]

  // Expenses linked to the reimbursed report
  const reimbursedExpenses = [
    { merchant: 'Delta DL 421', category: 'travel', amount: 612.0, days: 31 },
    { merchant: 'Marriott Marquis NYC', category: 'lodging', amount: 760.0, days: 30 },
    { merchant: 'WeWork Bryant Park', category: 'supplies', amount: 89.0, days: 30 },
  ]

  // Free-floating drafts — show up in the Expenses list and are pickable
  // when the user goes to create a new report.
  const drafts = [
    { merchant: 'AWS — April compute', category: 'software', amount: 1429.0, days: 1 },
    { merchant: 'WeWork Friedrichstraße', category: 'supplies', amount: 340.5, days: 4 },
  ]

  let totalSubmitted = 0
  for (const e of submittedExpenses) {
    await create('expenses', {
      user_id: userId,
      report_id: submitted.id,
      amount: e.amount,
      currency: 'USD',
      category: e.category,
      date: daysAgo(e.days),
      merchant: e.merchant,
      description: null,
      receipt_url: null,
      status: 'submitted',
      created_at: daysAgo(e.days),
    })
    totalSubmitted += e.amount
  }
  await updateById('expense_reports', submitted.id, { total_amount: totalSubmitted })

  let totalApproved = 0
  for (const e of approvedExpenses) {
    await create('expenses', {
      user_id: userId,
      report_id: approved.id,
      amount: e.amount,
      currency: 'USD',
      category: e.category,
      date: daysAgo(e.days),
      merchant: e.merchant,
      description: null,
      receipt_url: null,
      status: 'approved',
      created_at: daysAgo(e.days),
    })
    totalApproved += e.amount
  }
  await updateById('expense_reports', approved.id, { total_amount: totalApproved })

  let totalReimbursed = 0
  for (const e of reimbursedExpenses) {
    await create('expenses', {
      user_id: userId,
      report_id: reimbursed.id,
      amount: e.amount,
      currency: 'USD',
      category: e.category,
      date: daysAgo(e.days),
      merchant: e.merchant,
      description: null,
      receipt_url: null,
      status: 'reimbursed',
      created_at: daysAgo(e.days),
    })
    totalReimbursed += e.amount
  }
  await updateById('expense_reports', reimbursed.id, { total_amount: totalReimbursed })

  for (const e of drafts) {
    await create('expenses', {
      user_id: userId,
      report_id: null,
      amount: e.amount,
      currency: 'USD',
      category: e.category,
      date: daysAgo(e.days),
      merchant: e.merchant,
      description: null,
      receipt_url: null,
      status: 'draft',
      created_at: daysAgo(e.days),
    })
  }

  // Approvals queue: two reports that need this user's review.
  // submitter_email is set; total_amount is set so the queue list shows
  // a real pending value.
  await create('expense_reports', {
    user_id: '00000000-0000-0000-0000-000000000000',
    submitter_email: 'henry.liang@example.com',
    approver_email: null,
    approver_id: userId,
    title: 'Vendor lunch — Stripe',
    description: 'Pre-renewal lunch with Stripe contacts.',
    total_amount: 186.5,
    currency: 'USD',
    status: 'submitted',
    submitted_at: daysAgo(1),
    created_at: daysAgo(3),
  })

  await create('expense_reports', {
    user_id: '00000000-0000-0000-0000-000000000000',
    submitter_email: 'avery.cole@example.com',
    approver_email: null,
    approver_id: userId,
    title: 'NYC product summit',
    description: 'Engineering manager travel + vendor meetings.',
    total_amount: 4120.0,
    currency: 'USD',
    status: 'submitted',
    submitted_at: daysAgo(6),
    created_at: daysAgo(7),
  })

  // Notifications
  const notifications = [
    {
      type: 'submitted',
      title: 'Berlin sales offsite submitted',
      message: '4 expenses sent for manager review.',
      report_id: submitted.id,
      actor: 'You',
      minutes: 60 * 48,
    },
    {
      type: 'approved',
      title: 'Q2 client dinners approved',
      message: 'Sergei Volkov approved your $636.50 report.',
      report_id: approved.id,
      actor: 'Sergei Volkov',
      minutes: 60 * 24 * 13,
    },
    {
      type: 'reimbursed',
      title: 'NYC product summit reimbursed',
      message: 'Finance issued ACH reimbursement.',
      report_id: reimbursed.id,
      actor: 'Finance',
      minutes: 60 * 24 * 24,
    },
    {
      type: 'policy',
      title: 'Policy flag · meal cap exceeded',
      message: 'Eleven Madison Park dinner exceeded the daily $80 cap.',
      report_id: approved.id,
      actor: 'Recoup policy bot',
      minutes: 60 * 24 * 16,
    },
    {
      type: 'reminder',
      title: 'Receipts due in 2 days',
      message: '2 expenses still need a receipt before month-end close.',
      report_id: null,
      actor: 'Recoup',
      minutes: 60 * 24 * 4,
    },
  ]

  for (const n of notifications) {
    await create('notifications', {
      user_id: userId,
      type: n.type,
      title: n.title,
      message: n.message,
      report_id: n.report_id,
      actor: n.actor,
      read: false,
      created_at: minutesAgo(n.minutes),
    })
  }

  return {
    policiesCreated: policies.length,
    expensesCreated:
      submittedExpenses.length +
      approvedExpenses.length +
      reimbursedExpenses.length +
      drafts.length,
    reportsCreated: 3,
    approvalsCreated: 2,
    notificationsCreated: notifications.length,
  }
}

/** Convenience helper used by `_seed`-aware handlers. */
export async function ensureSeed(userId: string): Promise<boolean> {
  const r = await seedDemoForUser(userId)
  return r.policiesCreated > 0
}
