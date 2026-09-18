/**
 * Demo seed for crowdfunding.
 *
 * Seeding runs in two layers:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — a small catalogue of
 *    creators, campaigns, reward tiers, pledges, and updates so the
 *    Discover / CampaignDetail pages render with realistic content the
 *    moment a fresh user signs in. Idempotent: if any campaign row
 *    already exists, skipped entirely. Called once at server boot.
 *
 * 2. **Per-user** (`seedDemoForUser`) — kept available for parity with
 *    other flagships, but currently a no-op for crowdfunding because
 *    the global catalogue alone is sufficient for new users to start
 *    backing campaigns and creating their own.
 *
 * @module
 */

import crypto from 'node:crypto'

import { count, create, findById, findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface DemoCreator {
  user_id: string
  name: string
  email: string
}

interface DemoCampaignSeed {
  id: string
  creator_index: number
  title: string
  description: string
  goal_amount: number
  raised_amount: number
  category: string
  days_left: number
  featured: boolean
  cover_gradient: string
  tiers: ReadonlyArray<{
    id: string
    title: string
    description: string
    amount: number
    max_backers: number | null
    current_backers: number
    estimated_delivery: string
  }>
  updates: ReadonlyArray<{ title: string; body: string; days_ago: number }>
}

const CREATORS: ReadonlyArray<DemoCreator> = [
  {
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Sarah Jenkins',
    email: 'sarah@catapult.demo',
  },
  { user_id: '22222222-2222-2222-2222-222222222222', name: 'Studio K', email: 'kai@catapult.demo' },
  {
    user_id: '33333333-3333-3333-3333-333333333333',
    name: 'Visionary Films',
    email: 'vf@catapult.demo',
  },
  {
    user_id: '44444444-4444-4444-4444-444444444444',
    name: 'Comet Games',
    email: 'comet@catapult.demo',
  },
]

const DEMO_BACKERS: ReadonlyArray<{ user_id: string; name: string; email: string }> = [
  { user_id: '55555555-5555-5555-5555-555555555555', name: 'Min Kim', email: 'min@catapult.demo' },
  {
    user_id: '66666666-6666-6666-6666-666666666666',
    name: 'Alex Morales',
    email: 'alex@catapult.demo',
  },
  {
    user_id: '77777777-7777-7777-7777-777777777777',
    name: 'Priya Patel',
    email: 'priya@catapult.demo',
  },
  {
    user_id: '88888888-8888-8888-8888-888888888888',
    name: 'Jordan Tate',
    email: 'jordan@catapult.demo',
  },
]

const CAMPAIGNS: ReadonlyArray<DemoCampaignSeed> = [
  {
    id: 'aaaaaaaa-1111-4111-8111-111111111111',
    creator_index: 0,
    title: 'Aura — the next-generation smart ring for deep sleep',
    description:
      'Aura is a hardware-first wearable that disappears on your finger and just helps you sleep better. After two years of prototypes, we are ready to ship.',
    goal_amount: 100_000,
    raised_amount: 48_320,
    category: 'Tech',
    days_left: 12,
    featured: true,
    cover_gradient: 'linear-gradient(135deg, #0f172a 0%, #164e63 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-1111-4111-8111-111111111111',
        title: 'Early Bird',
        description: 'One ring + free shipping. Limited slots.',
        amount: 120,
        max_backers: 500,
        current_backers: 412,
        estimated_delivery: 'Mar 2027',
      },
      {
        id: 'bbbbbbbb-1111-4111-8111-222222222222',
        title: 'The Pair',
        description: 'Two rings, your choice of finishes. Includes companion app.',
        amount: 220,
        max_backers: null,
        current_backers: 188,
        estimated_delivery: 'Apr 2027',
      },
      {
        id: 'bbbbbbbb-1111-4111-8111-333333333333',
        title: 'Founders Pro',
        description: 'Limited founders edition with engraving + lifetime updates.',
        amount: 450,
        max_backers: 50,
        current_backers: 24,
        estimated_delivery: 'May 2027',
      },
    ],
    updates: [
      {
        title: 'We hit 40% in 48 hours',
        body: 'Thank you to our first 200 backers. We are blown away. Production prep starts the week we hit 100%.',
        days_ago: 1,
      },
    ],
  },
  {
    id: 'aaaaaaaa-2222-4222-8222-222222222222',
    creator_index: 1,
    title: 'ErgoFocus — the ultimate posture-correcting workspace',
    description:
      'A modular standing desk and chair system designed by a team of physical therapists and product designers. Built to last 20 years.',
    goal_amount: 130_000,
    raised_amount: 112_000,
    category: 'Design',
    days_left: 5,
    featured: true,
    cover_gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-2222-4222-8222-111111111111',
        title: 'Single Chair',
        description: 'One ErgoFocus chair, your color choice.',
        amount: 380,
        max_backers: null,
        current_backers: 230,
        estimated_delivery: 'Jun 2027',
      },
      {
        id: 'bbbbbbbb-2222-4222-8222-222222222222',
        title: 'Chair + Desk Combo',
        description: 'Standing desk + chair pair.',
        amount: 1100,
        max_backers: 200,
        current_backers: 84,
        estimated_delivery: 'Jul 2027',
      },
    ],
    updates: [
      {
        title: 'Final factory tour',
        body: 'We visited the production floor last week — see the photos.',
        days_ago: 3,
      },
    ],
  },
  {
    id: 'aaaaaaaa-3333-4333-8333-333333333333',
    creator_index: 2,
    title: 'Neon Shadows — an independent sci-fi short film',
    description:
      'A 22-minute sci-fi short with a real practical effects crew, original score, and theatrical festival distribution.',
    goal_amount: 25_000,
    raised_amount: 25_500,
    category: 'Film',
    days_left: 0,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #581c87 0%, #1e1b4b 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-3333-4333-8333-111111111111',
        title: 'Producer Credit',
        description: 'Producer credit + digital download + cast Q&A.',
        amount: 250,
        max_backers: null,
        current_backers: 96,
        estimated_delivery: 'Sep 2027',
      },
    ],
    updates: [
      {
        title: 'Production wrap!',
        body: 'Principal photography is done. Editing starts next week.',
        days_ago: 2,
      },
    ],
  },
  {
    id: 'aaaaaaaa-4444-4444-8444-444444444444',
    creator_index: 3,
    title: 'Orbital Deck — a strategy card game for two to six players',
    description:
      'A space-faring deckbuilder with asymmetric factions, fast turns, and a 60-minute play time. Designed by a tabletop veteran.',
    goal_amount: 95_000,
    raised_amount: 74_000,
    category: 'Games',
    days_left: 18,
    featured: true,
    cover_gradient: 'linear-gradient(135deg, #0f4c5c 0%, #5f0f40 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-4444-4444-8444-111111111111',
        title: 'Standard Edition',
        description: 'Base game + sleeves.',
        amount: 60,
        max_backers: null,
        current_backers: 480,
        estimated_delivery: 'Aug 2027',
      },
      {
        id: 'bbbbbbbb-4444-4444-8444-222222222222',
        title: 'Founders Box',
        description: 'Limited deluxe edition with metal coins + alt art.',
        amount: 150,
        max_backers: 300,
        current_backers: 132,
        estimated_delivery: 'Sep 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-5555-4555-8555-555555555555',
    creator_index: 0,
    title: 'Farm Supper Club — seasonal pop-up dinners for our community',
    description:
      'A 12-night pop-up series featuring zero-waste, hyper-seasonal menus from local farms. Held in a restored barn outside Hudson, NY.',
    goal_amount: 24_000,
    raised_amount: 18_000,
    category: 'Food',
    days_left: 9,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #1e3a8a 0%, #166534 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-5555-4555-8555-111111111111',
        title: 'Single Seat',
        description: 'One seat at the chefs table for any one supper.',
        amount: 175,
        max_backers: 144,
        current_backers: 96,
        estimated_delivery: 'Oct 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-6666-4666-8666-666666666666',
    creator_index: 1,
    title: 'Ridge Line — a debut folk album recorded live in the studio',
    description:
      'A debut from a five-piece folk band, tracked entirely live to two-inch tape with no overdubs. Vinyl + digital deliverables.',
    goal_amount: 12_000,
    raised_amount: 9_800,
    category: 'Music',
    days_left: 22,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #831843 0%, #422006 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-6666-4666-8666-111111111111',
        title: 'Digital Album',
        description: 'High-res digital download.',
        amount: 25,
        max_backers: null,
        current_backers: 88,
        estimated_delivery: 'Nov 2027',
      },
      {
        id: 'bbbbbbbb-6666-4666-8666-222222222222',
        title: 'Signed Vinyl',
        description: 'Numbered, signed, limited-pressing 180g vinyl.',
        amount: 95,
        max_backers: 200,
        current_backers: 64,
        estimated_delivery: 'Dec 2027',
      },
    ],
    updates: [],
  },
]

async function ensureUser(u: { user_id: string; name: string; email: string }): Promise<void> {
  const existing = await findById<Record<string, unknown>>('users', u.user_id)
  if (existing) return
  await create('users', {
    id: u.user_id,
    email: u.email,
    name: u.name,
    username: u.email.split('@')[0],
    twoFactorEnabled: false,
    oauthData: {},
    planKey: 'free',
    createdAt: new Date(Date.now() - 90 * 86_400_000),
    updatedAt: new Date(Date.now() - 90 * 86_400_000),
  })
}

/**
 * Seed the global catalog if no campaigns exist. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  campaignsCreated: number
  tiersCreated: number
  pledgesCreated: number
  updatesCreated: number
}> {
  const existingCampaigns = await count('campaigns', [])
  if (existingCampaigns > 0) {
    return { campaignsCreated: 0, tiersCreated: 0, pledgesCreated: 0, updatesCreated: 0 }
  }

  for (const c of CREATORS) await ensureUser(c)
  for (const b of DEMO_BACKERS) await ensureUser(b)

  let campaignsCreated = 0
  let tiersCreated = 0
  let pledgesCreated = 0
  let updatesCreated = 0
  const now = Date.now()

  for (const seed of CAMPAIGNS) {
    const creator = CREATORS[seed.creator_index]
    const startDate = new Date(now - 14 * 86_400_000)
    const endDate = new Date(now + seed.days_left * 86_400_000)
    const status =
      seed.days_left > 0
        ? seed.raised_amount >= seed.goal_amount
          ? 'funded'
          : 'active'
        : seed.raised_amount >= seed.goal_amount
          ? 'funded'
          : 'ended'

    await create('campaigns', {
      id: seed.id,
      creator_id: creator.user_id,
      title: seed.title,
      description: seed.description,
      goal_amount: seed.goal_amount,
      raised_amount: seed.raised_amount,
      start_date: startDate,
      end_date: endDate,
      status,
      category: seed.category,
      cover_image_url: null,
      featured: seed.featured,
      created_at: startDate,
      updated_at: new Date(now - 86_400_000),
    })
    campaignsCreated++

    for (const tier of seed.tiers) {
      await create('reward_tiers', {
        id: tier.id,
        campaign_id: seed.id,
        title: tier.title,
        description: tier.description,
        amount: tier.amount,
        max_backers: tier.max_backers,
        current_backers: tier.current_backers,
        estimated_delivery: tier.estimated_delivery,
        created_at: startDate,
        updated_at: new Date(now - 86_400_000),
      })
      tiersCreated++
    }

    // Seed a couple of demo pledges per campaign so the Discover/Detail
    // backer counts and progress bars match the raised_amount.
    const pledgeFromBackers = DEMO_BACKERS.slice(
      0,
      Math.min(seed.tiers.length, DEMO_BACKERS.length),
    )
    for (let i = 0; i < pledgeFromBackers.length; i++) {
      const tier = seed.tiers[i]
      await create('pledges', {
        id: crypto.randomUUID(),
        campaign_id: seed.id,
        tier_id: tier.id,
        backer_id: pledgeFromBackers[i].user_id,
        amount: tier.amount,
        status: 'active',
        payment_id: `seed_pi_${seed.id.slice(0, 8)}_${i}`,
        created_at: new Date(now - (i + 1) * 86_400_000),
        updated_at: new Date(now - (i + 1) * 86_400_000),
      })
      pledgesCreated++
    }

    for (const u of seed.updates) {
      await create('campaign_updates', {
        id: crypto.randomUUID(),
        campaign_id: seed.id,
        author_id: creator.user_id,
        title: u.title,
        body: u.body,
        backers_only: false,
        created_at: new Date(now - u.days_ago * 86_400_000),
        updated_at: new Date(now - u.days_ago * 86_400_000),
      })
      updatesCreated++
    }
  }

  return { campaignsCreated, tiersCreated, pledgesCreated, updatesCreated }
}

/**
 * Per-user seed. Currently a no-op — the global catalogue is enough
 * for a freshly signed-up user to start exploring and backing.
 */
export async function seedDemoForUser(_userId: string): Promise<void> {
  // Reserved for future per-user seeding.
}

export const _SEED_CREATORS = CREATORS
export const _SEED_BACKERS = DEMO_BACKERS

export { logger as _seedLogger }

// Re-export findMany to silence "unused" warnings when this file is
// trimmed in future revisions.
export const _findMany = findMany
