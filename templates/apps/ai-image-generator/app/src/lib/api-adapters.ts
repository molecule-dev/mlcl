/**
 * Adapters that convert raw API rows (snake_case, ISO timestamps) into
 * the typed shapes that the UI components expect (camelCase, friendly
 * relative-time strings, gradient class names derived from name hashes,
 * etc.). Keeping the adaptation in one place means pages can stay
 * declarative and the API stays free of presentational metadata.
 */
import type {
  ActivityEvent,
  CollectionSummary,
  CreatorProfile,
  Generation,
  ImageModel,
  PromptTemplate,
  StylePreset,
} from '../_design-data/generations.js'
import type { GenerationStatus } from '../components/GenerationStatusPill.js'

const COLLECTION_GRADIENTS = [
  'bg-gradient-to-br from-emerald-400 to-violet-600',
  'bg-gradient-to-br from-amber-400 to-rose-500',
  'bg-gradient-to-br from-sky-400 to-indigo-600',
  'bg-gradient-to-br from-pink-500 to-fuchsia-700',
  'bg-gradient-to-br from-teal-400 to-cyan-600',
  'bg-gradient-to-br from-purple-500 to-blue-600',
]

const COLLECTION_GLYPHS = ['flare', 'face_5', 'inventory_2', 'theaters', 'photo_album', 'palette']

const STYLE_GRADIENTS: Record<string, string> = {
  photoreal: 'bg-gradient-to-br from-slate-700 to-slate-900',
  anime: 'bg-gradient-to-br from-pink-400 to-violet-500',
  watercolor: 'bg-gradient-to-br from-sky-300 to-purple-300',
  cyberpunk: 'bg-gradient-to-br from-fuchsia-500 to-cyan-400',
  'oil-painting': 'bg-gradient-to-br from-amber-500 to-rose-500',
  'oil painting': 'bg-gradient-to-br from-amber-500 to-rose-500',
  isometric: 'bg-gradient-to-br from-emerald-400 to-teal-500',
  'concept-art': 'bg-gradient-to-br from-indigo-500 to-violet-700',
  'concept art': 'bg-gradient-to-br from-indigo-500 to-violet-700',
  product: 'bg-gradient-to-br from-zinc-300 to-zinc-500',
}

const STYLE_ICONS: Record<string, string> = {
  photoreal: 'photo_camera',
  anime: 'brush',
  watercolor: 'water_drop',
  cyberpunk: 'bolt',
  'oil-painting': 'palette',
  'oil painting': 'palette',
  isometric: 'grid_view',
  'concept-art': 'castle',
  'concept art': 'castle',
  product: 'inventory_2',
}

function hashIndex(input: string, mod: number): number {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h) % mod
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diff = Math.floor((Date.now() - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3_600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86_400) return `${Math.floor(diff / 3_600)} hours ago`
  if (diff < 86_400 * 7) return `${Math.floor(diff / 86_400)} days ago`
  return new Date(iso).toLocaleDateString()
}

function dayKey(iso: string | null | undefined): string {
  if (!iso) return 'today'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'today'
  const diff = Math.floor((Date.now() - then) / 1000)
  if (diff < 86_400) return 'today'
  if (diff < 86_400 * 2) return 'yesterday'
  return 'earlier'
}

function aspectFromSize(size: string | null | undefined): Generation['aspectRatio'] {
  if (!size) return '16:9'
  const [w, h] = size.split('x').map((n) => Number(n))
  if (!w || !h) return '16:9'
  const ratio = w / h
  if (Math.abs(ratio - 1) < 0.05) return '1:1'
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9'
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16'
  if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3'
  if (Math.abs(ratio - 3 / 4) < 0.1) return '3:4'
  if (Math.abs(ratio - 21 / 9) < 0.1) return '21:9'
  return '16:9'
}

function normalizeStatus(raw: string | null | undefined): GenerationStatus {
  switch (raw) {
    case 'succeeded':
    case 'complete':
      return 'complete'
    case 'queued':
      return 'queued'
    case 'generating':
      return 'generating'
    case 'upscaled':
      return 'upscaled'
    case 'failed':
      return 'failed'
    default:
      return 'complete'
  }
}

export function adaptGeneration(row: Record<string, unknown>): Generation {
  return {
    id: String(row.id ?? ''),
    prompt: String(row.prompt ?? ''),
    status: normalizeStatus(typeof row.status === 'string' ? row.status : null),
    model: String(row.model ?? 'reverie-xl-v3'),
    seed: typeof row.seed === 'number' ? row.seed : Number(row.seed) || 0,
    aspectRatio: aspectFromSize(typeof row.size === 'string' ? row.size : null),
    createdAt: relativeTime(typeof row.created_at === 'string' ? row.created_at : null),
    thumbnailUrl:
      typeof row.image_url === 'string' && row.image_url.length > 0 ? row.image_url : undefined,
  }
}

export function adaptCollection(row: Record<string, unknown>, imageCount = 0): CollectionSummary {
  const id = String(row.id ?? '')
  return {
    id,
    name: String(row.name ?? 'Untitled'),
    description: String(row.description ?? ''),
    imageCount,
    coverGradient: COLLECTION_GRADIENTS[hashIndex(id, COLLECTION_GRADIENTS.length)],
    glyph: COLLECTION_GLYPHS[hashIndex(id, COLLECTION_GLYPHS.length)],
    updatedAt: `Updated ${relativeTime(
      typeof row.updated_at === 'string'
        ? row.updated_at
        : typeof row.created_at === 'string'
          ? row.created_at
          : null,
    )}`,
  }
}

export function adaptPrompt(row: Record<string, unknown>): PromptTemplate {
  let tags: string[] = []
  if (Array.isArray(row.tags)) tags = row.tags.map((t) => String(t))
  return {
    id: String(row.id ?? ''),
    prompt: String(row.prompt_text ?? row.prompt ?? ''),
    negative: typeof row.negative_prompt === 'string' ? row.negative_prompt : undefined,
    tags,
    lastUsed:
      relativeTime(typeof row.last_used_at === 'string' ? row.last_used_at : null) || 'never',
  }
}

export function adaptModel(row: Record<string, unknown>): ImageModel {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    vendor: String(row.vendor ?? ''),
    description: String(row.description ?? ''),
    capabilities: Array.isArray(row.capabilities) ? row.capabilities.map((c) => String(c)) : [],
    active: row.active === true,
  }
}

export function adaptStyle(row: Record<string, unknown>): StylePreset {
  const name = String(row.name ?? '')
  const id = String(row.id ?? name).toLowerCase()
  const slug = name.toLowerCase()
  return {
    id,
    label: name,
    description: String(row.description ?? row.prompt_modifier ?? ''),
    gradient:
      STYLE_GRADIENTS[slug] ?? STYLE_GRADIENTS[id] ?? 'bg-gradient-to-br from-primary to-secondary',
    icon: STYLE_ICONS[slug] ?? STYLE_ICONS[id] ?? 'auto_awesome',
    tags:
      typeof row.prompt_modifier === 'string'
        ? row.prompt_modifier
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [],
  }
}

export function adaptActivity(row: Record<string, unknown>): ActivityEvent {
  const kind = String(row.kind ?? row.type ?? 'completed')
  const allowed: ActivityEvent['type'][] = ['completed', 'failed', 'upscaled', 'queued', 'shared']
  const type = (allowed as string[]).includes(kind) ? (kind as ActivityEvent['type']) : 'completed'
  const created = typeof row.created_at === 'string' ? row.created_at : null
  return {
    id: String(row.id ?? ''),
    type,
    prompt: String(row.body ?? row.prompt ?? row.title ?? ''),
    when: relativeTime(created),
    groupKey: dayKey(created),
  }
}

export function adaptProfile(row: Record<string, unknown> | null): CreatorProfile | null {
  if (!row) return null
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    name: String(row.name ?? 'Creator'),
    handle: String(row.handle ?? row.username ?? 'creator'),
    bio: String(row.bio ?? ''),
    followers: Number(row.followers ?? 0),
    following: Number(row.following ?? 0),
    creations: Number(row.creations ?? 0),
    bannerGradient: 'bg-gradient-to-br from-primary via-fuchsia-500 to-secondary',
  }
}
