/**
 * Inline sample data used to render polished demos when the backend does
 * not yet provide fixtures. Each list page first queries `/api/...` and
 * only falls back to these constants when the response is empty — so
 * once real fixtures land, the polished UI lights up automatically.
 *
 * Shapes are aligned with the migrations in `api/migrations/` and the
 * `@molecule/api-resource-bookmark` / `@molecule/api-resource-tag`
 * resource schemas (id + author + title + body + created_at, plus our
 * Vantage-specific fields: source_count, average_bias, topic_slug).
 */

export interface Story {
  id: string
  headline: string
  excerpt?: string
  body?: string
  topic: string
  topic_slug: string
  source_count: number
  average_bias: number
  published_at: string
  image_url?: string | null
  saved?: boolean
}

export interface Topic {
  slug: string
  label: string
  icon: string
  tint: 'tech' | 'business' | 'science' | 'sports' | 'entertainment' | 'world' | 'culture'
  story_count: number
  /** Average bias across all stories in the topic. */
  average_bias?: number
  /** Color accent used when the topic is highlighted on its detail page. */
  accent_color?: string
}

export interface Source {
  slug: string
  name: string
  description?: string
  icon_url?: string | null
  factual_rating: number
  bias_value: number
  story_count: number
  following: boolean
  ownership?: string
  accent_color?: string
}

export interface SourceCoverage {
  source_slug: string
  source_name: string
  bias_value: number
  factual_rating: number
  headline: string
  excerpt: string
  url: string
  published_at: string
}

export const SAMPLE_TOPICS: ReadonlyArray<Topic> = [
  {
    slug: 'world',
    label: 'World',
    icon: 'public',
    tint: 'world',
    story_count: 24,
    average_bias: -0.05,
    accent_color: '#0a7e8c',
  },
  {
    slug: 'business',
    label: 'Business',
    icon: 'trending_up',
    tint: 'business',
    story_count: 18,
    average_bias: 0.18,
    accent_color: '#059669',
  },
  {
    slug: 'tech',
    label: 'Tech',
    icon: 'memory',
    tint: 'tech',
    story_count: 31,
    average_bias: -0.1,
    accent_color: '#3b82f6',
  },
  {
    slug: 'science',
    label: 'Science',
    icon: 'science',
    tint: 'science',
    story_count: 9,
    average_bias: -0.08,
    accent_color: '#8b5cf6',
  },
  {
    slug: 'sports',
    label: 'Sports',
    icon: 'sports_basketball',
    tint: 'sports',
    story_count: 14,
    average_bias: 0.02,
    accent_color: '#f59e0b',
  },
  {
    slug: 'culture',
    label: 'Culture',
    icon: 'theater_comedy',
    tint: 'culture',
    story_count: 11,
    average_bias: -0.22,
    accent_color: '#e07428',
  },
  {
    slug: 'entertainment',
    label: 'Entertainment',
    icon: 'movie',
    tint: 'entertainment',
    story_count: 16,
    average_bias: -0.12,
    accent_color: '#ec4899',
  },
]

export const SAMPLE_STORIES: ReadonlyArray<Story> = [
  {
    id: 'climate-summit-deal',
    headline: 'Climate summit lands a deal — five outlets, five framings.',
    excerpt:
      'Reuters calls it a breakthrough. Fox calls it a giveaway. The Guardian calls it overdue. Vantage stacks them for you.',
    topic: 'World',
    topic_slug: 'world',
    source_count: 7,
    average_bias: -0.2,
    published_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    image_url: null,
  },
  {
    id: 'fed-rate-cut',
    headline: 'Fed signals a quarter-point cut as inflation cools.',
    excerpt:
      'Markets rallied on the dovish statement. Centrist outlets focused on the data; left-leaning coverage flagged housing risk; right-leaning highlighted growth optimism.',
    topic: 'Business',
    topic_slug: 'business',
    source_count: 9,
    average_bias: 0.15,
    published_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
    image_url: null,
  },
  {
    id: 'open-source-ai-bill',
    headline: 'Open-source AI bill clears committee with bipartisan support.',
    excerpt:
      'The bill exempts academic projects from licensing. TechCrunch frames it as a win; Fox emphasizes deregulation; The Verge questions enforceability.',
    topic: 'Tech',
    topic_slug: 'tech',
    source_count: 11,
    average_bias: -0.1,
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    image_url: null,
  },
  {
    id: 'webb-supernova',
    headline: 'James Webb spots oldest supernova on record, 12 billion light-years out.',
    excerpt:
      'Confirmed by spectroscopy this week. Science outlets emphasize the cosmology implication; mainstream outlets focused on the visual.',
    topic: 'Science',
    topic_slug: 'science',
    source_count: 5,
    average_bias: -0.05,
    published_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    image_url: null,
  },
  {
    id: 'world-cup-final',
    headline: 'World Cup final delivers extra-time drama in front of 78,000.',
    excerpt:
      'Penalties. Late-game tactics. The framing across outlets is mostly cosmetic — bias minimal — but coverage angles vary by region.',
    topic: 'Sports',
    topic_slug: 'sports',
    source_count: 14,
    average_bias: 0.02,
    published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    image_url: null,
    saved: true,
  },
  {
    id: 'museum-restitution',
    headline: 'Museum agrees to return contested bronzes after ten-year campaign.',
    excerpt:
      'Cultural restitution stories diverge sharply by outlet. Left-leaning coverage celebrates; conservative outlets question precedent; international press leans neutral.',
    topic: 'Culture',
    topic_slug: 'culture',
    source_count: 6,
    average_bias: -0.3,
    published_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    image_url: null,
  },
  {
    id: 'biotech-merger',
    headline: 'Biotech merger creates third-largest player in oncology research.',
    excerpt:
      'Wall Street outlets flag valuation; FT focuses on pipeline; trade press questions antitrust risk.',
    topic: 'Business',
    topic_slug: 'business',
    source_count: 8,
    average_bias: 0.22,
    published_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    image_url: null,
  },
  {
    id: 'chip-export-rules',
    headline: 'New chip-export rules tighten Pacific tech corridor.',
    excerpt:
      'Bloomberg framed as policy update; right-leaning outlets emphasize national security; left-leaning press interrogates economic fallout.',
    topic: 'Tech',
    topic_slug: 'tech',
    source_count: 13,
    average_bias: -0.08,
    published_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    image_url: null,
  },
]

export const SAMPLE_SOURCES: ReadonlyArray<Source> = [
  {
    slug: 'reuters',
    name: 'Reuters',
    description: 'Global wire service. Centrist, fact-led.',
    factual_rating: 96,
    bias_value: -0.05,
    story_count: 412,
    following: true,
    ownership: 'Thomson Reuters',
    accent_color: '#FA6400',
  },
  {
    slug: 'ap',
    name: 'Associated Press',
    description: 'Long-running cooperative wire service.',
    factual_rating: 95,
    bias_value: -0.02,
    story_count: 388,
    following: true,
    ownership: 'AP Cooperative',
    accent_color: '#0a4d8c',
  },
  {
    slug: 'bbc',
    name: 'BBC News',
    description: 'British public service broadcaster.',
    factual_rating: 92,
    bias_value: -0.15,
    story_count: 298,
    following: true,
    ownership: 'British Broadcasting Corporation',
    accent_color: '#bb1919',
  },
  {
    slug: 'wsj',
    name: 'Wall Street Journal',
    description: 'Business-led national daily.',
    factual_rating: 88,
    bias_value: 0.35,
    story_count: 240,
    following: false,
    ownership: 'News Corp',
    accent_color: '#000000',
  },
  {
    slug: 'guardian',
    name: 'The Guardian',
    description: 'British daily, left-leaning op-ed.',
    factual_rating: 87,
    bias_value: -0.45,
    story_count: 215,
    following: false,
    ownership: 'Scott Trust Limited',
    accent_color: '#052962',
  },
  {
    slug: 'fox',
    name: 'Fox News',
    description: 'US cable news network.',
    factual_rating: 78,
    bias_value: 0.65,
    story_count: 198,
    following: false,
    ownership: 'Fox Corporation',
    accent_color: '#003366',
  },
  {
    slug: 'nyt',
    name: 'The New York Times',
    description: 'US national daily, broad coverage.',
    factual_rating: 90,
    bias_value: -0.25,
    story_count: 322,
    following: true,
    ownership: 'The New York Times Company',
    accent_color: '#000000',
  },
  {
    slug: 'tc',
    name: 'TechCrunch',
    description: 'Tech industry trade publication.',
    factual_rating: 82,
    bias_value: -0.08,
    story_count: 142,
    following: false,
    ownership: 'Yahoo Inc.',
    accent_color: '#0a9c47',
  },
]

export const SAMPLE_COVERAGE: ReadonlyArray<SourceCoverage> = [
  {
    source_slug: 'reuters',
    source_name: 'Reuters',
    bias_value: -0.05,
    factual_rating: 96,
    headline: 'Climate deal reached as negotiators clear last-minute objections.',
    excerpt:
      'Officials describe the framework as the most concrete commitment to phase down fossil-fuel subsidies in a decade.',
    url: '#',
    published_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    source_slug: 'guardian',
    source_name: 'The Guardian',
    bias_value: -0.45,
    factual_rating: 87,
    headline: 'A long-overdue deal — and why activists say it still falls short.',
    excerpt:
      'Campaigners welcomed the deal in principle but pointed to vague compliance terms and a notable absence of binding penalties.',
    url: '#',
    published_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    source_slug: 'fox',
    source_name: 'Fox News',
    bias_value: 0.65,
    factual_rating: 78,
    headline: "Climate deal expands the government's reach over US energy markets.",
    excerpt:
      'Critics warn that the framework imposes new compliance costs on domestic producers without securing similar commitments abroad.',
    url: '#',
    published_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    source_slug: 'wsj',
    source_name: 'Wall Street Journal',
    bias_value: 0.35,
    factual_rating: 88,
    headline: 'Investors weigh the climate deal as energy stocks slide.',
    excerpt:
      'Analysts split on whether the new compliance regime accelerates the clean-energy capex cycle or prolongs uncertainty.',
    url: '#',
    published_at: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
  },
  {
    source_slug: 'bbc',
    source_name: 'BBC News',
    bias_value: -0.15,
    factual_rating: 92,
    headline: 'Climate summit ends with a deal — what it means for the world.',
    excerpt:
      'Explained: which commitments are new, which were already in motion, and which countries pushed back hardest.',
    url: '#',
    published_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
]
