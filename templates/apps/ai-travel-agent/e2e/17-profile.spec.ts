import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiGet,
  captureNetwork,
  getAccessToken,
  getUserId,
  signup,
} from './_helpers.js'

interface UserResponse {
  props: {
    id: string
    email: string
    name?: string
  }
}

interface ProfileExtrasResponse {
  handle?: string
  bio?: string
  publicProfile?: boolean
  avatarUrl?: string | null
}

test.describe('/profile (display name + handle + bio + public toggle)', () => {
  test.setTimeout(60_000)

  test('renders the user email + initials avatar + form fields', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByRole('heading', { name: /basics/i })).toBeVisible()
  })

  test('Save persists displayName + handle + bio (read-after-write + reload)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    // Profile.tsx renders, in order: a hidden avatar <input type="file">, then
    // displayName (text), EMAIL, handle (text), and bio (<textarea>). Filtering
    // only the file input left email at index 1, so the handle was typed into
    // it and every save answered 400 "Email is invalid" — the failure surfaced
    // as a missing "Saved at" indicator, nowhere near the cause. Select the two
    // email field out as well. (input[type="text"] does not work here: the
    // fields are bare <input> with no type attribute, so the CSS selector
    // matches nothing even though the DOM property reads 'text'.)
    const editable = page.locator(
      'input:not([type="file"]):not([type="hidden"]):not([type="email"])',
    )
    const display = 'Display ' + Date.now()
    const handle = 'h' + Date.now()
    const bio = 'My voice-first bio.'
    await editable.nth(0).fill(display)
    await editable.nth(1).fill(handle)
    await page.locator('textarea').first().fill(bio)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save profile/i }).click()
      await expect(page.getByText(/saved at/i)).toBeVisible({ timeout: 15_000 })
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\/[^/]+(\?|$)/.test(r.url))
    expect(patch, 'PATCH /api/users/:id must fire on save').toBeDefined()
    expect(patch!.status).toBeLessThan(300)

    const id = await getUserId(page)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    const me = await apiGet<UserResponse>(page, `/users/${id}`)
    expect(me.props.name).toBe(display)
    // The platform user resource NEVER returns `oauthData` on reads — the
    // extras slice is served by the server-side /profile channel instead.
    const extras = await apiGet<ProfileExtrasResponse>(page, '/profile')
    expect(extras.handle).toBe(handle)
    expect(extras.bio).toBe(bio)

    await page.reload()
    // Same field set as above — text inputs only, so index 1 is the handle and
    // not the email.
    const editableAfter = page.locator(
      'input:not([type="file"]):not([type="hidden"]):not([type="email"])',
    )
    await expect(editableAfter.nth(0)).toHaveValue(display, { timeout: 15_000 })
    await expect(editableAfter.nth(1)).toHaveValue(handle)
    await expect(page.locator('textarea').first()).toHaveValue(bio)
  })

  test('public-profile switch toggles aria-checked and survives save', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    const sw = page.getByRole('switch', { name: /public profile/i })
    await expect(sw).toBeVisible({ timeout: 15_000 })
    const before = await sw.getAttribute('aria-checked')
    await sw.click()
    const after = before === 'true' ? 'false' : 'true'
    await expect(sw).toHaveAttribute('aria-checked', after, { timeout: 5_000 })

    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByText(/saved at/i)).toBeVisible({ timeout: 15_000 })

    // Read the persisted slice back through the server-side /profile channel.
    const extras = await apiGet<ProfileExtrasResponse>(page, '/profile')
    expect(extras.publicProfile).toBe(after === 'true')
  })

  test('avatar pick + save persists across reload as a data: URL', async ({ page }) => {
    // Past versions of this page wrote a `blob:` URL via URL.createObjectURL
    // and saved that into oauthData.profile.avatarUrl. blob: URLs are
    // session-scoped — they die the instant the page reloads, so the
    // "Change" button looked like it worked but the avatar quietly
    // reverted to the initials on the next visit. The fix: read the file
    // as a data URL so it survives navigation.
    await signup(page)
    await page.goto(APP_BASE + '/profile')

    // Tiny single-pixel PNG so the test is deterministic.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=',
      'base64',
    )
    await page.setInputFiles('input[type="file"]', {
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: png,
    })
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByText(/saved at/i)).toBeVisible({ timeout: 15_000 })

    // Read the stored avatar through the server-side /profile channel
    // (GET /users/:id never returns `oauthData`).
    const stored = (await apiGet<ProfileExtrasResponse>(page, '/profile')).avatarUrl ?? ''
    expect(stored.startsWith('data:image/'), `expected data: URL, got ${stored.slice(0, 40)}`).toBe(
      true,
    )

    await page.reload()
    await page.waitForTimeout(800)
    const src = await page.evaluate(() => {
      const img = document.querySelector('main img')
      return img ? (img.getAttribute('src') ?? '') : ''
    })
    expect(
      src.startsWith('data:image/'),
      `after reload expected data: URL, got ${src.slice(0, 40)}`,
    ).toBe(true)
  })

  test('profile save does NOT clobber other oauthData keys (read-modify-write)', async ({
    page,
  }) => {
    await signup(page)
    // Seed voicePreferences via the preferences endpoint first.
    const token = await getAccessToken(page)
    const seed = await page.request.put(API_BASE + '/preferences', {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      data: { voice: 'echo' },
    })
    expect(seed.status(), 'seed PUT /preferences should be 2xx').toBeLessThan(400)

    await page.goto(APP_BASE + '/profile')
    await page
      .locator('input:not([type="file"]):not([type="hidden"])')
      .nth(0)
      .fill('Roundtrip Display')
    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByText(/saved at/i)).toBeVisible({ timeout: 15_000 })

    const prefs = await apiGet<{ voice: string }>(page, '/preferences')
    expect(prefs.voice, 'profile save must NOT wipe voicePreferences').toBe('echo')
  })
})
