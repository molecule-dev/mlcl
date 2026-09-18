/**
 * /org-chart — renders the reporting tree rooted at the manager-less
 * employee and each node links to /employees/:id.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, getEmployees, signup } from './_helpers.js'

interface OrgNode {
  id: string
  name: string
  title: string
  children: OrgNode[]
}

/** The tree the page renders, read from the endpoint the page calls. */
async function getOrgTree(
  page: import('@playwright/test').Page,
  accessToken: string,
): Promise<OrgNode> {
  const res = await page.request.get(`${API_BASE}/org-tree`, { headers: apiHeaders(accessToken) })
  expect(res.status()).toBe(200)
  const tree = (await res.json()) as OrgNode | null
  expect(tree, 'the app must hold at least one employee for an org tree').not.toBeNull()
  return tree!
}

test.describe('org-chart page', () => {
  test('renders the root and a direct report (initial mount fetches /api/org-tree)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // The names come from the tree the page itself fetches, so the spec holds
    // once the demo roster is replaced.
    const tree = await getOrgTree(page, accessToken)
    expect(tree.children.length, 'the root must have at least one report').toBeGreaterThan(0)
    const report = tree.children[0]
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/org-chart')
      await expect(page.getByRole('link', { name: tree.name })).toBeVisible({
        timeout: 15_000,
      })
    })
    expect(reqs.find((r) => /\/api\/org-tree/.test(r.url) && r.method === 'GET')).toBeTruthy()
    await expect(page.getByText(report.name).first()).toBeVisible()
  })

  test('clicking a node navigates to that employee profile', async ({ page }) => {
    const { accessToken } = await signup(page)
    const tree = await getOrgTree(page, accessToken)
    expect(tree.children.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/org-chart')
    await page.getByRole('link', { name: tree.children[0].name }).first().click()
    await page.waitForURL(/\/employees\/[0-9a-f-]{36}/, { timeout: 10_000 })
  })

  test('GET /api/org-tree returns a tree rooted at a real employee with reports', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const tree = await getOrgTree(page, accessToken)
    // The root is one of the roster's own employees, and it has reports.
    const roster = await getEmployees(page, accessToken)
    expect(roster.some((e) => e.id === tree.id && e.name === tree.name)).toBe(true)
    expect(Array.isArray(tree.children)).toBe(true)
    expect(tree.children.length).toBeGreaterThan(0)
  })
})
