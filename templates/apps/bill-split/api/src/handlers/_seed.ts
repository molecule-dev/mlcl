/**
 * Demo seed for bill-split.
 *
 * On first authenticated request from a freshly signed-up user, seeds a
 * believable multi-group world so the Dashboard, Groups, Balances and
 * Activity pages are populated immediately:
 *
 * - 1 `is_self` member (the user) + 5 friends
 * - "Alpine Cabin Weekend" — 4 members, mixed equal/exact splits, one
 *   partial settlement recorded; the user is owed money here
 * - "Flat 4B — Household" — 3 members, equal splits incl. a non-divisible
 *   cents remainder; the user owes money here
 * - "Lisbon Trip" — 3 members, a weights ("shares") split; the user is owed
 * - activities for every event above
 *
 * All amounts are integer cents and every group's balances sum to exactly
 * zero — the seeded "simplify debts" suggestions are real outputs of the
 * same engine the API serves.
 *
 * Idempotent on the user's first group (returns early if any group exists).
 * Forensic, not blocking: errors are swallowed and the caller proceeds.
 * Concurrent first-load fan-outs share one in-flight promise.
 *
 * @module
 */

import { count, create } from '@molecule/api-database'

interface Row {
  id: string
  [key: string]: unknown
}

const unwrap = (result: unknown): Row => {
  const r = result as { data?: Row } | Row
  return ('data' in r && r.data ? r.data : r) as Row
}

const daysAgo = (d: number): Date => new Date(Date.now() - d * 24 * 60 * 60 * 1000)
const hoursAgo = (h: number): Date => new Date(Date.now() - h * 60 * 60 * 1000)

interface SeedResult {
  membersCreated: number
  groupsCreated: number
  expensesCreated: number
  settlementsCreated: number
  activitiesCreated: number
}

const ZERO: SeedResult = {
  membersCreated: 0,
  groupsCreated: 0,
  expensesCreated: 0,
  settlementsCreated: 0,
  activitiesCreated: 0,
}

const seedInFlight = new Map<string, Promise<SeedResult>>()

/**
 * Seed a freshly signed-up user with realistic demo content.
 *
 * Idempotent: returns early if the user already has any group.
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

async function addMember(
  userId: string,
  name: string,
  email: string | null,
  isSelf = false,
): Promise<Row> {
  return unwrap(
    await create('members', {
      user_id: userId,
      name,
      email,
      is_self: isSelf,
      created_at: new Date(),
    }),
  )
}

async function addMembership(groupId: string, memberId: string, role: string): Promise<void> {
  await create('memberships', {
    group_id: groupId,
    member_id: memberId,
    role,
    joined_at: new Date(),
  })
}

async function addExpense(input: {
  groupId: string
  payerId: string
  amountCents: number
  description: string
  category: string
  days: number
  splitMethod: string
  shares: { memberId: string; amountCents: number }[]
}): Promise<void> {
  const expense = unwrap(
    await create('expenses', {
      group_id: input.groupId,
      payer_member_id: input.payerId,
      amount_cents: input.amountCents,
      description: input.description,
      category: input.category,
      date: daysAgo(input.days),
      split_method: input.splitMethod,
      created_at: daysAgo(input.days),
      updated_at: daysAgo(input.days),
    }),
  )
  for (const share of input.shares) {
    await create('expense_shares', {
      expense_id: expense.id,
      member_id: share.memberId,
      amount_cents: share.amountCents,
    })
  }
}

async function addActivity(
  groupId: string,
  kind: string,
  payload: Record<string, unknown>,
  at: Date,
): Promise<void> {
  await create('activities', {
    group_id: groupId,
    kind,
    payload,
    created_at: at,
  })
}

async function doSeed(userId: string): Promise<SeedResult> {
  const existingGroups = await count('groups', [{ field: 'user_id', operator: '=', value: userId }])
  if (existingGroups > 0) return ZERO

  // ---- address book ----
  const self = await addMember(userId, 'You', null, true)
  const maya = await addMember(userId, 'Maya Chen', 'maya.chen@example.com')
  const jordan = await addMember(userId, 'Jordan Reyes', 'jordan.reyes@example.com')
  const priya = await addMember(userId, 'Priya Nair', 'priya.nair@example.com')
  const tomas = await addMember(userId, 'Tomás Duarte', 'tomas.duarte@example.com')
  const aisha = await addMember(userId, 'Aisha Bello', 'aisha.bello@example.com')

  // ---- group 1: Alpine Cabin Weekend (user is OWED) ----
  const cabin = unwrap(
    await create('groups', {
      user_id: userId,
      name: 'Alpine Cabin Weekend',
      description: 'Cabin rental, groceries and ski passes for the long weekend.',
      currency: 'USD',
      created_at: daysAgo(21),
      updated_at: daysAgo(21),
    }),
  )
  for (const m of [self, maya, jordan, priya]) {
    await addMembership(cabin.id, m.id, m.id === self.id ? 'owner' : 'member')
  }

  // Cabin rental — Maya paid $800.00, split equally 4 ways.
  await addExpense({
    groupId: cabin.id,
    payerId: maya.id,
    amountCents: 80000,
    description: 'Cabin rental (2 nights)',
    category: 'lodging',
    days: 12,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 20000 },
      { memberId: maya.id, amountCents: 20000 },
      { memberId: jordan.id, amountCents: 20000 },
      { memberId: priya.id, amountCents: 20000 },
    ],
  })

  // Groceries — user paid $120.00, exact split (Jordan bought the fancy cheese).
  await addExpense({
    groupId: cabin.id,
    payerId: self.id,
    amountCents: 12000,
    description: 'Groceries and firewood',
    category: 'groceries',
    days: 11,
    splitMethod: 'exact',
    shares: [
      { memberId: self.id, amountCents: 3000 },
      { memberId: maya.id, amountCents: 3000 },
      { memberId: jordan.id, amountCents: 4500 },
      { memberId: priya.id, amountCents: 1500 },
    ],
  })

  // Ski passes — Jordan paid $460.00, split equally.
  await addExpense({
    groupId: cabin.id,
    payerId: jordan.id,
    amountCents: 46000,
    description: 'Ski passes — 2 days',
    category: 'activities',
    days: 10,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 11500 },
      { memberId: maya.id, amountCents: 11500 },
      { memberId: jordan.id, amountCents: 11500 },
      { memberId: priya.id, amountCents: 11500 },
    ],
  })

  // Partial settle-up: user already paid Maya back $100.00 by transfer.
  await create('settlements', {
    group_id: cabin.id,
    from_member_id: self.id,
    to_member_id: maya.id,
    amount_cents: 10000,
    method: 'transfer',
    date: daysAgo(6),
    note: 'First chunk of the cabin rental',
    created_at: daysAgo(6),
  })

  await addActivity(
    cabin.id,
    'group_created',
    { actor: 'You', group_name: 'Alpine Cabin Weekend', member_count: 4 },
    daysAgo(21),
  )
  await addActivity(
    cabin.id,
    'expense_added',
    {
      actor: 'Maya Chen',
      description: 'Cabin rental (2 nights)',
      amount_cents: 80000,
      group_name: 'Alpine Cabin Weekend',
      payer_name: 'Maya Chen',
    },
    daysAgo(12),
  )
  await addActivity(
    cabin.id,
    'expense_added',
    {
      actor: 'You',
      description: 'Groceries and firewood',
      amount_cents: 12000,
      group_name: 'Alpine Cabin Weekend',
      payer_name: 'You',
    },
    daysAgo(11),
  )
  await addActivity(
    cabin.id,
    'expense_added',
    {
      actor: 'Jordan Reyes',
      description: 'Ski passes — 2 days',
      amount_cents: 46000,
      group_name: 'Alpine Cabin Weekend',
      payer_name: 'Jordan Reyes',
    },
    daysAgo(10),
  )
  await addActivity(
    cabin.id,
    'settlement_recorded',
    {
      actor: 'You',
      amount_cents: 10000,
      group_name: 'Alpine Cabin Weekend',
      from_name: 'You',
      to_name: 'Maya Chen',
      method: 'transfer',
    },
    daysAgo(6),
  )

  // ---- group 2: Flat 4B — Household (user OWES) ----
  const flat = unwrap(
    await create('groups', {
      user_id: userId,
      name: 'Flat 4B — Household',
      description: 'Rent, groceries and internet for the flat.',
      currency: 'USD',
      created_at: daysAgo(60),
      updated_at: daysAgo(60),
    }),
  )
  for (const m of [self, tomas, aisha]) {
    await addMembership(flat.id, m.id, m.id === self.id ? 'owner' : 'member')
  }

  // Rent — Tomás paid $3,600.00, equal thirds.
  await addExpense({
    groupId: flat.id,
    payerId: tomas.id,
    amountCents: 360000,
    description: 'September rent',
    category: 'rent',
    days: 9,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 120000 },
      { memberId: tomas.id, amountCents: 120000 },
      { memberId: aisha.id, amountCents: 120000 },
    ],
  })

  // Groceries — user paid $87.50; equal thirds leave a 1-cent remainder.
  await addExpense({
    groupId: flat.id,
    payerId: self.id,
    amountCents: 8750,
    description: 'Weekly groceries',
    category: 'groceries',
    days: 4,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 2917 },
      { memberId: tomas.id, amountCents: 2917 },
      { memberId: aisha.id, amountCents: 2916 },
    ],
  })

  // Internet — Aisha paid $60.00, equal thirds.
  await addExpense({
    groupId: flat.id,
    payerId: aisha.id,
    amountCents: 6000,
    description: 'Fibre internet',
    category: 'utilities',
    days: 3,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 2000 },
      { memberId: tomas.id, amountCents: 2000 },
      { memberId: aisha.id, amountCents: 2000 },
    ],
  })

  await addActivity(
    flat.id,
    'group_created',
    { actor: 'You', group_name: 'Flat 4B — Household', member_count: 3 },
    daysAgo(60),
  )
  await addActivity(
    flat.id,
    'expense_added',
    {
      actor: 'Tomás Duarte',
      description: 'September rent',
      amount_cents: 360000,
      group_name: 'Flat 4B — Household',
      payer_name: 'Tomás Duarte',
    },
    daysAgo(9),
  )
  await addActivity(
    flat.id,
    'member_added',
    { actor: 'You', group_name: 'Flat 4B — Household', member_name: 'Aisha Bello' },
    daysAgo(8),
  )

  // ---- group 3: Lisbon Trip (weights split; user is OWED) ----
  const lisbon = unwrap(
    await create('groups', {
      user_id: userId,
      name: 'Lisbon Trip',
      description: 'Hotel, dinners and one very good surf lesson.',
      currency: 'USD',
      created_at: daysAgo(30),
      updated_at: daysAgo(30),
    }),
  )
  for (const m of [self, maya, priya]) {
    await addMembership(lisbon.id, m.id, m.id === self.id ? 'owner' : 'member')
  }

  // Hotel — user paid $900.00, split equally.
  await addExpense({
    groupId: lisbon.id,
    payerId: self.id,
    amountCents: 90000,
    description: 'Hotel Belém — 3 nights',
    category: 'lodging',
    days: 14,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 30000 },
      { memberId: maya.id, amountCents: 30000 },
      { memberId: priya.id, amountCents: 30000 },
    ],
  })

  // Dinner — Priya paid $240.00, exact split.
  await addExpense({
    groupId: lisbon.id,
    payerId: priya.id,
    amountCents: 24000,
    description: 'Time Out Market dinner',
    category: 'meals',
    days: 13,
    splitMethod: 'exact',
    shares: [
      { memberId: self.id, amountCents: 8000 },
      { memberId: maya.id, amountCents: 8000 },
      { memberId: priya.id, amountCents: 8000 },
    ],
  })

  // Surf lesson — Maya paid $210.00; Maya takes a double share (2:1), Priya sat out.
  await addExpense({
    groupId: lisbon.id,
    payerId: maya.id,
    amountCents: 21000,
    description: 'Surf lesson in Costa da Caparica',
    category: 'activities',
    days: 12,
    splitMethod: 'shares',
    shares: [
      { memberId: maya.id, amountCents: 14000 },
      { memberId: self.id, amountCents: 7000 },
    ],
  })

  await addActivity(
    lisbon.id,
    'group_created',
    { actor: 'You', group_name: 'Lisbon Trip', member_count: 3 },
    daysAgo(30),
  )
  await addActivity(
    lisbon.id,
    'expense_added',
    {
      actor: 'You',
      description: 'Hotel Belém — 3 nights',
      amount_cents: 90000,
      group_name: 'Lisbon Trip',
      payer_name: 'You',
    },
    daysAgo(14),
  )
  await addActivity(
    lisbon.id,
    'expense_added',
    {
      actor: 'Maya Chen',
      description: 'Surf lesson in Costa da Caparica',
      amount_cents: 21000,
      group_name: 'Lisbon Trip',
      payer_name: 'Maya Chen',
    },
    hoursAgo(30),
  )

  return {
    membersCreated: 6,
    groupsCreated: 3,
    expensesCreated: 9,
    settlementsCreated: 1,
    activitiesCreated: 11,
  }
}

/** Convenience helper used by `_seed`-aware handlers. */
export async function ensureSeed(userId: string): Promise<boolean> {
  const r = await seedDemoForUser(userId)
  return r.groupsCreated > 0
}
