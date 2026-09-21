/**
 * Add-relative (signature flow). Creates an anchor person via the API,
 * then drives the relation-picker form in the UI to add a PARENT — and
 * verifies the implicit-inverse contract through the API: the anchor gains
 * a parent, and the new person gains the anchor as a child, without a
 * second "child" edge ever being stored.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, createPerson, getPerson, getTree, signup, uniqueEmail } from './_helpers.js'

test.describe('add relative', () => {
  test('adding a parent via the picker links both directions', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('add-parent'))
    const anchor = await createPerson(page, accessToken, {
      first_name: 'Anchor',
      last_name: 'Probe',
      birth_date: '1990-05-04',
    })
    expect(anchor.id).toBeTruthy()

    await page.goto(APP_BASE + `/people/${anchor.id}/add-relative`)
    await expect(page.locator('[data-mol-id="page-add-relative"]').first()).toBeVisible()
    // The anchor's name heads the page.
    await expect(page.locator('h1')).toContainText('Anchor')

    // Relation picker defaults to parent; make the choice explicit anyway.
    await page.locator('[data-mol-id="relation-parent"]').check()
    await page.locator('[data-mol-id="add-relative-first-name"]').fill('Parent')
    await page.locator('[data-mol-id="add-relative-last-name"]').fill('Probe')
    await page.locator('[data-mol-id="add-relative-birth-date"]').fill('1962-03-02')
    await page.locator('[data-mol-id="add-relative-submit"]').click()

    await expect(page).toHaveURL(new RegExp(`/people/${anchor.id}$`), { timeout: 20_000 })

    // Implicit-inverse contract, verified through the API.
    const anchorAfter = await getPerson(page, accessToken, anchor.id)
    const parentEntry = anchorAfter.relatives?.parents.find((p) => p.first_name === 'Parent')
    expect(parentEntry, 'anchor must list the new person as a parent').toBeDefined()

    const parentAfter = await getPerson(page, accessToken, parentEntry!.id)
    const childEntry = parentAfter.relatives?.children.find((c) => c.id === anchor.id)
    expect(childEntry, 'the new parent must list the anchor as their child').toBeDefined()

    // Exactly ONE parent edge was stored (no duplicate inverse edge). Root
    // the tree at the anchor: the default root picks the seeded demo family,
    // a different connected component that legitimately excludes the anchor.
    const tree = await getTree(page, accessToken, anchor.id)
    const parentEdges = tree.edges.filter(
      (e) => e.kind === 'parent' && e.fromId === anchor.id && e.toId === parentEntry!.id,
    )
    expect(parentEdges).toHaveLength(1)

    // The tree layout now includes the new person one generation above.
    const parentNode = tree.nodes.find((n) => n.id === parentEntry!.id)
    const anchorNode = tree.nodes.find((n) => n.id === anchor.id)
    expect(parentNode && anchorNode).toBeDefined()
    expect(parentNode!.generation).toBeLessThan(anchorNode!.generation)
  })

  test('relation picker offers all four relation kinds', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('relation-picker'))
    const anchor = await createPerson(page, accessToken, { first_name: 'Picker' })
    await page.goto(APP_BASE + `/people/${anchor.id}/add-relative`)
    await expect(page.locator('[data-mol-id="relation-picker"]')).toBeVisible()
    for (const rel of ['parent', 'partner', 'child', 'sibling'] as const) {
      await expect(page.locator(`[data-mol-id="relation-${rel}"]`)).toBeAttached()
    }
  })
})
