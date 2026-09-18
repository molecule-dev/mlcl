/**
 * Editorial galleries — currently surfaces public albums sorted by
 * photo_count + recent activity. Each "gallery" carries a featured
 * curator (the album owner), a small set of cover photos, and the
 * full photo list. When the product later grows a curator-built
 * editorial gallery system, this endpoint can switch to a `galleries`
 * table without changing the frontend contract.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface DbAlbumGallery extends Record<string, unknown> {
  id: string
  owner_id: string
  title: string
  description: string | null
  photo_count: number
  cover_photo_id: string | null
  visibility: string
  updated_at: Date | string
  curator_name: string | null
  curator_username: string | null
}

interface DbCoverPhoto extends Record<string, unknown> {
  id: string
  album_id: string | null
  thumbnail_url: string
  large_url: string
  width: number | null
  height: number | null
}

router.get('/', async (_req: Request, res: Response) => {
  // Surface public albums with at least one photo. Curators are the
  // album owners until a separate `galleries` table exists. Sort by
  // photo_count desc + most recently updated.
  const albumRes = await query<DbAlbumGallery>(
    `SELECT a.id,
            a.owner_id,
            a.title,
            a.description,
            a.photo_count,
            a.cover_photo_id,
            a.visibility,
            a.updated_at,
            u.name AS curator_name,
            u.username AS curator_username
     FROM albums a
     LEFT JOIN users u ON u.id = a.owner_id
     WHERE a.visibility = 'public' AND a.photo_count > 0
     ORDER BY a.photo_count DESC, a.updated_at DESC
     LIMIT 24`,
  )

  if (albumRes.rows.length === 0) {
    res.json({ data: [], featured: null })
    return
  }

  const albumIds = albumRes.rows.map((row) => row.id)
  const coverRes = await query<DbCoverPhoto>(
    `SELECT id, album_id, thumbnail_url, large_url, width, height
     FROM photos
     WHERE album_id = ANY($1::uuid[]) AND visibility = 'public'
     ORDER BY uploaded_at DESC`,
    [albumIds],
  )
  const photosByAlbum = new Map<string, DbCoverPhoto[]>()
  for (const photo of coverRes.rows) {
    if (!photo.album_id) continue
    const list = photosByAlbum.get(photo.album_id) ?? []
    list.push(photo)
    photosByAlbum.set(photo.album_id, list)
  }

  const galleries = albumRes.rows.map((row, idx) => {
    const photos = photosByAlbum.get(row.id) ?? []
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      curator:
        row.curator_name ??
        row.curator_username ??
        t('galleries.fallbackCurator', {}, { defaultValue: 'Photographer' }),
      curator_username: row.curator_username,
      curator_id: row.owner_id,
      cover_photo_id: row.cover_photo_id,
      photo_count: row.photo_count,
      updated_at: row.updated_at,
      // Mark the most-photo'd album as the featured one so the page
      // doesn't have to compute it client-side.
      is_featured: idx === 0,
      cover_photos: photos.slice(0, 4).map((p) => ({
        id: p.id,
        thumbnail_url: p.thumbnail_url,
        large_url: p.large_url,
        width: p.width,
        height: p.height,
      })),
      sample_photos: photos.slice(0, 6).map((p) => ({
        id: p.id,
        thumbnail_url: p.thumbnail_url,
        large_url: p.large_url,
        width: p.width,
        height: p.height,
      })),
    }
  })

  res.json({ data: galleries, featured: galleries[0] ?? null })
})

router.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id ?? '')
  // Gallery == public album in this iteration. Reuse the album lookup
  // pattern but only return rows that are public and have photos.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) {
    res
      .status(404)
      .json({ error: t('galleries.notFound', {}, { defaultValue: 'Gallery not found' }) })
    return
  }
  const albumRes = await query<DbAlbumGallery>(
    `SELECT a.id, a.owner_id, a.title, a.description, a.photo_count,
            a.cover_photo_id, a.visibility, a.updated_at,
            u.name AS curator_name, u.username AS curator_username
     FROM albums a
     LEFT JOIN users u ON u.id = a.owner_id
     WHERE a.id = $1 AND a.visibility = 'public'
     LIMIT 1`,
    [id],
  )
  const album = albumRes.rows[0]
  if (!album) {
    res
      .status(404)
      .json({ error: t('galleries.notFound', {}, { defaultValue: 'Gallery not found' }) })
    return
  }
  const photoRes = await query<DbCoverPhoto>(
    `SELECT id, album_id, thumbnail_url, large_url, width, height
     FROM photos
     WHERE album_id = $1 AND visibility = 'public'
     ORDER BY uploaded_at DESC`,
    [id],
  )
  res.json({
    id: album.id,
    title: album.title,
    description: album.description,
    curator:
      album.curator_name ??
      album.curator_username ??
      t('galleries.fallbackCurator', {}, { defaultValue: 'Photographer' }),
    curator_username: album.curator_username,
    curator_id: album.owner_id,
    photo_count: album.photo_count,
    updated_at: album.updated_at,
    photos: photoRes.rows.map((p) => ({
      id: p.id,
      thumbnail_url: p.thumbnail_url,
      large_url: p.large_url,
      width: p.width,
      height: p.height,
    })),
  })
})

export default router
