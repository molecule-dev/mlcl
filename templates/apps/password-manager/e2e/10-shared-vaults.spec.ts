import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, authedApiGet } from './_helpers'

test.describe('/shared', () => {
  test('renders empty state with new-vault toggle button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shared')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('shared-empty')).toBeVisible()
    await expect(page.getByTestId('shared-toggle-form')).toBeVisible()
  })

  test('GET /api/vaults fires when page loads', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/shared')
      await page.waitForLoadState('networkidle')
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/vaults(\?|$)/.test(r.url))
    expect(get, 'GET /api/vaults must fire').toBeDefined()
    expect(get!.status).toBeLessThan(400)
  })

  test('Creating a shared vault POSTs and the new vault appears + persists across reload', async ({
    page,
    request,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shared')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('shared-toggle-form').click()
    await expect(page.getByTestId('shared-create-form')).toBeVisible()
    const vaultName = `family-vault-${Date.now()}`
    await page.getByTestId('shared-form-name').fill(vaultName)
    await page.getByTestId('shared-form-description').fill('Persistence smoke test')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('shared-form-submit').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/vaults(\?|$)/.test(r.url))
    expect(post, 'POST /api/vaults must fire on create').toBeDefined()
    expect(post!.status).toBeLessThan(300)

    await expect(page.getByText(vaultName).first()).toBeVisible({ timeout: 5_000 })

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(vaultName).first()).toBeVisible({ timeout: 10_000 })

    const { status, data } = await authedApiGet<unknown>(request, page, '/vaults')
    expect(status).toBe(200)
    const vaults = (Array.isArray(data) ? data : ((data as { data?: unknown[] }).data ?? [])) as {
      name: string
    }[]
    expect(
      vaults.find((v) => v.name === vaultName),
      'created vault must appear in GET /vaults',
    ).toBeDefined()
  })

  test('Vault card link navigates to /shared/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shared')
    await page.getByTestId('shared-toggle-form').click()
    const name = `Test-Detail-${Date.now()}`
    await page.getByTestId('shared-form-name').fill(name)
    await page.getByTestId('shared-form-submit').click()
    await page.waitForTimeout(1500)
    const card = page.getByText(name).first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/\/shared\/[^/]+/, { timeout: 10_000 })
  })
})
