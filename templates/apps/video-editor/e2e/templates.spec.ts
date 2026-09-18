import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup } from './_helpers.js'

test.describe('templates', () => {
  test('templates page lists seeded templates', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await expect(page.locator('[data-mol-id="templates-grid"]')).toBeVisible({ timeout: 10_000 })
  })

  test('template detail loads and "Use template" creates a project + navigates to editor', async ({
    page,
  }) => {
    await signup(page)
    const list = await api<Array<{ id: string; name: string }>>(page, 'GET', '/templates')
    expect(list.length, 'templates seeded').toBeGreaterThan(0)
    const tpl = list[0]
    await page.goto(APP_BASE + '/templates/' + tpl.id)
    await expect(page.locator('[data-mol-id="template-name"]')).toContainText(tpl.name, {
      timeout: 10_000,
    })
    await page.locator('[data-mol-id="template-apply"]').click()
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{8,}/, { timeout: 15_000 })
    const projects = await api<Array<{ template_id?: string | null }>>(page, 'GET', '/projects')
    expect(
      projects.some((p) => p.template_id === tpl.id),
      'project bound to template',
    ).toBe(true)
  })

  test('unknown template id renders error gracefully', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('[data-mol-id="template-error"]')).toBeVisible({ timeout: 10_000 })
  })
})
