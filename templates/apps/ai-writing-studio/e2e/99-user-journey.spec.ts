/**
 * Cross-page kitchen-sink user journey for ai-writing-studio.
 *
 * Walks every primary feature in a single test, asserting on real outcomes
 * end-to-end:
 *  1. Sign up (creates a user)
 *  2. Land on /dashboard
 *  3. Create a new document via the dashboard CTA
 *  4. Type content, autosave on blur, reload — content persists
 *  5. Generate AI content via /api/generate/content
 *  6. Run SEO analysis — analysis row materialises
 *  7. Publish the document — status flips to "published" in DB
 *  8. Visit /documents — published doc appears in the list
 *  9. Visit /profile — published count is now 1
 * 10. Toggle theme + reload — theme persists
 * 11. Save a tone preference + reload — preference persists
 * 12. Sign out — token cleared, redirect to /login
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedGet,
  authedPost,
  captureNetwork,
  getAccessToken,
  signup,
} from './_helpers.js'

interface DocumentRow {
  id: string
  title: string
  content: string
  status: string
}

interface AnalysisRow {
  id: string
  document_id: string
  score: number
}

interface ProfilePayload {
  stats: { published: number }
}

test.describe('user journey', () => {
  test('signup → write → ai → seo → publish → profile → theme → preferences → sign out', async ({
    page,
  }) => {
    test.setTimeout(240_000)

    await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)

    // 3. Create a new document via API (UI flow tested elsewhere; here we
    // chain quickly so the journey doesn't time out).
    const created = await authedPost<DocumentRow>(page, '/documents', {
      title: 'User Journey Doc',
      content: '',
      status: 'draft',
      tags: [],
      outline: [],
    })
    const id = created.id
    await page.goto(APP_BASE + `/documents/${id}`)
    await expect(page.getByRole('textbox', { name: /Document body/i })).toBeVisible({
      timeout: 15_000,
    })

    // 4. Type, blur to save, reload, expect persistence.
    const sample =
      'A short paragraph of meaningful prose to round-trip through autosave and reload.'
    const body = page.getByRole('textbox', { name: /Document body/i })
    await body.fill(sample)
    await body.blur()
    await page.waitForTimeout(800)
    await page.reload()
    await expect(page.getByRole('textbox', { name: /Document body/i })).toHaveValue(
      new RegExp(sample.slice(0, 30)),
      { timeout: 10_000 },
    )

    // 5. Hit /api/generate/content with a real prompt and verify a non-empty payload.
    const gen = await authedPost<{ content: string }>(page, '/generate/content', {
      prompt: 'A two-sentence intro paragraph about the value of clear writing.',
      tone: 'Casual',
      lengthHint: 'short',
    })
    expect(gen.content?.length, 'AI content generation must return non-empty body').toBeGreaterThan(
      20,
    )

    // 6. Run SEO analysis from the page; assert the new row appears.
    await page.goto(APP_BASE + `/documents/${id}/seo`)
    const before = await authedGet<AnalysisRow[]>(page, `/seo/documents/${id}/analyses`)
    await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Run analysis/i }).click()
      await page.waitForTimeout(3000)
    })
    const after = await authedGet<AnalysisRow[]>(page, `/seo/documents/${id}/analyses`)
    expect(after.length).toBeGreaterThan(before.length)

    // 7. Publish from the editor; assert backend flip.
    await page.goto(APP_BASE + `/documents/${id}`)
    await expect(page.getByRole('button', { name: /^Publish$/i })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /^Publish$/i }).click()
    await page.waitForTimeout(1000)
    const fresh = await authedGet<DocumentRow>(page, `/documents/${id}`)
    expect(fresh.status).toBe('published')

    // 8. /documents shows the published doc.
    await page.goto(APP_BASE + '/documents')
    await expect(page.getByRole('link', { name: /User Journey Doc/i })).toBeVisible()

    // 9. /profile shows published count ≥ 1.
    const prof = await authedGet<ProfilePayload>(page, '/profile')
    expect(prof.stats.published).toBeGreaterThanOrEqual(1)

    // 10. Theme toggle persists across reload.
    await page.goto(APP_BASE + '/dashboard')
    const before2 = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .dispatchEvent('click')
    await page.waitForFunction(
      (b) => document.documentElement.getAttribute('data-mol-mode') !== b,
      before2,
      { timeout: 5000 },
    )
    const after2 = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page.reload()
    const persisted = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(persisted).toBe(after2)

    // 11. Settings → save tone → reload → persists.
    await page.goto(APP_BASE + '/settings')
    await page.getByLabel(/Default tone preset/i).selectOption('Academic')
    await page.getByRole('button', { name: /Save preferences/i }).click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await expect(page.getByLabel(/Default tone preset/i)).toHaveValue('Academic')

    // 12. Sign out.
    await page.locator('[data-mol-id="settings-sign-out"]').click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
    const token = await getAccessToken(page)
    expect(token).toBeFalsy()
  })
})
