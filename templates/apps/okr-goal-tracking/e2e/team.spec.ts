import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { signup, APP_BASE, captureNetwork, API_BASE, apiHeaders } from './_helpers.js'

test.describe('Team page', () => {
  test('Create team POSTs /api/teams and the team renders in the list (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.getByTestId('team-empty')).toBeVisible()

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('team-name-input').fill('Support Guild')
      await page.getByTestId('team-create-submit').click()
      await expect(page.getByTestId('team-list')).toBeVisible()
    })
    const created = reqs.find((r) => r.method === 'POST' && /\/api\/teams\b/.test(r.url))
    expect(created, 'POST /api/teams not observed').toBeTruthy()
    expect(created!.status).toBeLessThan(300)

    // Read-after-write via the API.
    const list = await page.request.get(`${API_BASE}/teams`, { headers: apiHeaders(accessToken!) })
    const body = (await list.json()) as Array<{ name: string }>
    expect(body.find((t) => t.name === 'Support Guild')).toBeDefined()
  })

  test('Rename a team via inline input persists across reload (PATCH /api/teams/:id)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.getByTestId('team-name-input').fill('Renamable Team')
    await page.getByTestId('team-create-submit').click()

    const firstCard = page.getByTestId('team-list').locator('article').first()
    const teamId = (await firstCard.getAttribute('data-testid'))!.replace(/^team-/, '')
    await page.getByTestId(`team-name-${teamId}`).click()
    const renameInput = page.getByTestId(`team-rename-input-${teamId}`)
    await renameInput.fill('Climbing Team')
    await renameInput.press('Enter')

    await expect(firstCard).toContainText('Climbing Team')
    await page.reload()
    await expect(page.getByTestId('team-list')).toContainText('Climbing Team')

    // API confirms the new name.
    const fresh = await page.request.get(`${API_BASE}/teams/${teamId}`, {
      headers: apiHeaders(accessToken!),
    })
    expect(fresh.status()).toBe(200)
    const body = (await fresh.json()) as { name: string }
    expect(body.name).toBe('Climbing Team')
  })

  test('Delete a team removes it from the list (DELETE /api/teams/:id)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.getByTestId('team-name-input').fill('Disposable Team')
    await page.getByTestId('team-create-submit').click()

    const firstCard = page.getByTestId('team-list').locator('article').first()
    const teamId = (await firstCard.getAttribute('data-testid'))!.replace(/^team-/, '')

    const deleteButton = page.locator(`[data-mol-id="team-delete-${teamId}"]`)
    const reqs = await captureNetwork(page, async () => {
      await deleteButton.click()
      // First click arms the two-step ConfirmButton; the confirm label must
      // be showing before the second click commits.
      await expect(deleteButton).toContainText(/delete team "disposable team"\?/i)
      await deleteButton.click()
      await expect(page.getByTestId('team-empty')).toBeVisible()
    })
    const deleted = reqs.find(
      (r) => r.method === 'DELETE' && new RegExp(`/api/teams/${teamId}`).test(r.url),
    )
    expect(deleted, 'DELETE /api/teams/:id not observed').toBeTruthy()
    expect(deleted!.status).toBeLessThan(300)

    // Read-after-write — list must be empty.
    const list = await page.request.get(`${API_BASE}/teams`, { headers: apiHeaders(accessToken!) })
    const body = (await list.json()) as Array<{ id: string }>
    expect(body.find((t) => t.id === teamId)).toBeUndefined()
  })
})
