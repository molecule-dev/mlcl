/**
 * Sample fixtures for screens that don't yet have a backend route — keeps
 * the polished pages renderable in screenshots and logged-out previews.
 *
 * TODO: replace with real /api/campaigns once api/src/router exposes them.
 */

import type { CampaignCardData } from '../components/CampaignCard.js'

export const SAMPLE_CAMPAIGNS: ReadonlyArray<CampaignCardData> = [
  {
    id: 'aura-smart-ring',
    title: 'Aura — the next-generation smart ring for deep sleep',
    category: 'Tech',
    cover_image_url: '',
    creator_name: 'Sarah Jenkins',
    pledged_cents: 4_832_000,
    goal_cents: 10_000_000,
    backer_count: 127,
    days_left: 12,
  },
  {
    id: 'ergofocus-chair',
    title: 'ErgoFocus — the ultimate posture-correcting workspace',
    category: 'Design',
    cover_image_url: '',
    creator_name: 'Studio K',
    pledged_cents: 11_200_000,
    goal_cents: 13_000_000,
    backer_count: 430,
    days_left: 5,
  },
  {
    id: 'neon-shadows-film',
    title: 'Neon Shadows — an independent sci-fi short film',
    category: 'Film',
    cover_image_url: '',
    creator_name: 'Visionary Films',
    pledged_cents: 2_550_000,
    goal_cents: 2_500_000,
    backer_count: 208,
    days_left: 0,
  },
  {
    id: 'orbital-deck-game',
    title: 'Orbital Deck — a strategy card game for two to six players',
    category: 'Games',
    cover_image_url: '',
    creator_name: 'Comet Games',
    pledged_cents: 7_400_000,
    goal_cents: 9_500_000,
    backer_count: 612,
    days_left: 18,
  },
  {
    id: 'farm-supper-club',
    title: 'Farm Supper Club — seasonal pop-up dinners for our community',
    category: 'Food',
    cover_image_url: '',
    creator_name: 'The Long Table',
    pledged_cents: 1_800_000,
    goal_cents: 2_400_000,
    backer_count: 96,
    days_left: 9,
  },
  {
    id: 'ridge-line-album',
    title: 'Ridge Line — a debut folk album recorded live in the studio',
    category: 'Music',
    cover_image_url: '',
    creator_name: 'Hollow Birds',
    pledged_cents: 980_000,
    goal_cents: 1_200_000,
    backer_count: 173,
    days_left: 22,
  },
]

export const CATEGORIES = ['Tech', 'Design', 'Film', 'Games', 'Music', 'Food', 'Art'] as const

export function pickCampaign(id: string): CampaignCardData {
  return SAMPLE_CAMPAIGNS.find((c) => c.id === id) ?? SAMPLE_CAMPAIGNS[0]
}
