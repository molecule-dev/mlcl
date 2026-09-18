/**
 * Thin fetch wrapper for the photo-sharing API.
 *
 * Same-origin (`/api/...`) so the Vite dev proxy forwards to the API
 * server, and so non-localhost clients (LAN, Tailscale, phone) work
 * without baking in a localhost URL. Sends cookies (httpOnly JWT) on
 * every request — the auth bond on the API side reads them.
 *
 * @module
 */

import { API_BASE_URL } from '../config.js'

export interface PhotoOwner {
  id: string
  name?: string | null
  username?: string | null
}

/**
 * Public-safe slice of the photo owner's `oauthData.photoPrefs` record.
 * Only the fields that affect what other users *see* on a public photo
 * page are exposed (download permission, EXIF + GPS visibility,
 * watermarking flag). Everything else stays private to the owner.
 */
export interface PhotoOwnerPrefs {
  showExif?: boolean
  showLocation?: boolean
  allowDownload?: boolean
  watermarkLarge?: boolean
}

export interface Photo {
  id: string
  owner_id: string
  album_id: string | null
  title: string | null
  description: string | null
  caption: string | null
  original_url: string
  large_url: string
  thumbnail_url: string
  width: number | null
  height: number | null
  exif_data: Record<string, unknown> | null
  tags: string[]
  visibility: 'public' | 'unlisted' | 'private'
  view_count: number
  favorite_count: number
  comment_count: number
  uploaded_at: string
  owner?: PhotoOwner
  owner_prefs?: PhotoOwnerPrefs | null
  favorited?: boolean
}

export interface Album {
  id: string
  owner_id: string
  title: string
  description: string | null
  cover_photo_id: string | null
  photo_count: number
  visibility: 'public' | 'unlisted' | 'private'
  created_at: string
  updated_at: string
  photos?: Photo[]
}

export interface UploadResult {
  id: string
  filename: string
  url: string
  storageKey: string
  locationUrl: string | null
  mimeType: string
  size: number
  width: number | null
  height: number | null
  format: string | null
}

export interface BillingTier {
  planKey: string
  category: string
  name: string
  description?: string
  prices: { stripePriceId: string | null; amount?: number; interval?: string }[]
  limits: Record<string, unknown>
}

export interface BillingStatus {
  planKey: string
  category: string
  name: string
  limits: Record<string, unknown>
  isFree: boolean
}

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function parseJsonOrText(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    try {
      return await res.json()
    } catch (_error) {
      // JSON parse failed — body is malformed; treat as no data
      return null
    }
  }
  const text = await res.text().catch(() => '')
  return text || null
}

async function send<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestInit,
): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && !(body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(opts?.headers ?? {}),
    },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  }
  const url = path.startsWith('http')
    ? path
    : `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, init)
  const payload = await parseJsonOrText(res)
  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).error)
        : `Request failed (${res.status})`
    throw new ApiError(message, res.status, payload)
  }
  return payload as T
}

export const apiGet = <T = unknown>(path: string): Promise<T> => send<T>('GET', path)
export const apiPost = <T = unknown>(path: string, body?: unknown): Promise<T> =>
  send<T>('POST', path, body)
export const apiPut = <T = unknown>(path: string, body?: unknown): Promise<T> =>
  send<T>('PUT', path, body)
export const apiPatch = <T = unknown>(path: string, body?: unknown): Promise<T> =>
  send<T>('PATCH', path, body)
export const apiDelete = <T = unknown>(path: string): Promise<T> => send<T>('DELETE', path)

export async function uploadPhoto(file: File): Promise<UploadResult> {
  const fd = new FormData()
  fd.append('photo', file, file.name)
  return send<UploadResult>('POST', '/photo-uploads', fd)
}

export async function listPhotos(
  opts: { tag?: string; owner?: string; limit?: number } = {},
): Promise<Photo[]> {
  const qs = new URLSearchParams()
  if (opts.tag) qs.set('tag', opts.tag)
  if (opts.owner) qs.set('owner', opts.owner)
  if (opts.limit) qs.set('limit', String(opts.limit))
  const q = qs.toString() ? `?${qs.toString()}` : ''
  return apiGet<Photo[]>(`/photos${q}`)
}

export async function getPhoto(id: string): Promise<Photo> {
  return apiGet<Photo>(`/photos/${id}`)
}

export async function createPhoto(
  input: Partial<Photo> & { original_url: string },
): Promise<Photo> {
  return apiPost<Photo>(`/photos`, input)
}

export async function updatePhoto(id: string, input: Partial<Photo>): Promise<Photo> {
  return apiPut<Photo>(`/photos/${id}`, input)
}

export async function deletePhoto(id: string): Promise<void> {
  await apiDelete<void>(`/photos/${id}`)
}

export async function favoritePhoto(
  id: string,
): Promise<{ favorited: boolean; favorite_count: number }> {
  return apiPost<{ favorited: boolean; favorite_count: number }>(`/photos/${id}/favorite`)
}

export async function listFavorites(): Promise<Photo[]> {
  return apiGet<Photo[]>(`/photos/favorites`)
}

export async function listAlbums(opts: { owner?: string } = {}): Promise<Album[]> {
  const qs = new URLSearchParams()
  if (opts.owner) qs.set('owner', opts.owner)
  const q = qs.toString() ? `?${qs.toString()}` : ''
  return apiGet<Album[]>(`/albums${q}`)
}

export async function getAlbum(id: string): Promise<Album> {
  return apiGet<Album>(`/albums/${id}`)
}

export async function createAlbum(input: {
  title: string
  description?: string
  visibility?: Album['visibility']
}): Promise<Album> {
  return apiPost<Album>(`/albums`, input)
}

export async function updateAlbum(id: string, input: Partial<Album>): Promise<Album> {
  return apiPut<Album>(`/albums/${id}`, input)
}

export async function deleteAlbum(id: string): Promise<void> {
  await apiDelete<void>(`/albums/${id}`)
}

export async function getBillingStatus(): Promise<BillingStatus> {
  return apiGet<BillingStatus>(`/billing/status`)
}

export async function getBillingTiers(): Promise<{ data: BillingTier[] }> {
  return apiGet<{ data: BillingTier[] }>(`/billing/tiers`)
}

export async function startCheckout(
  priceId: string,
): Promise<{ checkoutUrl?: string; updated?: boolean }> {
  return apiPost<{ checkoutUrl?: string; updated?: boolean }>(`/billing/checkout`, { priceId })
}

export async function cancelSubscription(): Promise<{ canceled: boolean }> {
  return apiPost<{ canceled: boolean }>(`/billing/cancel`)
}

export interface GalleryPhotoStub {
  id: string
  thumbnail_url: string
  large_url: string
  width: number | null
  height: number | null
}

export interface Gallery {
  id: string
  title: string
  description: string | null
  curator: string
  curator_username: string | null
  curator_id: string
  cover_photo_id: string | null
  photo_count: number
  updated_at: string
  is_featured: boolean
  cover_photos: GalleryPhotoStub[]
  sample_photos: GalleryPhotoStub[]
}

export interface GalleryDetail extends Omit<
  Gallery,
  'cover_photos' | 'sample_photos' | 'is_featured'
> {
  photos: GalleryPhotoStub[]
}

export async function listGalleries(): Promise<{ data: Gallery[]; featured: Gallery | null }> {
  return apiGet<{ data: Gallery[]; featured: Gallery | null }>(`/galleries`)
}

export async function getGallery(id: string): Promise<GalleryDetail> {
  return apiGet<GalleryDetail>(`/galleries/${id}`)
}

export interface ProfileSummary {
  handle: string
  id: string
  name: string | null
  username: string | null
  bio: string | null
  location: string | null
  photo_count: number
  album_count: number
  favorites_received: number
  views_received: number
  joined_at: string | null
  photos: Photo[]
  albums: Album[]
}

export async function getProfile(handle: string): Promise<ProfileSummary> {
  return apiGet<ProfileSummary>(`/profiles/${encodeURIComponent(handle)}`)
}
