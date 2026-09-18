import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiFetch, captureNetwork, signup, waitForSeed } from './_helpers'

// /flags/new — create-flag form. POST /api/flags with key, name,
// description, flag_type, environment, default_value, is_enabled.

test.describe('/flags/new', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/flags/new')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders the form sections (identity, variants, defaults)', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/flags/new')
    await expect(page.locator('#flag-name')).toBeVisible()
    await expect(page.locator('#flag-key')).toBeVisible()
    await expect(page.locator('#flag-description')).toBeVisible()
    await expect(page.getByRole('button', { name: /^create flag$/i })).toBeVisible()
  })

  test('typing a name auto-derives the slug into the key field', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/flags/new')
    await page.locator('#flag-name').fill('Q1 wizard cleanup')
    await expect(page.locator('#flag-key')).toHaveValue('q1-wizard-cleanup')
  })

  test('flag-type buttons switch the form into multivariate mode (variant rows visible)', async ({
    page,
  }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/flags/new')
    await page.getByRole('button', { name: /^multivariate$/i }).click()
    // Variants UI for multivariate types renders editable variant rows.
    await expect(page.getByPlaceholder('variant_key').first()).toBeVisible()
  })

  test('submit POSTs /api/flags and redirects to /flags/:key with the new flag in DB', async ({
    page,
  }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/flags/new')
    const uniqueName = `New checkout flow ${Date.now()}`
    await page.locator('#flag-name').fill(uniqueName)
    const expectedKey = await page.locator('#flag-key').inputValue()
    await page.locator('#flag-description').fill('Created via e2e test')
    // Enable production environment.
    await page.getByRole('checkbox', { name: /production/i }).check()
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^create flag$/i }).click()
      await page.waitForURL(new RegExp(`/flags/${expectedKey}$`), { timeout: 10_000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/flags(\?|$)/.test(r.url))
    expect(post, 'POST /api/flags should fire').toBeDefined()
    expect(post!.status).toBe(201)
    // Read-after-write
    const fresh = await apiFetch(page, 'GET', `/flags/${expectedKey}`)
    expect(fresh.status).toBe(200)
    expect((fresh.json as { name: string }).name).toBe(uniqueName)
  })

  test('"Cancel" link navigates back to /flags', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    await page.goto(APP_BASE + '/flags/new')
    await page.getByRole('link', { name: /^cancel$/i }).click()
    await expect(page).toHaveURL(/\/flags$/)
  })
})
