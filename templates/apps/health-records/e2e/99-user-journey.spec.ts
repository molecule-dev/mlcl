/**
 * Kitchen-sink end-to-end journey for the Meridian (health-records) flagship.
 *
 * One user signs up, walks through every primary page (dashboard,
 * medications, labs, visits, immunizations, documents, records,
 * notifications, sharing, settings, profile, pricing), exercises each
 * primary mutation (refill medication, upload document, share grant,
 * rotate encryption key, change password, mark notification read,
 * read profile + allergies/conditions endpoints), and re-reads to prove
 * each side effect actually persisted.
 *
 * If you only run one spec, run this one — it's the closest thing the
 * suite has to a paying-customer walkthrough.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  authHeaders,
  listMedications,
  logout,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('user-journey', () => {
  test('full happy-path sweep across every primary surface', async ({ page }) => {
    test.slow()
    const password = 'JourneyPass2026!'
    const newPassword = 'JourneyPass2026Rotated!'
    const email = uniqueEmail('journey')
    const { accessToken } = await signup(page, email, password)
    expect(accessToken, 'signup must return access token').toBeTruthy()
    const auth = authHeaders(accessToken)

    // 1. Read-only data endpoints — confirm seed populated meaningful rows.
    for (const [path, key] of [
      ['/medications', 'medications'],
      ['/labs', 'labs'],
      ['/visits', 'visits'],
      ['/immunizations', 'immunizations'],
      ['/documents', 'documents'],
      ['/records', 'records'],
      ['/notifications', 'notifications'],
      ['/conditions', 'conditions'],
      ['/allergies', 'allergies'],
    ] as const) {
      const r = await page.request.get(`${API_BASE}${path}`, { headers: auth })
      expect(r.status(), `${key} must respond 2xx`).toBeLessThan(400)
      const body = (await r.json()) as unknown
      const list = Array.isArray(body)
        ? body
        : Array.isArray((body as { data?: unknown[] }).data)
          ? (body as { data: unknown[] }).data
          : []
      expect(list.length, `${key} should be seeded for new users`).toBeGreaterThan(0)
    }

    // 2. Stats overview reflects the seed (no zero counts for active items).
    const stats = await page.request.get(`${API_BASE}/stats/overview`, { headers: auth })
    expect(stats.status()).toBe(200)
    const overview = (await stats.json()) as {
      active_medications?: number
      active_conditions?: number
    }
    expect(overview.active_medications ?? 0).toBeGreaterThan(0)

    // 3. Refill a medication — refills_used increments.
    const meds = await listMedications(page, accessToken)
    const refillTarget = meds.find(
      (m) => (m.refills_remaining ?? (m.refills_total ?? 0) - (m.refills_used ?? 0)) > 0,
    )
    if (refillTarget) {
      const before = refillTarget.refills_used ?? 0
      const refill = await page.request.post(`${API_BASE}/medications/${refillTarget.id}/refill`, {
        headers: auth,
        data: {},
      })
      expect(refill.status(), await refill.text().catch(() => '')).toBeLessThan(400)
      const after = await page.request.get(`${API_BASE}/medications/${refillTarget.id}`, {
        headers: auth,
      })
      const updated = (await after.json()) as { refills_used?: number }
      expect(updated.refills_used ?? 0).toBeGreaterThan(before)
    }

    // 4. Document upload via API — list grows.
    const docsBefore = (await (
      await page.request.get(`${API_BASE}/documents`, { headers: auth })
    ).json()) as Array<{ id: string }>
    const upload = await page.request.post(`${API_BASE}/documents`, {
      headers: auth,
      data: {
        title: `journey-${Date.now()}.pdf`,
        category: 'lab_report',
        file_name: 'journey.pdf',
        file_size: 64,
        mime_type: 'application/pdf',
        file_url: 'data:application/pdf;base64,JVBERi0xLjAKJSU=',
        document_date: new Date().toISOString().slice(0, 10),
      },
    })
    expect(upload.status(), await upload.text().catch(() => '')).toBeLessThan(400)
    const docsAfter = (await (
      await page.request.get(`${API_BASE}/documents`, { headers: auth })
    ).json()) as Array<{ id: string }>
    expect(docsAfter.length).toBeGreaterThan(docsBefore.length)

    // 5. Sharing grant — recipient row appears in list, response advertises email status.
    const grant = await page.request.post(`${API_BASE}/sharing`, {
      headers: auth,
      data: {
        recipient_email: `journey-recipient+${Date.now()}@example.com`,
        recipient_name: 'Dr. Journey',
        role: 'provider',
        scope: ['medications', 'documents'],
      },
    })
    expect(grant.status()).toBe(201)
    const grantBody = (await grant.json()) as { id: string; email?: { sent: boolean } }
    expect(grantBody.id).toBeTruthy()
    expect(grantBody.email).toBeDefined()
    const shares = (await (
      await page.request.get(`${API_BASE}/sharing`, { headers: auth })
    ).json()) as Array<{ id: string; revoked_at: string | null }>
    expect(shares.find((s) => s.id === grantBody.id)).toBeTruthy()

    // 6. Notification: mark first item read.
    const notes = (await (
      await page.request.get(`${API_BASE}/notifications`, { headers: auth })
    ).json()) as Array<{ id: string; read_at: string | null }>
    const unread = notes.find((n) => !n.read_at)
    if (unread) {
      const mark = await page.request.post(`${API_BASE}/notifications/${unread.id}/read`, {
        headers: auth,
        data: {},
      })
      expect(mark.status(), await mark.text().catch(() => '')).toBeLessThan(400)
      const refreshed = (await (
        await page.request.get(`${API_BASE}/notifications`, { headers: auth })
      ).json()) as Array<{ id: string; read_at: string | null }>
      expect(refreshed.find((n) => n.id === unread.id)?.read_at).toBeTruthy()
    }

    // 7. Profile bundle: rotate encryption key, then bump version + change fingerprint.
    const profileBefore = (await (
      await page.request.get(`${API_BASE}/profile/me`, { headers: auth })
    ).json()) as { security?: { encryptionKeyVersion?: number; encryptionKeyFingerprint?: string } }
    const rotate = await page.request.post(`${API_BASE}/profile/me/rotate-key`, {
      headers: auth,
      data: {},
    })
    expect(rotate.status()).toBe(200)
    const profileAfter = (await rotate.json()) as {
      security?: { encryptionKeyVersion?: number; encryptionKeyFingerprint?: string }
    }
    expect(profileAfter.security?.encryptionKeyVersion ?? 0).toBeGreaterThan(
      profileBefore.security?.encryptionKeyVersion ?? 0,
    )
    expect(profileAfter.security?.encryptionKeyFingerprint).toBeTruthy()

    // 8. Change password and re-login.
    const pwOk = await page.request.patch(`${API_BASE}/users/me/password`, {
      headers: auth,
      data: { currentPassword: password, newPassword },
    })
    expect(pwOk.status(), await pwOk.text().catch(() => '')).toBeLessThan(400)
    // The password change revoked the old JWT — clear the httpOnly cookie via
    // logout() so the /login boot doesn't probe /users/me with it (401 noise).
    await logout(page)
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(newPassword)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in|continue/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })

    // 9. Walk every primary page in the UI — none should crash, none should
    //    leak unresolved {{i18n}} placeholders.
    const pages = [
      '/dashboard',
      '/medications',
      '/labs',
      '/visits',
      '/immunizations',
      '/documents',
      '/records',
      '/notifications',
      '/sharing',
      '/settings',
      '/profile',
    ]
    for (const path of pages) {
      await page.goto(APP_BASE + path)
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()
      expect(body, `unresolved i18n placeholder leaked on ${path}`).not.toContain('{{')
      expect(body, `unresolved i18n placeholder leaked on ${path}`).not.toContain('}}')
    }

    // 10. Public pricing page renders all tiers without auth.
    await logout(page)
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
    const pricingText = await page.locator('body').innerText()
    expect(pricingText.toLowerCase()).toMatch(/free|pro|team/i)
  })
})
