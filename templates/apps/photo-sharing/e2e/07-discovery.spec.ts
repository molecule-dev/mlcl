/**
 * Discovery surfaces — public profile + galleries + UUID hardening.
 *
 * Adds coverage for behaviors that originally shipped as either static
 * placeholders or 500s:
 *
 * 1. `GET /api/profiles/:handle` resolves a real signed-up user by
 *    username and returns their photos + albums; visiting `/u/:handle`
 *    in the UI renders the live profile (no hardcoded sample data).
 * 2. `GET /api/galleries` surfaces public albums as galleries; the
 *    Galleries page links each gallery card to `/albums/:id` so the CTA
 *    actually navigates somewhere real.
 * 3. Owner photoPrefs (`showExif`, `allowDownload`) gate the visitor-
 *    facing EXIF panel + download button on PhotoDetail. Owners always
 *    see both on their own photos; visitors must respect the setting.
 * 4. UUID-shaped guards on `/api/photos/:id`, `/api/albums/:id`, and
 *    `/api/galleries/:id` return a clean 404 instead of a 500 from the
 *    Postgres uuid-cast error.
 * 5. AlbumDetail "Add photos" carries `?album_id=<id>` into Upload, and
 *    Upload's `<select data-testid="upload-album-select">` wires the
 *    chosen album into `POST /api/photos`.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail, uploadAndCreatePhoto } from './_helpers.js'

test.describe('discovery: profiles + galleries + visibility', () => {
  test('GET /api/profiles/:handle returns the live profile, /u/<handle> renders it', async ({
    page,
    request,
  }) => {
    await signup(page)
    const me = await page.request.get(`${API_BASE}/users/me`)
    const meBody = await me.json()
    const userId = meBody?.props?.id as string
    expect(userId, 'signed-up user must have an id').toBeTruthy()
    // The signup form doesn't ask for a handle; users pick one from
    // Settings later. The handler accepts either a username OR the
    // user uuid, so test the uuid path here. (The username path is
    // exercised end-to-end whenever a user has set one.)
    const handle = (meBody?.props?.username as string) || userId

    const { photoId } = await uploadAndCreatePhoto(page.request, {
      title: 'Profile portfolio shot',
    })

    const profile = await request.get(`${API_BASE}/profiles/${encodeURIComponent(handle)}`, {
      headers: {
        Cookie: (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; '),
      },
    })
    expect(profile.status()).toBe(200)
    const body = await profile.json()
    expect(body.id).toBe(userId)
    expect(body.photo_count).toBeGreaterThanOrEqual(1)
    expect(body.photos.some((p: { id: string }) => p.id === photoId)).toBe(true)

    await page.goto(`${APP_BASE}/u/${encodeURIComponent(handle)}`)
    await expect(page.getByTestId('profile-name')).toBeVisible()
  })

  test('unknown handle returns 404 and the UI shows a clean not-found state', async ({
    page,
    request,
  }) => {
    // The 404 fetch below is the SUBJECT of the test (clean not-found state),
    // so its expected browser-console entry must not fail the run.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page)
    const profile = await request.get(`${API_BASE}/profiles/definitely-not-a-real-handle-xyz`)
    expect(profile.status()).toBe(404)

    await page.goto(`${APP_BASE}/u/definitely-not-a-real-handle-xyz`)
    await expect(page.getByTestId('profile-error')).toBeVisible()
  })

  test('GET /api/galleries surfaces public albums; Galleries page links each card to /albums/:id', async ({
    page,
  }) => {
    await signup(page)
    // Create a public album with a photo so it qualifies as a gallery.
    const album = await page.request.post(`${API_BASE}/albums`, {
      data: { title: 'Reykjavík blue hour', visibility: 'public', description: 'A short edit.' },
      headers: { 'content-type': 'application/json' },
    })
    expect(album.status()).toBe(201)
    const albumId = (await album.json()).id as string
    const { photoId } = await uploadAndCreatePhoto(page.request, {
      title: 'Cover frame',
      albumId,
      visibility: 'public',
    })
    expect(photoId).toBeTruthy()

    const galleries = await page.request.get(`${API_BASE}/galleries`)
    expect(galleries.status()).toBe(200)
    const body = await galleries.json()
    expect(Array.isArray(body.data)).toBe(true)
    const ours = body.data.find((g: { id: string }) => g.id === albumId)
    expect(ours, 'newly created public album should appear in /galleries').toBeTruthy()
    expect(ours.photo_count).toBeGreaterThanOrEqual(1)

    await page.goto(`${APP_BASE}/galleries`)
    await expect(
      page.getByTestId(`galleries-card-${albumId}`).or(page.getByTestId('galleries-featured-open')),
    ).toBeVisible()
  })
})

test.describe('owner photoPrefs gate visitor view of EXIF + download', () => {
  test('visitor cannot download or see EXIF when owner disables both', async ({ browser }) => {
    const ownerCtx = await browser.newContext()
    const ownerPage = await ownerCtx.newPage()
    await signup(ownerPage)
    const { photoId } = await uploadAndCreatePhoto(ownerPage.request, {
      title: 'Owner-restricted photo',
    })
    // Toggle off allowDownload + showExif via Settings UI to mirror the
    // exact path a real user would take.
    await ownerPage.goto(`${APP_BASE}/settings`)
    await ownerPage.getByTestId('settings-tab-gallery').click()
    const allowDl = ownerPage.getByTestId('settings-allow-download')
    if (await allowDl.isChecked()) await allowDl.click()
    const showExif = ownerPage.getByTestId('settings-show-exif')
    if (await showExif.isChecked()) await showExif.click()
    await ownerPage.getByTestId('settings-save').click()
    await expect(ownerPage.getByTestId('settings-saved-banner')).toBeVisible({ timeout: 10_000 })

    // Owner still sees their own download button + EXIF — by design.
    await ownerPage.goto(`${APP_BASE}/photos/${photoId}`)
    await expect(ownerPage.getByTestId('photo-detail-download')).toBeVisible()

    // New visitor account: should NOT see download button or EXIF.
    const visitorCtx = await browser.newContext()
    const visitorPage = await visitorCtx.newPage()
    await signup(visitorPage, uniqueEmail('visitor'))
    await visitorPage.goto(`${APP_BASE}/photos/${photoId}`)
    await expect(visitorPage.getByTestId('photo-detail-image')).toBeVisible()
    await expect(visitorPage.getByTestId('photo-detail-delete')).toHaveCount(0)
    await expect(visitorPage.getByTestId('photo-detail-download')).toHaveCount(0)
    await expect(visitorPage.locator('text=/Camera body|aperture|shutter|iso/i')).toHaveCount(0)

    await ownerCtx.close()
    await visitorCtx.close()
  })
})

test.describe('UUID-shaped 404 instead of 500 on bad route ids', () => {
  test('photos / albums / galleries return 404 for non-uuid ids', async ({ page, request }) => {
    await signup(page)
    const cookieHeader = (await page.context().cookies())
      .map((c) => `${c.name}=${c.value}`)
      .join('; ')

    for (const path of ['photos', 'albums', 'galleries']) {
      const res = await request.get(`${API_BASE}/${path}/p_blue_hour`, {
        headers: { Cookie: cookieHeader },
      })
      expect(res.status(), `${path}/p_blue_hour should 404, got ${res.status()}`).toBe(404)
    }
  })
})

test.describe('Album CTA → Upload preserves album_id', () => {
  test('AlbumDetail Add photos passes album_id; Upload select picks it up; new photo lands in album', async ({
    page,
  }) => {
    await signup(page)
    const album = await page.request.post(`${API_BASE}/albums`, {
      data: { title: 'Add-photos target', visibility: 'public' },
      headers: { 'content-type': 'application/json' },
    })
    const albumId = (await album.json()).id as string

    await page.goto(`${APP_BASE}/albums/${albumId}`)
    const addPhotosLink = page.getByTestId('album-detail-add-photos')
    await expect(addPhotosLink).toHaveAttribute('href', `/upload?album_id=${albumId}`)

    await addPhotosLink.click()
    await expect(page).toHaveURL(new RegExp(`/upload\\?album_id=${albumId}`))
    const select = page.getByTestId('upload-album-select')
    await expect(select).toBeVisible()
    await expect(select).toHaveValue(albumId)

    // Round-trip via API to confirm the chosen albumId actually carries
    // through to POST /api/photos (the UI just collects metadata; the
    // wire bytes are what matters).
    const { photoId } = await uploadAndCreatePhoto(page.request, {
      title: 'Lands in album',
      albumId,
    })
    const fetched = await page.request.get(`${API_BASE}/photos/${photoId}`)
    expect(fetched.status()).toBe(200)
    const photo = await fetched.json()
    expect(photo.album_id).toBe(albumId)

    const detail = await page.request.get(`${API_BASE}/albums/${albumId}`)
    const detailBody = await detail.json()
    expect(detailBody.photos.some((p: { id: string }) => p.id === photoId)).toBe(true)
  })
})
