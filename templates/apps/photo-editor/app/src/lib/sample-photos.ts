/**
 * Curated sample data for Lustra polished pages while a backend isn't wired.
 * Component prop interfaces match the photos/albums/presets shapes implied
 * by `api/handlers/*.ts` + DESIGN.md + screen-map.json.
 *
 * TODO: replace these arrays with `useHttpClient()` calls to /api/photos,
 * /api/albums, /api/presets once those endpoints stabilise.
 */

export interface SamplePhoto {
  id: string
  title: string
  caption: string
  cover_index: number
  uploaded_at: string
  edited_at?: string
  album_id?: string
  tags: string[]
  /** Aspect bucket — drives masonry layout sizes. */
  aspect: 'tall' | 'wide' | 'square'
  /** Pixel dimensions for status bar / export readouts. */
  dimensions: { width: number; height: number }
  /** Storage size in bytes (display formatted). */
  size_bytes: number
  exif: {
    camera: string
    lens: string
    focal_length: string
    aperture: string
    shutter_speed: string
    iso: string
    location: string
    taken_at: string
  }
}

export interface SampleAlbum {
  id: string
  title: string
  description: string
  photo_count: number
  cover_index: number
  updated_at: string
  /** Photos that belong to this album (ids). */
  photo_ids: string[]
}

export interface SamplePreset {
  id: string
  name: string
  category: 'mood' | 'cinema' | 'studio' | 'street' | 'mono'
  cover_index: number
  /** A short shorthand describing the look. */
  description: string
  /** Approximate adjustment values (used by Editor preview). */
  adjustments: {
    brightness: number
    contrast: number
    saturation: number
    hue: number
    grain: number
  }
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: 'p_blue_hour',
    title: 'Blue Hour Over Reykjavík',
    caption: 'Last light off the basalt rooftops, fifteen minutes after sunset.',
    cover_index: 1,
    uploaded_at: '2026-04-22T18:30:00Z',
    edited_at: '2026-04-23T09:11:00Z',
    album_id: 'a_nordic_winter',
    tags: ['cityscape', 'twilight', 'iceland'],
    aspect: 'wide',
    dimensions: { width: 6048, height: 4024 },
    size_bytes: 12_400_000,
    exif: {
      camera: 'Sony α7R V',
      lens: 'FE 24-70mm f/2.8 GM II',
      focal_length: '35mm',
      aperture: 'ƒ/4.0',
      shutter_speed: '1/60s',
      iso: 'ISO 200',
      location: 'Reykjavík, Iceland',
      taken_at: '2026-02-14',
    },
  },
  {
    id: 'p_atelier',
    title: "The Sculptor's Atelier",
    caption: 'Fourth-floor studio in the Marais. North light hits the marble at 3pm.',
    cover_index: 3,
    uploaded_at: '2026-04-19T10:15:00Z',
    edited_at: '2026-04-21T15:42:00Z',
    tags: ['portrait', 'documentary', 'paris'],
    aspect: 'tall',
    dimensions: { width: 6000, height: 4000 },
    size_bytes: 9_800_000,
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      focal_length: '28mm',
      aperture: 'ƒ/2.8',
      shutter_speed: '1/250s',
      iso: 'ISO 400',
      location: 'Paris, France',
      taken_at: '2026-03-02',
    },
  },
  {
    id: 'p_kelp_forest',
    title: 'Kelp Cathedral',
    caption:
      'Eighteen meters down off Anacapa Island. Sunbeams refracting through giant bladder kelp.',
    cover_index: 2,
    uploaded_at: '2026-04-17T22:00:00Z',
    album_id: 'a_pacific_drift',
    tags: ['underwater', 'wildlife', 'pacific'],
    aspect: 'tall',
    dimensions: { width: 5472, height: 3648 },
    size_bytes: 8_640_000,
    exif: {
      camera: 'Nikon Z9',
      lens: 'NIKKOR Z 14-24mm f/2.8 S',
      focal_length: '14mm',
      aperture: 'ƒ/8.0',
      shutter_speed: '1/200s',
      iso: 'ISO 800',
      location: 'Anacapa Island, CA',
      taken_at: '2026-01-19',
    },
  },
  {
    id: 'p_neon_alley',
    title: 'Shibuya Rain at 02:14',
    caption:
      'Wet asphalt and a thousand competing kanji. The rare intersection where every sign reflects.',
    cover_index: 0,
    uploaded_at: '2026-04-14T03:40:00Z',
    edited_at: '2026-04-14T08:00:00Z',
    album_id: 'a_neon_atlas',
    tags: ['street', 'neon', 'tokyo'],
    aspect: 'square',
    dimensions: { width: 4000, height: 4000 },
    size_bytes: 7_200_000,
    exif: {
      camera: 'Fujifilm X-T5',
      lens: 'XF 23mm f/1.4 R LM WR',
      focal_length: '35mm eq.',
      aperture: 'ƒ/1.6',
      shutter_speed: '1/60s',
      iso: 'ISO 1600',
      location: 'Shibuya, Tokyo',
      taken_at: '2026-02-25',
    },
  },
  {
    id: 'p_alpine_serac',
    title: 'Sérac Light',
    caption:
      'A door of sapphire ice on the Mer de Glace. Eight seconds of stillness before the calving.',
    cover_index: 5,
    uploaded_at: '2026-04-12T11:05:00Z',
    album_id: 'a_alpine_studies',
    tags: ['landscape', 'alpine', 'cool'],
    aspect: 'wide',
    dimensions: { width: 7008, height: 4672 },
    size_bytes: 14_900_000,
    exif: {
      camera: 'Canon EOS R5',
      lens: 'RF 70-200mm f/2.8 L IS',
      focal_length: '135mm',
      aperture: 'ƒ/8.0',
      shutter_speed: '1/500s',
      iso: 'ISO 100',
      location: 'Chamonix, France',
      taken_at: '2026-01-11',
    },
  },
  {
    id: 'p_studio_still',
    title: 'Vermilion Still Life',
    caption: 'Two-light studio setup, key 45° camera-left. Peony season is short.',
    cover_index: 4,
    uploaded_at: '2026-04-10T16:20:00Z',
    edited_at: '2026-04-11T10:00:00Z',
    tags: ['studio', 'still-life', 'warm'],
    aspect: 'square',
    dimensions: { width: 5472, height: 5472 },
    size_bytes: 11_300_000,
    exif: {
      camera: 'Hasselblad X2D 100C',
      lens: 'XCD 90mm f/2.5 V',
      focal_length: '90mm',
      aperture: 'ƒ/5.6',
      shutter_speed: '1/160s',
      iso: 'ISO 64',
      location: 'Studio Cinque, Milan',
      taken_at: '2026-03-21',
    },
  },
  {
    id: 'p_dune_dawn',
    title: 'Dune Field at 06:11',
    caption: 'First light from a 100-meter ridgeline above the Erg Chebbi.',
    cover_index: 6,
    uploaded_at: '2026-04-08T08:11:00Z',
    album_id: 'a_alpine_studies',
    tags: ['landscape', 'desert', 'warm'],
    aspect: 'wide',
    dimensions: { width: 6720, height: 4480 },
    size_bytes: 13_100_000,
    exif: {
      camera: 'Sony α7R V',
      lens: 'FE 70-200mm f/4 G OSS II',
      focal_length: '120mm',
      aperture: 'ƒ/11',
      shutter_speed: '1/250s',
      iso: 'ISO 100',
      location: 'Erg Chebbi, Morocco',
      taken_at: '2026-02-02',
    },
  },
  {
    id: 'p_stage_dancer',
    title: 'Coda',
    caption: 'Stage 6 at the Bolshoi. A 1/1000s pulse of stillness before the leap.',
    cover_index: 0,
    uploaded_at: '2026-04-05T22:48:00Z',
    edited_at: '2026-04-06T11:11:00Z',
    tags: ['portrait', 'stage', 'low-light'],
    aspect: 'tall',
    dimensions: { width: 4480, height: 6720 },
    size_bytes: 10_400_000,
    exif: {
      camera: 'Sony α1',
      lens: 'FE 85mm f/1.4 GM',
      focal_length: '85mm',
      aperture: 'ƒ/1.6',
      shutter_speed: '1/1000s',
      iso: 'ISO 3200',
      location: 'Moscow, Russia',
      taken_at: '2026-03-15',
    },
  },
  {
    id: 'p_window_cat',
    title: 'Marbled Patience',
    caption: 'A short stake-out by the kitchen window. Seven minutes for one frame.',
    cover_index: 2,
    uploaded_at: '2026-04-03T13:22:00Z',
    tags: ['portrait', 'animal', 'natural-light'],
    aspect: 'square',
    dimensions: { width: 4000, height: 4000 },
    size_bytes: 6_500_000,
    exif: {
      camera: 'Fujifilm X100V',
      lens: 'Fixed 23mm f/2',
      focal_length: '35mm eq.',
      aperture: 'ƒ/2.8',
      shutter_speed: '1/250s',
      iso: 'ISO 400',
      location: 'Lisbon, Portugal',
      taken_at: '2026-03-30',
    },
  },
]

export const SAMPLE_ALBUMS: SampleAlbum[] = [
  {
    id: 'a_nordic_winter',
    title: 'Nordic Winter',
    description: 'A six-week residency tracing fjords and basalt towns in low-angle light.',
    photo_count: 24,
    cover_index: 1,
    updated_at: '2026-04-23T09:11:00Z',
    photo_ids: ['p_blue_hour'],
  },
  {
    id: 'a_pacific_drift',
    title: 'Pacific Drift',
    description: 'Underwater explorations between Anacapa and Catalina, 12-22m depth.',
    photo_count: 18,
    cover_index: 2,
    updated_at: '2026-04-17T22:00:00Z',
    photo_ids: ['p_kelp_forest'],
  },
  {
    id: 'a_neon_atlas',
    title: 'Neon Atlas',
    description: 'A growing typology of city signage after midnight in Tokyo, Seoul, Hong Kong.',
    photo_count: 31,
    cover_index: 0,
    updated_at: '2026-04-14T08:00:00Z',
    photo_ids: ['p_neon_alley'],
  },
  {
    id: 'a_alpine_studies',
    title: 'Alpine Studies',
    description: 'Long-lens fragments from Chamonix and Erg Chebbi — texture, light, scale.',
    photo_count: 27,
    cover_index: 5,
    updated_at: '2026-04-12T11:05:00Z',
    photo_ids: ['p_alpine_serac', 'p_dune_dawn'],
  },
]

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'pr_velvet',
    name: 'Velvet Dusk',
    category: 'mood',
    cover_index: 0,
    description: 'Cool shadow lift, magenta highlights, mid-grain.',
    adjustments: { brightness: 4, contrast: 18, saturation: -8, hue: -6, grain: 12 },
  },
  {
    id: 'pr_kodachrome',
    name: 'Kodachrome 64',
    category: 'cinema',
    cover_index: 4,
    description: 'Saturated reds and inky shadows — early-2000s editorial.',
    adjustments: { brightness: -2, contrast: 24, saturation: 14, hue: 2, grain: 8 },
  },
  {
    id: 'pr_porto',
    name: 'Porto Linen',
    category: 'studio',
    cover_index: 6,
    description: 'Bright, low-contrast, warm whites — clothing catalog.',
    adjustments: { brightness: 12, contrast: -10, saturation: -6, hue: 4, grain: 0 },
  },
  {
    id: 'pr_neon_rain',
    name: 'Neon Rain',
    category: 'street',
    cover_index: 0,
    description: 'Crushed blacks, electric cyan highlights, heavy grain.',
    adjustments: { brightness: -8, contrast: 36, saturation: 22, hue: -10, grain: 28 },
  },
  {
    id: 'pr_silver_q',
    name: 'Silver Quartz',
    category: 'mono',
    cover_index: 3,
    description: 'Architectural mono — cool mid-greys, hard whites.',
    adjustments: { brightness: 2, contrast: 22, saturation: -100, hue: 0, grain: 6 },
  },
  {
    id: 'pr_terracotta',
    name: 'Terracotta',
    category: 'mood',
    cover_index: 6,
    description: 'Warm midtones, dusty oranges, faint blue lift.',
    adjustments: { brightness: 6, contrast: 14, saturation: 6, hue: 8, grain: 14 },
  },
  {
    id: 'pr_archive',
    name: 'Archive 1979',
    category: 'cinema',
    cover_index: 5,
    description: 'Faded red, green-shifted shadows, soft halation.',
    adjustments: { brightness: -4, contrast: 8, saturation: -14, hue: -4, grain: 22 },
  },
  {
    id: 'pr_studio_pop',
    name: 'Studio Pop',
    category: 'studio',
    cover_index: 4,
    description: 'Crisp pastels for product photography on white seamless.',
    adjustments: { brightness: 8, contrast: 20, saturation: 18, hue: 0, grain: 0 },
  },
]
