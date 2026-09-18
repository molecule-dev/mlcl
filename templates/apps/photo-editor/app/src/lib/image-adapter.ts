/**
 * Adapters that translate raw `/api/images` and `/api/albums` rows into
 * the shapes the polished Library / Editor / Profile / AlbumDetail
 * components consume. The DB stores only the truths it needs (id,
 * urls, dimensions, edit history, album membership); the editorial
 * polish (cover gradient, masonry aspect, exif placeholders, friendly
 * caption) is derived deterministically from the row so rendering is
 * stable across reloads.
 */

import type { SampleAlbum, SamplePhoto, SamplePreset } from './sample-photos.js'

export interface ApiPreset {
  id: string
  user_id: string | null
  name: string
  parameters: Record<string, number | string | boolean | null | undefined>
  created_at?: string
}

export interface ApiImage {
  id: string
  user_id: string
  name: string
  original_url: string
  current_url: string
  width: number
  height: number
  album_id?: string | null
  edit_history?: unknown[]
  is_public?: boolean
  created_at?: string
  updatedAt?: string | null
}

export interface ApiAlbum {
  id: string
  user_id: string
  name: string
  cover_image_id?: string | null
  created_at?: string
  updatedAt?: string | null
}

const ASPECT_BUCKETS: Array<SamplePhoto['aspect']> = ['square', 'wide', 'tall']

function hashStringToInt(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function aspectFromDims(width: number, height: number, fallbackId: string): SamplePhoto['aspect'] {
  if (width > 0 && height > 0) {
    const ratio = width / height
    if (ratio >= 1.4) return 'wide'
    if (ratio <= 0.75) return 'tall'
    return 'square'
  }
  return ASPECT_BUCKETS[hashStringToInt(fallbackId) % ASPECT_BUCKETS.length]
}

const COVER_PALETTE_LENGTH = 7

export function imageToSamplePhoto(row: ApiImage): SamplePhoto {
  const id = row.id
  const updatedAt = row.updatedAt ?? row.created_at ?? new Date().toISOString()
  const createdAt = row.created_at ?? updatedAt
  const editedAt = (row.edit_history?.length ?? 0) > 0 ? updatedAt : undefined
  const dims = { width: row.width || 4000, height: row.height || 3000 }
  return {
    id,
    title: row.name,
    caption: '',
    cover_index: hashStringToInt(id) % COVER_PALETTE_LENGTH,
    uploaded_at: createdAt,
    edited_at: editedAt,
    album_id: row.album_id ?? undefined,
    tags: [],
    aspect: aspectFromDims(dims.width, dims.height, id),
    dimensions: dims,
    size_bytes: dims.width * dims.height * 3,
    exif: {
      camera: '',
      lens: '',
      focal_length: '',
      aperture: '',
      shutter_speed: '',
      iso: '',
      location: '',
      taken_at: createdAt.slice(0, 10),
    },
  }
}

/**
 * Map an `/api/albums` row + the user's full image list into the
 * polished SampleAlbum shape (so the album rail can show counts and
 * cover gradients without a second round-trip). Photo IDs are sorted
 * by upload date desc so the visible cover represents the most recent
 * frame in the stack — a sensible expectation for any photo manager.
 */
export function albumToSampleAlbum(row: ApiAlbum, images: ApiImage[]): SampleAlbum {
  const photosInAlbum = images
    .filter((img) => img.album_id === row.id)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return {
    id: row.id,
    title: row.name,
    description: '',
    photo_count: photosInAlbum.length,
    cover_index: hashStringToInt(row.id) % COVER_PALETTE_LENGTH,
    updated_at: row.updatedAt ?? row.created_at ?? new Date().toISOString(),
    photo_ids: photosInAlbum.map((p) => p.id),
  }
}

const PRESET_CATEGORIES: Array<SamplePreset['category']> = [
  'mood',
  'cinema',
  'studio',
  'street',
  'mono',
]

const NAME_CATEGORY_MAP: Record<string, SamplePreset['category']> = {
  'b&w': 'mono',
  mono: 'mono',
  black: 'mono',
  sepia: 'studio',
  warm: 'mood',
  cool: 'mood',
  vivid: 'mood',
  faded: 'mood',
  cinematic: 'cinema',
  film: 'cinema',
  street: 'street',
  studio: 'studio',
}

function inferCategory(name: string, id: string): SamplePreset['category'] {
  const lower = name.toLowerCase()
  for (const [token, cat] of Object.entries(NAME_CATEGORY_MAP)) {
    if (lower.includes(token)) return cat
  }
  return PRESET_CATEGORIES[hashStringToInt(id) % PRESET_CATEGORIES.length]
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

const PRESET_DESCRIPTIONS: Record<string, string> = {
  mood: 'Atmospheric balance — gentle midtones with a softened palette.',
  cinema: 'Anamorphic feel with crushed shadows and warm cast.',
  studio: 'Even daylight finish with a porcelain-clean highlight roll-off.',
  street: 'Cooled blacks and a contrasty mid-tone for night reportage.',
  mono: 'High-contrast black and white with grain in the deep shadows.',
}

/**
 * Map a `/api/filters/presets` row into the polished SamplePreset shape
 * the editor + Presets page consume. Categories and descriptions are
 * derived deterministically from the preset name so the gradient and
 * curve overlay stay stable across reloads.
 */
export function presetToSamplePreset(row: ApiPreset): SamplePreset {
  const category = inferCategory(row.name, row.id)
  const params = row.parameters ?? {}
  const contrast = Math.round(num(params.contrast) * 100)
  const brightness = Math.round(num(params.brightness) * 100)
  const saturation = Math.round(num(params.saturation) * 100)
  const hue = Math.round(num(params.hue ?? params.tint))
  const grain = Math.round(num(params.grain) * 100)
  return {
    id: row.id,
    name: row.name,
    category,
    cover_index: hashStringToInt(row.id) % COVER_PALETTE_LENGTH,
    description: PRESET_DESCRIPTIONS[category],
    adjustments: {
      brightness,
      contrast,
      saturation,
      hue,
      grain,
    },
  }
}
