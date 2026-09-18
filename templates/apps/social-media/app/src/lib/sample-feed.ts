/**
 * Shared TypeScript shapes + small presentation helpers (gradient palette,
 * count formatter, sample fixtures) used by polished pages and components.
 *
 * Component prop interfaces match the post / story / profile / message
 * shapes implied by `api/handlers/*` + DESIGN.md + screen-map.json. The
 * sample arrays at the bottom of this file are only used in the rare
 * codepaths where no API data is available (component storybook stubs);
 * production pages always call `useHttpClient()` against the real API.
 */

export interface SampleAuthor {
  id: string
  display_name: string
  handle: string
  cover_index: number
  is_verified: boolean
  bio: string
}

export interface SamplePost {
  id: string
  author: SampleAuthor
  caption: string
  cover_index: number
  /** layout bucket — 'tall' | 'wide' | 'square' for the explore masonry. */
  aspect: 'tall' | 'wide' | 'square'
  like_count: number
  comment_count: number
  share_count: number
  liked: boolean
  saved: boolean
  location: string | null
  posted_at: string
  tags: string[]
  is_live?: boolean
}

export interface SampleStory {
  id: string
  author: SampleAuthor
  /** True when the viewer hasn't seen this group yet (rainbow ring on/off). */
  unread: boolean
  /** Number of segments inside the group. */
  segment_count: number
  posted_at: string
  /** Optional gradient cover behind the avatar (used by viewer skeleton). */
  cover_index: number
}

export interface SampleComment {
  id: string
  author: SampleAuthor
  body: string
  posted_at: string
  like_count: number
  liked: boolean
}

export interface SampleConversation {
  id: string
  with: SampleAuthor
  last_message: string
  last_message_at: string
  /** Author of the last message (for "you: …" prefix). */
  last_message_by: 'me' | 'them'
  unread_count: number
  is_typing: boolean
  is_online: boolean
}

export type SampleNotificationKind = 'like' | 'comment' | 'follow' | 'mention' | 'live' | 'tag'

export interface SampleNotification {
  id: string
  kind: SampleNotificationKind | string
  actor: SampleAuthor | null
  /** Optional secondary actors (for "and N others" grouping). */
  also: SampleAuthor[]
  /** Optional related post — drives the right-side thumbnail. */
  post_id?: string | null
  post_cover_index?: number
  excerpt?: string
  posted_at: string
  unread: boolean
  href?: string | null
}

export interface SampleSuggestion {
  author: SampleAuthor
  reason: string
  mutual_count: number
}

export interface SampleHashtag {
  tag: string
  post_count: number
  delta_pct: number
}

export const SAMPLE_AUTHORS: SampleAuthor[] = [
  {
    id: 'u_aria',
    display_name: 'Aria Sato',
    handle: 'ariasato',
    cover_index: 0,
    is_verified: true,
    bio: 'Color theorist · slow-living photographer · Tokyo',
  },
  {
    id: 'u_kelvin',
    display_name: 'Kelvin Okafor',
    handle: 'kelvinokafor',
    cover_index: 1,
    is_verified: true,
    bio: 'Director, Vivid Originals · Lagos · DM for collabs',
  },
  {
    id: 'u_sienna',
    display_name: 'Sienna Park',
    handle: 'siennapark',
    cover_index: 2,
    is_verified: false,
    bio: 'Studio days, late nights · Seoul ↔ NYC',
  },
  {
    id: 'u_amelie',
    display_name: 'Amélie Lefèvre',
    handle: 'amelielefevre',
    cover_index: 3,
    is_verified: true,
    bio: 'Pâtissière. I post croissants and feelings.',
  },
  {
    id: 'u_dominic',
    display_name: 'Dominic Vega',
    handle: 'dominicvega',
    cover_index: 4,
    is_verified: false,
    bio: 'Skater, dad, occasional film camera enjoyer.',
  },
  {
    id: 'u_jade',
    display_name: 'Jade Whitlock',
    handle: 'jadewhitlock',
    cover_index: 5,
    is_verified: true,
    bio: 'Mixed-media artist · open studios · Brooklyn',
  },
  {
    id: 'u_milo',
    display_name: 'Milo Aaltonen',
    handle: 'milo',
    cover_index: 6,
    is_verified: false,
    bio: 'Helsinki cyclist. Sauna evangelist. ~1500 km/yr.',
  },
  {
    id: 'u_naomi',
    display_name: 'Naomi Cabrera',
    handle: 'naomicab',
    cover_index: 0,
    is_verified: true,
    bio: 'Producer · Brava Records · cdmx based · she/her',
  },
  {
    id: 'u_freddie',
    display_name: 'Freddie Wells',
    handle: 'freddiewells',
    cover_index: 1,
    is_verified: false,
    bio: 'Surf shaper, dawn paddler, occasional poet.',
  },
  {
    id: 'u_priya',
    display_name: 'Priya Anand',
    handle: 'priyaanand',
    cover_index: 2,
    is_verified: true,
    bio: 'Costume designer · west end · sews on her lunch break',
  },
  {
    id: 'u_theo',
    display_name: 'Theo van der Meer',
    handle: 'theovandermeer',
    cover_index: 3,
    is_verified: false,
    bio: 'Architectural photography. Daylight-only.',
  },
  {
    id: 'u_elena',
    display_name: 'Elena Iovine',
    handle: 'elenaiovine',
    cover_index: 4,
    is_verified: true,
    bio: 'Editor-in-chief · La Pagina · Florence',
  },
]

export const SAMPLE_POSTS: SamplePost[] = [
  {
    id: 'post_dawn_river',
    author: SAMPLE_AUTHORS[0],
    caption:
      'Five minutes of usable light over the Sumida — the camera barely caught it. Sound on for the wind, off for the trains. ✨',
    cover_index: 0,
    aspect: 'wide',
    like_count: 12_402,
    comment_count: 318,
    share_count: 86,
    liked: true,
    saved: false,
    location: 'Sumida River, Tokyo',
    posted_at: '2026-04-29T05:18:00Z',
    tags: ['cityscape', 'goldenhour', 'tokyo'],
    is_live: false,
  },
  {
    id: 'post_studio_jam',
    author: SAMPLE_AUTHORS[1],
    caption:
      "Day three at the studio. We re-cut the bridge twice. I think it's done. (Reel up Friday.)",
    cover_index: 1,
    aspect: 'square',
    like_count: 9_881,
    comment_count: 542,
    share_count: 121,
    liked: false,
    saved: true,
    location: 'Brava HQ, Lagos',
    posted_at: '2026-04-29T01:42:00Z',
    tags: ['music', 'behindthescenes'],
    is_live: true,
  },
  {
    id: 'post_studio_floor',
    author: SAMPLE_AUTHORS[2],
    caption: 'Floor-day. Three rolls of film, six bruised knees, one decent self-portrait.',
    cover_index: 2,
    aspect: 'tall',
    like_count: 4_220,
    comment_count: 142,
    share_count: 22,
    liked: false,
    saved: false,
    location: 'Seoul',
    posted_at: '2026-04-28T22:10:00Z',
    tags: ['portrait', 'film'],
  },
  {
    id: 'post_croissants',
    author: SAMPLE_AUTHORS[3],
    caption: 'Lamination day. Ninety-six layers, very serious. Tag a friend who would steal one.',
    cover_index: 3,
    aspect: 'square',
    like_count: 21_050,
    comment_count: 1_020,
    share_count: 415,
    liked: true,
    saved: true,
    location: 'Pâtisserie Lefèvre, Lyon',
    posted_at: '2026-04-28T16:00:00Z',
    tags: ['baking', 'food', 'pastry'],
  },
  {
    id: 'post_skate_curb',
    author: SAMPLE_AUTHORS[4],
    caption:
      'First curb of the season. Teeth-rattling. 10/10 would do again. Soundtrack by my creaky knees.',
    cover_index: 4,
    aspect: 'wide',
    like_count: 1_412,
    comment_count: 88,
    share_count: 12,
    liked: false,
    saved: false,
    location: 'San Diego',
    posted_at: '2026-04-28T11:25:00Z',
    tags: ['skate', 'film', 'sandiego'],
  },
  {
    id: 'post_studio_paint',
    author: SAMPLE_AUTHORS[5],
    caption: 'Studio open Sat. Six new pieces. Cobalt phase officially over (probably).',
    cover_index: 5,
    aspect: 'square',
    like_count: 3_980,
    comment_count: 207,
    share_count: 45,
    liked: false,
    saved: true,
    location: 'Williamsburg, BK',
    posted_at: '2026-04-28T08:00:00Z',
    tags: ['art', 'studio'],
  },
  {
    id: 'post_bike_dawn',
    author: SAMPLE_AUTHORS[6],
    caption: 'Up at 5, on the road by 5:20, sauna by 8. The math works.',
    cover_index: 6,
    aspect: 'tall',
    like_count: 612,
    comment_count: 28,
    share_count: 3,
    liked: false,
    saved: false,
    location: 'Helsinki',
    posted_at: '2026-04-27T05:30:00Z',
    tags: ['cycling', 'sunrise'],
  },
  {
    id: 'post_studio_session',
    author: SAMPLE_AUTHORS[7],
    caption: 'session 14. nina just laid down a top line that made me cry. ETA: TBD.',
    cover_index: 0,
    aspect: 'wide',
    like_count: 6_204,
    comment_count: 188,
    share_count: 60,
    liked: true,
    saved: false,
    location: 'CDMX',
    posted_at: '2026-04-26T23:55:00Z',
    tags: ['music', 'studio', 'inprogress'],
  },
  {
    id: 'post_dawn_paddle',
    author: SAMPLE_AUTHORS[8],
    caption: 'Glass at sunrise. Five guys, no words, one wave each. Then breakfast.',
    cover_index: 1,
    aspect: 'wide',
    like_count: 2_204,
    comment_count: 64,
    share_count: 18,
    liked: false,
    saved: false,
    location: 'Byron Bay',
    posted_at: '2026-04-26T07:10:00Z',
    tags: ['surf', 'sunrise'],
  },
  {
    id: 'post_sewing',
    author: SAMPLE_AUTHORS[9],
    caption: 'Six bespoke seams in 30 minutes. The lunch hour is undefeated.',
    cover_index: 2,
    aspect: 'square',
    like_count: 880,
    comment_count: 41,
    share_count: 9,
    liked: false,
    saved: true,
    location: 'West End, London',
    posted_at: '2026-04-25T13:20:00Z',
    tags: ['theatre', 'costume'],
  },
  {
    id: 'post_facade',
    author: SAMPLE_AUTHORS[10],
    caption: 'Façade study. South Rotterdam, 14:02. Daylight is the only filter.',
    cover_index: 3,
    aspect: 'tall',
    like_count: 1_124,
    comment_count: 30,
    share_count: 11,
    liked: false,
    saved: false,
    location: 'Rotterdam',
    posted_at: '2026-04-24T14:02:00Z',
    tags: ['architecture'],
  },
  {
    id: 'post_editorial',
    author: SAMPLE_AUTHORS[11],
    caption: 'Florence issue is on press. Pre-order link in bio. Thank you to every contributor.',
    cover_index: 4,
    aspect: 'square',
    like_count: 5_402,
    comment_count: 112,
    share_count: 80,
    liked: true,
    saved: true,
    location: 'Florence',
    posted_at: '2026-04-23T19:30:00Z',
    tags: ['editorial', 'magazine'],
  },
]

export const SAMPLE_STORIES: SampleStory[] = [
  {
    id: 's_aria',
    author: SAMPLE_AUTHORS[0],
    unread: true,
    segment_count: 4,
    posted_at: '2026-04-29T05:30:00Z',
    cover_index: 0,
  },
  {
    id: 's_kelvin',
    author: SAMPLE_AUTHORS[1],
    unread: true,
    segment_count: 6,
    posted_at: '2026-04-29T03:10:00Z',
    cover_index: 1,
  },
  {
    id: 's_sienna',
    author: SAMPLE_AUTHORS[2],
    unread: true,
    segment_count: 3,
    posted_at: '2026-04-28T23:00:00Z',
    cover_index: 2,
  },
  {
    id: 's_amelie',
    author: SAMPLE_AUTHORS[3],
    unread: false,
    segment_count: 5,
    posted_at: '2026-04-28T18:00:00Z',
    cover_index: 3,
  },
  {
    id: 's_dominic',
    author: SAMPLE_AUTHORS[4],
    unread: true,
    segment_count: 2,
    posted_at: '2026-04-28T13:25:00Z',
    cover_index: 4,
  },
  {
    id: 's_jade',
    author: SAMPLE_AUTHORS[5],
    unread: false,
    segment_count: 7,
    posted_at: '2026-04-28T10:00:00Z',
    cover_index: 5,
  },
  {
    id: 's_milo',
    author: SAMPLE_AUTHORS[6],
    unread: false,
    segment_count: 1,
    posted_at: '2026-04-27T07:50:00Z',
    cover_index: 6,
  },
  {
    id: 's_naomi',
    author: SAMPLE_AUTHORS[7],
    unread: true,
    segment_count: 8,
    posted_at: '2026-04-27T01:18:00Z',
    cover_index: 0,
  },
  {
    id: 's_freddie',
    author: SAMPLE_AUTHORS[8],
    unread: false,
    segment_count: 3,
    posted_at: '2026-04-26T08:00:00Z',
    cover_index: 1,
  },
  {
    id: 's_priya',
    author: SAMPLE_AUTHORS[9],
    unread: true,
    segment_count: 4,
    posted_at: '2026-04-25T14:00:00Z',
    cover_index: 2,
  },
]

export const SAMPLE_COMMENTS: SampleComment[] = [
  {
    id: 'c1',
    author: SAMPLE_AUTHORS[3],
    body: 'That sky is unreal. What time was the shot?',
    posted_at: '2026-04-29T05:42:00Z',
    like_count: 218,
    liked: true,
  },
  {
    id: 'c2',
    author: SAMPLE_AUTHORS[4],
    body: 'Counting eight different blues in here 👀',
    posted_at: '2026-04-29T05:50:00Z',
    like_count: 90,
    liked: false,
  },
  {
    id: 'c3',
    author: SAMPLE_AUTHORS[1],
    body: 'Stop it. STOP. This is too good.',
    posted_at: '2026-04-29T06:01:00Z',
    like_count: 412,
    liked: false,
  },
  {
    id: 'c4',
    author: SAMPLE_AUTHORS[5],
    body: 'Saving this for the next palette study. Thanks for sharing the EXIF.',
    posted_at: '2026-04-29T07:18:00Z',
    like_count: 64,
    liked: false,
  },
  {
    id: 'c5',
    author: SAMPLE_AUTHORS[7],
    body: 'Reposting in the morning newsletter — credited!',
    posted_at: '2026-04-29T08:32:00Z',
    like_count: 22,
    liked: false,
  },
]

export const SAMPLE_CONVERSATIONS: SampleConversation[] = [
  {
    id: 'conv_kelvin',
    with: SAMPLE_AUTHORS[1],
    last_message: 'Sending the rough mix in 5. Be brutally honest.',
    last_message_at: '2026-04-29T08:42:00Z',
    last_message_by: 'them',
    unread_count: 2,
    is_typing: true,
    is_online: true,
  },
  {
    id: 'conv_amelie',
    with: SAMPLE_AUTHORS[3],
    last_message: 'You: Save me one of the almond ones 🙏',
    last_message_at: '2026-04-29T07:10:00Z',
    last_message_by: 'me',
    unread_count: 0,
    is_typing: false,
    is_online: true,
  },
  {
    id: 'conv_jade',
    with: SAMPLE_AUTHORS[5],
    last_message: "open studios on Saturday — i'll save you a spot",
    last_message_at: '2026-04-28T19:55:00Z',
    last_message_by: 'them',
    unread_count: 1,
    is_typing: false,
    is_online: false,
  },
  {
    id: 'conv_naomi',
    with: SAMPLE_AUTHORS[7],
    last_message: "okay but the chord change at 1:42 — chef's kiss",
    last_message_at: '2026-04-28T11:00:00Z',
    last_message_by: 'them',
    unread_count: 0,
    is_typing: false,
    is_online: true,
  },
  {
    id: 'conv_dominic',
    with: SAMPLE_AUTHORS[4],
    last_message: 'You: lmao the curb won, sorry curb',
    last_message_at: '2026-04-28T01:00:00Z',
    last_message_by: 'me',
    unread_count: 0,
    is_typing: false,
    is_online: false,
  },
  {
    id: 'conv_priya',
    with: SAMPLE_AUTHORS[9],
    last_message: 'fitting moved to 3pm — bring the navy thread',
    last_message_at: '2026-04-27T22:15:00Z',
    last_message_by: 'them',
    unread_count: 3,
    is_typing: false,
    is_online: false,
  },
  {
    id: 'conv_milo',
    with: SAMPLE_AUTHORS[6],
    last_message: 'sauna 8pm? bring a friend',
    last_message_at: '2026-04-27T18:30:00Z',
    last_message_by: 'them',
    unread_count: 0,
    is_typing: false,
    is_online: false,
  },
]

export const SAMPLE_NOTIFICATIONS: SampleNotification[] = [
  {
    id: 'n1',
    kind: 'like',
    actor: SAMPLE_AUTHORS[1],
    also: [SAMPLE_AUTHORS[3], SAMPLE_AUTHORS[5]],
    post_id: 'post_dawn_river',
    post_cover_index: 0,
    posted_at: '2026-04-29T07:48:00Z',
    unread: true,
  },
  {
    id: 'n2',
    kind: 'comment',
    actor: SAMPLE_AUTHORS[3],
    also: [],
    post_id: 'post_dawn_river',
    post_cover_index: 0,
    excerpt: 'That sky is unreal. What time was the shot?',
    posted_at: '2026-04-29T05:42:00Z',
    unread: true,
  },
  {
    id: 'n3',
    kind: 'follow',
    actor: SAMPLE_AUTHORS[7],
    also: [],
    posted_at: '2026-04-29T05:00:00Z',
    unread: true,
  },
  {
    id: 'n4',
    kind: 'mention',
    actor: SAMPLE_AUTHORS[5],
    also: [],
    post_id: 'post_studio_paint',
    post_cover_index: 5,
    excerpt: '…and shoutout to @ariasato for the cobalt — perfect light.',
    posted_at: '2026-04-28T20:15:00Z',
    unread: false,
  },
  {
    id: 'n5',
    kind: 'live',
    actor: SAMPLE_AUTHORS[1],
    also: [],
    excerpt: 'is live now: Day three: re-cutting the bridge.',
    posted_at: '2026-04-28T15:00:00Z',
    unread: false,
  },
  {
    id: 'n6',
    kind: 'tag',
    actor: SAMPLE_AUTHORS[11],
    also: [],
    post_id: 'post_editorial',
    post_cover_index: 4,
    excerpt: 'tagged you in a cover credit',
    posted_at: '2026-04-28T10:00:00Z',
    unread: false,
  },
  {
    id: 'n7',
    kind: 'like',
    actor: SAMPLE_AUTHORS[8],
    also: [SAMPLE_AUTHORS[9]],
    post_id: 'post_skate_curb',
    post_cover_index: 4,
    posted_at: '2026-04-27T22:30:00Z',
    unread: false,
  },
  {
    id: 'n8',
    kind: 'follow',
    actor: SAMPLE_AUTHORS[10],
    also: [],
    posted_at: '2026-04-26T11:00:00Z',
    unread: false,
  },
]

export const SAMPLE_SUGGESTIONS: SampleSuggestion[] = [
  { author: SAMPLE_AUTHORS[6], reason: 'Followed by Aria + 3 others', mutual_count: 4 },
  { author: SAMPLE_AUTHORS[8], reason: 'New on Vivid · Surf, dawn', mutual_count: 1 },
  { author: SAMPLE_AUTHORS[9], reason: 'Tagged you in a story', mutual_count: 6 },
  { author: SAMPLE_AUTHORS[10], reason: 'You both follow Theo', mutual_count: 2 },
  { author: SAMPLE_AUTHORS[11], reason: 'Editor at La Pagina', mutual_count: 8 },
]

export const SAMPLE_HASHTAGS: SampleHashtag[] = [
  { tag: 'goldenhour', post_count: 184_212, delta_pct: 12 },
  { tag: 'studiojam', post_count: 42_018, delta_pct: 38 },
  { tag: 'lamination', post_count: 9_244, delta_pct: 64 },
  { tag: 'palettewatch', post_count: 71_004, delta_pct: 7 },
  { tag: 'westendcostume', post_count: 1_212, delta_pct: 22 },
  { tag: 'sunrisewatch', post_count: 220_184, delta_pct: 4 },
]

/** Pretty-print a count like "12.4K" or "1.2M". */
export function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Crude but readable relative-time string ("2h", "3d", "1mo"). */
export function fmtRelativeShort(iso: string, now: number = Date.now()): string {
  const ms = now - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d`
  if (d < 30) return `${Math.floor(d / 7)}w`
  if (d < 365) return `${Math.floor(d / 30)}mo`
  return `${Math.floor(d / 365)}y`
}

/**
 * Cinematic gradient palette used for cover/hero placeholders. Mirrors
 * the photo-sharing AlbumCardGrid recipe but recoloured into Vivid's
 * pink → violet → amber identity from DESIGN.md.
 */
export const VIVID_GRADIENTS: string[] = [
  'linear-gradient(135deg, #d63384 0%, #7c3aed 50%, #f59e0b 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #d946ef 50%, #6366f1 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #d63384 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #d63384 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
  'linear-gradient(135deg, #fde68a 0%, #f472b6 50%, #a855f7 100%)',
  'linear-gradient(135deg, #fb923c 0%, #db2777 50%, #5b21b6 100%)',
]

export function vividGradient(idx: number): string {
  return VIVID_GRADIENTS[
    ((idx % VIVID_GRADIENTS.length) + VIVID_GRADIENTS.length) % VIVID_GRADIENTS.length
  ]
}

export const STORY_RING_GRADIENT = 'conic-gradient(from 90deg, #f59e0b, #d63384, #7c3aed, #f59e0b)'
