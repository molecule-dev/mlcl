/**
 * Demo seed for bill-split.
 *
 * On first authenticated request from a freshly signed-up user, seeds a
 * believable multi-group world — the one the Stitch designs mock up — so
 * the Dashboard, Groups, Balances and Activity pages are populated
 * immediately:
 *
 * - 1 `is_self` member (the user) + 6 friends (Dev Patel, Sam Kwon,
 *   Clara Tran, Liam Zeller, Marcus Reid, and the couple "Chloe & Jordan")
 * - "Lake Tahoe Ski Cabin" — 4 members, mixed equal/exact splits, one
 *   partial settlement recorded; the user is owed money here
 * - "Bushwick Flatmates (Apt 4B)" — 3 members, equal splits incl. a
 *   non-divisible cents remainder; the user owes money here
 * - "Joshua Tree Weekend" — 3 members, a weights ("shares") split; the user
 *   is owed
 * - "Bi-Weekly Dinner Club" — 4 members, one dinner fully settled to zero
 *   via three recorded payments
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

async function addSettlement(input: {
  groupId: string
  fromMemberId: string
  toMemberId: string
  amountCents: number
  method: string
  days: number
  note: string
}): Promise<void> {
  await create('settlements', {
    group_id: input.groupId,
    from_member_id: input.fromMemberId,
    to_member_id: input.toMemberId,
    amount_cents: input.amountCents,
    method: input.method,
    date: daysAgo(input.days),
    note: input.note,
    created_at: daysAgo(input.days),
  })
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
  const dev = await addMember(userId, 'Dev Patel', 'dev.patel@example.com')
  const sam = await addMember(userId, 'Sam Kwon', 'sam.kwon@example.com')
  const clara = await addMember(userId, 'Clara Tran', 'clara.tran@example.com')
  const liam = await addMember(userId, 'Liam Zeller', 'liam.zeller@example.com')
  const marcus = await addMember(userId, 'Marcus Reid', 'marcus.reid@example.com')
  // Address-book-only couple — in no circle, so their net stays zero.
  await addMember(userId, 'Chloe & Jordan', 'chloe.and.jordan@example.com')

  // ---- group 1: Lake Tahoe Ski Cabin (user is OWED) ----
  const cabin = unwrap(
    await create('groups', {
      user_id: userId,
      name: 'Lake Tahoe Ski Cabin',
      description: 'Cabin rental, groceries and ski passes for the long weekend.',
      currency: 'USD',
      created_at: daysAgo(21),
      updated_at: daysAgo(21),
    }),
  )
  for (const m of [self, dev, sam, clara]) {
    await addMembership(cabin.id, m.id, m.id === self.id ? 'owner' : 'member')
  }

  // Lakefront Airbnb — user paid $800.00, split equally 4 ways.
  await addExpense({
    groupId: cabin.id,
    payerId: self.id,
    amountCents: 80000,
    description: 'Lakefront Airbnb (3 nights)',
    category: 'lodging',
    days: 12,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 20000 },
      { memberId: dev.id, amountCents: 20000 },
      { memberId: sam.id, amountCents: 20000 },
      { memberId: clara.id, amountCents: 20000 },
    ],
  })

  // Safeway run — Clara paid $120.00, exact split (Dev bought the fancy cheese).
  await addExpense({
    groupId: cabin.id,
    payerId: clara.id,
    amountCents: 12000,
    description: 'Safeway Groceries & Cabin Supplies',
    category: 'groceries',
    days: 11,
    splitMethod: 'exact',
    shares: [
      { memberId: clara.id, amountCents: 3000 },
      { memberId: self.id, amountCents: 3000 },
      { memberId: dev.id, amountCents: 4500 },
      { memberId: sam.id, amountCents: 1500 },
    ],
  })

  // Lift tickets — Dev paid $460.00, split equally.
  await addExpense({
    groupId: cabin.id,
    payerId: dev.id,
    amountCents: 46000,
    description: 'Palisades Tahoe Lift Tickets & Passes',
    category: 'activities',
    days: 10,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 11500 },
      { memberId: dev.id, amountCents: 11500 },
      { memberId: sam.id, amountCents: 11500 },
      { memberId: clara.id, amountCents: 11500 },
    ],
  })

  // Partial settle-up: Dev already paid the user back $100.00 by transfer.
  await addSettlement({
    groupId: cabin.id,
    fromMemberId: dev.id,
    toMemberId: self.id,
    amountCents: 10000,
    method: 'transfer',
    days: 6,
    note: 'First chunk of the lift tickets',
  })

  await addActivity(
    cabin.id,
    'group_created',
    { actor: 'You', group_name: 'Lake Tahoe Ski Cabin', member_count: 4 },
    daysAgo(21),
  )
  await addActivity(
    cabin.id,
    'expense_added',
    {
      actor: 'You',
      description: 'Lakefront Airbnb (3 nights)',
      amount_cents: 80000,
      group_name: 'Lake Tahoe Ski Cabin',
      payer_name: 'You',
    },
    daysAgo(12),
  )
  await addActivity(
    cabin.id,
    'expense_added',
    {
      actor: 'Clara Tran',
      description: 'Safeway Groceries & Cabin Supplies',
      amount_cents: 12000,
      group_name: 'Lake Tahoe Ski Cabin',
      payer_name: 'Clara Tran',
    },
    daysAgo(11),
  )
  await addActivity(
    cabin.id,
    'expense_added',
    {
      actor: 'Dev Patel',
      description: 'Palisades Tahoe Lift Tickets & Passes',
      amount_cents: 46000,
      group_name: 'Lake Tahoe Ski Cabin',
      payer_name: 'Dev Patel',
    },
    daysAgo(10),
  )
  await addActivity(
    cabin.id,
    'settlement_recorded',
    {
      actor: 'Dev Patel',
      amount_cents: 10000,
      group_name: 'Lake Tahoe Ski Cabin',
      from_name: 'Dev Patel',
      to_name: 'You',
      method: 'transfer',
    },
    daysAgo(6),
  )

  // ---- group 2: Bushwick Flatmates (Apt 4B) (user OWES) ----
  const flat = unwrap(
    await create('groups', {
      user_id: userId,
      name: 'Bushwick Flatmates (Apt 4B)',
      description: 'Rent, groceries and internet for the flat.',
      currency: 'USD',
      created_at: daysAgo(60),
      updated_at: daysAgo(60),
    }),
  )
  for (const m of [self, marcus, liam]) {
    await addMembership(flat.id, m.id, m.id === self.id ? 'owner' : 'member')
  }

  // Rent — Marcus paid $3,600.00, equal thirds.
  await addExpense({
    groupId: flat.id,
    payerId: marcus.id,
    amountCents: 360000,
    description: 'October rent (Apt 4B)',
    category: 'rent',
    days: 9,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 120000 },
      { memberId: marcus.id, amountCents: 120000 },
      { memberId: liam.id, amountCents: 120000 },
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
      { memberId: marcus.id, amountCents: 2917 },
      { memberId: liam.id, amountCents: 2916 },
    ],
  })

  // Internet — Liam paid $60.00, equal thirds.
  await addExpense({
    groupId: flat.id,
    payerId: liam.id,
    amountCents: 6000,
    description: 'Fibre internet',
    category: 'utilities',
    days: 3,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 2000 },
      { memberId: marcus.id, amountCents: 2000 },
      { memberId: liam.id, amountCents: 2000 },
    ],
  })

  await addActivity(
    flat.id,
    'group_created',
    { actor: 'You', group_name: 'Bushwick Flatmates (Apt 4B)', member_count: 3 },
    daysAgo(60),
  )
  await addActivity(
    flat.id,
    'expense_added',
    {
      actor: 'Marcus Reid',
      description: 'October rent (Apt 4B)',
      amount_cents: 360000,
      group_name: 'Bushwick Flatmates (Apt 4B)',
      payer_name: 'Marcus Reid',
    },
    daysAgo(9),
  )
  await addActivity(
    flat.id,
    'member_added',
    { actor: 'You', group_name: 'Bushwick Flatmates (Apt 4B)', member_name: 'Liam Zeller' },
    daysAgo(8),
  )

  // ---- group 3: Joshua Tree Weekend (weights split; user is OWED) ----
  const jt = unwrap(
    await create('groups', {
      user_id: userId,
      name: 'Joshua Tree Weekend',
      description: 'Cabin, dinners and one very good stargazing night.',
      currency: 'USD',
      created_at: daysAgo(30),
      updated_at: daysAgo(30),
    }),
  )
  for (const m of [self, sam, clara]) {
    await addMembership(jt.id, m.id, m.id === self.id ? 'owner' : 'member')
  }

  // Airbnb — user paid $900.00, split equally.
  await addExpense({
    groupId: jt.id,
    payerId: self.id,
    amountCents: 90000,
    description: 'Joshua Tree Airbnb (2 nights)',
    category: 'lodging',
    days: 14,
    splitMethod: 'equal',
    shares: [
      { memberId: self.id, amountCents: 30000 },
      { memberId: sam.id, amountCents: 30000 },
      { memberId: clara.id, amountCents: 30000 },
    ],
  })

  // Dinner — Clara paid $240.00, exact split.
  await addExpense({
    groupId: jt.id,
    payerId: clara.id,
    amountCents: 24000,
    description: 'Pioneertown dinner',
    category: 'meals',
    days: 13,
    splitMethod: 'exact',
    shares: [
      { memberId: self.id, amountCents: 8000 },
      { memberId: sam.id, amountCents: 8000 },
      { memberId: clara.id, amountCents: 8000 },
    ],
  })

  // Gas & park passes — Sam paid $210.00; Sam takes a double share (2:1), Clara sat out.
  await addExpense({
    groupId: jt.id,
    payerId: sam.id,
    amountCents: 21000,
    description: 'Gas & park passes',
    category: 'transport',
    days: 12,
    splitMethod: 'shares',
    shares: [
      { memberId: sam.id, amountCents: 14000 },
      { memberId: self.id, amountCents: 7000 },
    ],
  })

  await addActivity(
    jt.id,
    'group_created',
    { actor: 'You', group_name: 'Joshua Tree Weekend', member_count: 3 },
    daysAgo(30),
  )
  await addActivity(
    jt.id,
    'expense_added',
    {
      actor: 'You',
      description: 'Joshua Tree Airbnb (2 nights)',
      amount_cents: 90000,
      group_name: 'Joshua Tree Weekend',
      payer_name: 'You',
    },
    daysAgo(14),
  )
  await addActivity(
    jt.id,
    'expense_added',
    {
      actor: 'Sam Kwon',
      description: 'Gas & park passes',
      amount_cents: 21000,
      group_name: 'Joshua Tree Weekend',
      payer_name: 'Sam Kwon',
    },
    hoursAgo(30),
  )

  // ---- group 4: Bi-Weekly Dinner Club (fully settled — nets are zero) ----
  const dinner = unwrap(
    await create('groups', {
      user_id: userId,
      name: 'Bi-Weekly Dinner Club',
      description: 'Osteria Morini and every other Friday table.',
      currency: 'USD',
      created_at: daysAgo(45),
      updated_at: daysAgo(45),
    }),
  )
  for (const m of [self, dev, clara, marcus]) {
    await addMembership(dinner.id, m.id, m.id === self.id ? 'owner' : 'member')
  }

  // Dinner — Clara paid $240.00, equal quarters.
  await addExpense({
    groupId: dinner.id,
    payerId: clara.id,
    amountCents: 24000,
    description: 'Osteria Morini Dinner',
    category: 'meals',
    days: 5,
    splitMethod: 'equal',
    shares: [
      { memberId: clara.id, amountCents: 6000 },
      { memberId: self.id, amountCents: 6000 },
      { memberId: dev.id, amountCents: 6000 },
      { memberId: marcus.id, amountCents: 6000 },
    ],
  })

  // Everyone settled their $60.00 share with Clara the same week.
  for (const payer of [self, dev, marcus]) {
    await addSettlement({
      groupId: dinner.id,
      fromMemberId: payer.id,
      toMemberId: clara.id,
      amountCents: 6000,
      method: 'cash',
      days: 2,
      note: 'Dinner club settle-up',
    })
  }

  await addActivity(
    dinner.id,
    'group_created',
    { actor: 'You', group_name: 'Bi-Weekly Dinner Club', member_count: 4 },
    daysAgo(45),
  )
  await addActivity(
    dinner.id,
    'expense_added',
    {
      actor: 'Clara Tran',
      description: 'Osteria Morini Dinner',
      amount_cents: 24000,
      group_name: 'Bi-Weekly Dinner Club',
      payer_name: 'Clara Tran',
    },
    daysAgo(5),
  )
  for (const payerName of ['You', 'Dev Patel', 'Marcus Reid']) {
    await addActivity(
      dinner.id,
      'settlement_recorded',
      {
        actor: payerName,
        amount_cents: 6000,
        group_name: 'Bi-Weekly Dinner Club',
        from_name: payerName,
        to_name: 'Clara Tran',
        method: 'cash',
      },
      daysAgo(2),
    )
  }

  return {
    membersCreated: 7,
    groupsCreated: 4,
    expensesCreated: 10,
    settlementsCreated: 4,
    activitiesCreated: 16,
  }
}

/** Convenience helper used by `_seed`-aware handlers. */
export async function ensureSeed(userId: string): Promise<boolean> {
  const r = await seedDemoForUser(userId)
  return r.groupsCreated > 0
}
