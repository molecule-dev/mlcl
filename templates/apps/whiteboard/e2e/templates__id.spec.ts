import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { api, APP_BASE, captureNetwork, seedTemplate, signup } from './_helpers'

test.describe('/templates/:id — template detail page', () => {
  test('renders the template name, description, "Use template" CTA, and "All templates" back link', async ({
    page,
  }) => {
    await signup(page)
    const tpl = await seedTemplate(page, {
      name: 'Detail Tpl',
      description: 'docs body',
    })
    await page.goto(APP_BASE + `/templates/${tpl.id}`)
    await expect(page.getByRole('heading', { name: 'Detail Tpl', level: 1 })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('docs body')).toBeVisible()
    await expect(page.locator('[data-mol-id="template-detail-use"]')).toBeEnabled()
    await expect(page.locator('[data-mol-id="template-detail-back"]')).toBeVisible()
  })

  test('"Use template" instantiates a new board and navigates to /board/:id', async ({ page }) => {
    await signup(page)
    const tpl = await seedTemplate(page, {
      name: 'Instantiate Me',
      snapshot: { elements: [{ type: 'sticky', x: 5, y: 5, width: 50, height: 50 }] },
    })
    await page.goto(APP_BASE + `/templates/${tpl.id}`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="template-detail-use"]').click()
      await page.waitForURL(/\/board\/[a-f0-9-]+/, { timeout: 10_000 })
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          new RegExp(`/api/templates/${tpl.id}/instantiate`).test(r.url) &&
          r.status < 400,
      ),
      `expected POST /api/templates/${tpl.id}/instantiate — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
  })

  test('"Delete template" removes a non-system template and navigates back to /templates', async ({
    page,
  }) => {
    await signup(page)
    const tpl = await seedTemplate(page, { name: 'Delete Me' })
    await page.goto(APP_BASE + `/templates/${tpl.id}`)
    await page.locator('[data-mol-id="template-detail-delete"]').click()
    await expect(page).toHaveURL(/\/templates(?:\/?)$/)
    const list = await api<Array<{ id: string }>>(page, 'GET', '/templates')
    expect(
      list.some((t) => t.id === tpl.id),
      'deleted template must NOT appear in list',
    ).toBe(false)
  })

  test('"All templates" link returns to /templates', async ({ page }) => {
    await signup(page)
    const tpl = await seedTemplate(page, { name: 'Back link tpl' })
    await page.goto(APP_BASE + `/templates/${tpl.id}`)
    await page.locator('[data-mol-id="template-detail-back"]').click()
    await expect(page).toHaveURL(/\/templates(?:\/?)$/)
  })
})
