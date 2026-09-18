import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, api, rawApi, seedTemplate, captureNetwork, APP_BASE } from './_helpers'

test.describe('templates — listing, creating, instantiating, deleting', () => {
  test('empty state shows when the user has no custom templates and no system templates exist', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    // Switch to "My templates" — the system filter could include built-ins on some installs.
    await page.locator('[data-mol-id="templates-filter-mine"]').click()
    await expect(page.locator('[data-mol-id="templates-empty"]')).toBeVisible()
  })

  test('creating a custom template via the modal POSTs and renders a new card', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await page.locator('[data-mol-id="templates-new-template"]').click()
    await expect(page.locator('[data-mol-id="templates-create-modal"]')).toBeVisible()
    const name = `Retro template ${Date.now()}`
    await page.locator('[data-mol-id="templates-create-name"]').fill(name)
    await page.locator('[data-mol-id="templates-create-description"]').fill('what a great retro')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="templates-create-submit"]').click()
      // Card appears in the grid.
      await expect(page.getByRole('link', { name })).toBeVisible()
    })
    expect(
      reqs.some(
        (r) => r.method === 'POST' && /\/api\/templates(?:\?|$|\/)/.test(r.url) && r.status < 400,
      ),
      `expected POST /api/templates from create modal — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    // Backend invariant: GET /api/templates contains a row with that name.
    const list = await api<Array<{ id: string; name: string }>>(page, 'GET', '/templates')
    expect(list.some((t) => t.name === name)).toBe(true)
  })

  test('clicking "Use template" instantiates a board and navigates to it', async ({ page }) => {
    await signup(page)
    const tpl = await seedTemplate(page, {
      name: 'Workshop kit',
      description: 'Two seed elements',
      snapshot: {
        elements: [
          { type: 'sticky', x: 10, y: 10, width: 100, height: 100, content: { text: 'a' } },
          { type: 'sticky', x: 200, y: 100, width: 100, height: 100, content: { text: 'b' } },
        ],
      },
    })
    await page.goto(APP_BASE + '/templates')
    await page.locator(`[data-mol-id="template-use-${tpl.id}"]`).click()
    await page.waitForURL(/\/board\/[\w-]+/, { timeout: 15_000 })
    // Backend invariant: the new board has 2 elements copied from the template snapshot.
    const url = page.url()
    const newBoardId = url.split('/board/')[1].split(/[/?#]/)[0]
    const elements = await api<Array<{ id: string }>>(page, 'GET', `/elements/${newBoardId}`)
    expect(elements.length).toBe(2)
  })

  test('TemplateDetail page renders details and "Delete template" removes it for non-system templates', async ({
    page,
  }) => {
    await signup(page)
    const tpl = await seedTemplate(page, { name: 'Throwaway template' })
    await page.goto(APP_BASE + `/templates/${tpl.id}`)
    await expect(page.getByRole('heading', { name: tpl.name }).first()).toBeVisible()
    await page.locator('[data-mol-id="template-detail-delete"]').click()
    await page.waitForURL(/\/templates$/, { timeout: 15_000 })
    const r = await rawApi(page, 'GET', `/templates/${tpl.id}`)
    expect([403, 404]).toContain(r.status)
  })

  test('templates list filters: all / system / mine', async ({ page }) => {
    await signup(page)
    const mine = await seedTemplate(page, { name: 'Just mine' })
    await page.goto(APP_BASE + '/templates')
    await page.locator('[data-mol-id="templates-filter-mine"]').click()
    await expect(page.locator(`[data-mol-id="template-card-${mine.id}"]`)).toBeVisible()
    await page.locator('[data-mol-id="templates-filter-system"]').click()
    // The user-created template should disappear under "system" filter.
    await expect(page.locator(`[data-mol-id="template-card-${mine.id}"]`)).toHaveCount(0)
    await page.locator('[data-mol-id="templates-filter-all"]').click()
    await expect(page.locator(`[data-mol-id="template-card-${mine.id}"]`)).toBeVisible()
  })

  test('cannot delete system templates (DELETE returns 403/404)', async ({ page }) => {
    await signup(page)
    // System templates are seeded by migration 0011_whiteboard_seed_templates.sql,
    // so at least one must exist for every fresh install.
    const list = await api<Array<{ id: string; is_system?: boolean }>>(page, 'GET', '/templates')
    const sys = list.find((t) => t.is_system)
    expect(sys, 'expected at least one system template to be seeded').toBeTruthy()
    const r = await rawApi(page, 'DELETE', `/templates/${sys!.id}`)
    expect([401, 403, 404]).toContain(r.status)
  })
})
