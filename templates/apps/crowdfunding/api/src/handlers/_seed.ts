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
  {
    id: 'aaaaaaaa-7777-4777-8777-777777777777',
    creator_index: 0,
    title: 'Next-Gen Modular Smartwatch',
    description:
      'A smartwatch you can open: swappable battery cells, upgradeable sensor pods, and a fully documented teardown guide for every generation.',
    goal_amount: 80_000,
    raised_amount: 41_900,
    category: 'Tech',
    days_left: 18,
    featured: true,
    cover_gradient: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-7777-4111-8777-111111111111',
        title: 'Starter Core',
        description: 'The watch body, one battery cell, and the standard band.',
        amount: 149,
        max_backers: 800,
        current_backers: 260,
        estimated_delivery: 'Jun 2027',
      },
      {
        id: 'bbbbbbbb-7777-4111-8777-222222222222',
        title: 'Modder Kit',
        description: 'Watch plus two sensor pods and the developer toolchain.',
        amount: 249,
        max_backers: null,
        current_backers: 118,
        estimated_delivery: 'Jul 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-8888-4888-8888-888888888888',
    creator_index: 1,
    title: 'The Perfect Pour: Minimalist Ceramic Coffee Dripper',
    description:
      'A hand-thrown ceramic dripper with a spiral rib profile that evens extraction — designed with a roastery, fired in a small studio kiln.',
    goal_amount: 12_000,
    raised_amount: 9_450,
    category: 'Design',
    days_left: 9,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #44403c 0%, #a8a29e 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-8888-4111-8888-111111111111',
        title: 'Single Dripper',
        description: 'One dripper in your chosen glaze.',
        amount: 48,
        max_backers: 600,
        current_backers: 174,
        estimated_delivery: 'Feb 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-9999-4999-8999-999999999999',
    creator_index: 3,
    title: 'Neon Nights: Tabletop Retro Arcade',
    description:
      'A print-and-play-meets-chips tabletop arcade cabinet — a 2-4 player push-your-luck game with real LED marquee cards.',
    goal_amount: 25_000,
    raised_amount: 13_725,
    category: 'Games',
    days_left: 21,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #4c1d95 0%, #db2777 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-9999-4111-8999-111111111111',
        title: 'Arcade Cabinet',
        description: 'The full box: boards, LED marquee cards, and tokens.',
        amount: 59,
        max_backers: null,
        current_backers: 205,
        estimated_delivery: 'May 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    creator_index: 0,
    title: "The Modern Investor's Almanac 2025",
    description:
      'A hardcover annual of market history, allocator interviews, and the charts worth pinning above a desk — printed on archival paper.',
    goal_amount: 18_000,
    raised_amount: 15_210,
    category: 'Publishing',
    days_left: 15,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #1c1917 0%, #b45309 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-aaaa-4111-8aaa-111111111111',
        title: 'Hardcover',
        description: 'First-edition hardcover, numbered.',
        amount: 39,
        max_backers: 1500,
        current_backers: 371,
        estimated_delivery: 'Apr 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    creator_index: 1,
    title: 'Analog Echo: Desktop Pocket Synthesizer',
    description:
      'A pocketable analog synth with a true signal path, four voice banks, and a cradle that doubles as a desktop stand.',
    goal_amount: 60_000,
    raised_amount: 52_400,
    category: 'Tech',
    days_left: 6,
    featured: true,
    cover_gradient: 'linear-gradient(135deg, #082f49 0%, #0ea5e9 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-bbbb-4111-8bbb-111111111111',
        title: 'Echo Unit',
        description: 'The synthesizer plus travel sleeve.',
        amount: 179,
        max_backers: 900,
        current_backers: 294,
        estimated_delivery: 'Mar 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-cccc-4ccc-8ccc-cccccccccccc',
    creator_index: 2,
    title: 'Everyday Recycled Canvas Backpack',
    description:
      'A 20-litre daypack in recycled canvas with a repair-for-life guarantee — modular pockets, no brand patch, and a lifetime restitch.',
    goal_amount: 30_000,
    raised_amount: 11_480,
    category: 'Design',
    days_left: 24,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #3f3f46 0%, #84cc16 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-cccc-4111-8ccc-111111111111',
        title: 'One Pack',
        description: 'The backpack in olive, charcoal, or sand.',
        amount: 89,
        max_backers: null,
        current_backers: 127,
        estimated_delivery: 'Jun 2027',
      },
    ],
    updates: [
      {
        title: 'Packaging Design Finalized',
        body: 'The mailer is plastic-free: a single recycled-cardboard sleeve that becomes a shelf on tear-out. Samples pass the drop test next week.',
        days_ago: 2,
      },
    ],
  },
  {
    id: 'aaaaaaaa-dddd-4ddd-8ddd-dddddddddddd',
    creator_index: 2,
    title: 'Nomad Everyday Backpack',
    description:
      'The travel sibling of our daypack: clamshell opening, a laptop sleeve that clears security without unpacking, and hidden passport pockets.',
    goal_amount: 45_000,
    raised_amount: 27_300,
    category: 'Design',
    days_left: 11,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #292524 0%, #d97706 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-dddd-4111-8ddd-111111111111',
        title: 'Nomad 28L',
        description: 'The carry-on sized pack with rain cover.',
        amount: 129,
        max_backers: 700,
        current_backers: 212,
        estimated_delivery: 'Jul 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-eeee-4eee-8eee-eeeeeeeeeeee',
    creator_index: 3,
    title: 'Realms of Eldoria: Board Game',
    description:
      'A legacy-style realm builder for 2-5 players: evolving maps, a campaign book with 14 chapters, and miniatures sculpted at 32mm.',
    goal_amount: 90_000,
    raised_amount: 63_500,
    category: 'Games',
    days_left: 19,
    featured: true,
    cover_gradient: 'linear-gradient(135deg, #14532d 0%, #eab308 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-eeee-4111-8eee-111111111111',
        title: 'Eldoria Core',
        description: 'The base game with all unlocked stretch goals.',
        amount: 69,
        max_backers: null,
        current_backers: 922,
        estimated_delivery: 'Oct 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-f1f1-41f1-81f1-f1f1f1f1f1f1',
    creator_index: 0,
    title: 'Apex Smart Backpack',
    description:
      'A commute pack with a removable tracking tile pocket, USB-C pass-through, and a suspension frame that carries 12 kg like 6.',
    goal_amount: 35_000,
    raised_amount: 19_875,
    category: 'Tech',
    days_left: 16,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #1e1b4b 0%, #6366f1 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-f1f1-4111-81f1-111111111111',
        title: 'Apex Day One',
        description: 'First-run pack with the tracking pocket included.',
        amount: 109,
        max_backers: 850,
        current_backers: 183,
        estimated_delivery: 'Aug 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-f2f2-42f2-82f2-f2f2f2f2f2f2',
    creator_index: 3,
    title: 'RetroPlay Portable Console',
    description:
      'A pocket handheld with a machined aluminium shell, cartridge slot for open-source ROM carts, and a CRT-filter LCD.',
    goal_amount: 70_000,
    raised_amount: 44_120,
    category: 'Games',
    days_left: 13,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #450a0a 0%, #f59e0b 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-f2f2-4111-82f2-111111111111',
        title: 'Console + Cart',
        description: 'The handheld plus one blank developer cart.',
        amount: 139,
        max_backers: 1000,
        current_backers: 318,
        estimated_delivery: 'Sep 2027',
      },
    ],
    updates: [],
  },
  {
    id: 'aaaaaaaa-f3f3-43f3-83f3-f3f3f3f3f3f3',
    creator_index: 1,
    title: 'Lumen Lamp — a warm, dimmable desk lamp',
    description:
      'A brass-and-walnut desk lamp with stepless dimming, a USB-C reading light on the stem, and felt-lined feet.',
    goal_amount: 22_000,
    raised_amount: 16_640,
    category: 'Design',
    days_left: 8,
    featured: false,
    cover_gradient: 'linear-gradient(135deg, #422006 0%, #fbbf24 100%)',
    tiers: [
      {
        id: 'bbbbbbbb-f3f3-4111-83f3-111111111111',
        title: 'Walnut Edition',
        description: 'The lamp with a solid walnut arm and brass joints.',
        amount: 159,
        max_backers: 400,
        current_backers: 105,
        estimated_delivery: 'May 2027',
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
