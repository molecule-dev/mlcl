import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, createBoard, signup } from './_helpers.js'

test.describe('backlog', () => {
  test('with no boards, the page guides the user to /boards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/backlog')
    await expect(page.getByText(/Backlog is empty/i)).toBeVisible()
  })

  test('hint text "Create a board first." renders before any board exists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/backlog')
    await expect(page.getByText(/Create a board first\./i)).toBeVisible()
  })

  test('GET /api/cards/backlog fires on load and returns an array', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/backlog')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const call = reqs.find((r) => /\/api\/cards\/backlog/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/cards/backlog should fire').toBeTruthy()
    expect(call!.status).toBeLessThan(300)
  })

  test('"Add to backlog" dialog opens with a Title field that accepts a value', async ({
    page,
  }) => {
    await signup(page)
    await createBoard(page, 'Backlog Source')
    await page.goto(APP_BASE + '/backlog')
    await page.getByTestId('backlog-empty-create').click()
    // Dialog renders a textarea (multiline=true). Locate via the dialog's textbox role.
    const dialog = page.getByRole('dialog', { name: /backlog/i })
    await expect(dialog).toBeVisible()
    const title = dialog.getByRole('textbox')
    await title.fill('Test backlog item')
    await expect(title).toHaveValue('Test backlog item')
  })

  test('creating a backlog item via the dialog persists as a list-less card', async ({ page }) => {
    await signup(page)
    const board = await createBoard(page, 'Backlog Source')
    await page.goto(APP_BASE + '/backlog')
    await expect(page.getByText(/Backlog is empty/i)).toBeVisible()

    await page.getByTestId('backlog-empty-create').click()
    await page.getByLabel(/^Title$/i).fill('Idea: nightly cron')

    // Arm the response listener BEFORE the click — `captureNetwork`'s
    // post-click polling was racing the response handler under load
    // (response arrived in a CDP frame the page.on listener missed by
    // the time waitForSelector resolved), producing spurious "POST
    // /api/cards should fire" failures even though the card persisted.
    const submit = page.getByRole('button', { name: /Add to backlog/i })
    await expect(submit).toBeEnabled()
    const postPromise = page.waitForResponse(
      (r) => r.url().endsWith('/api/cards') && r.request().method() === 'POST',
      { timeout: 20_000 },
    )
    await submit.click()
    const post = await postPromise
    expect(post.status()).toBe(201)
    await expect(page.getByText('Idea: nightly cron')).toBeVisible()

    const res = await page.request.get(API_BASE + '/cards/backlog')
    const list = await res.json()
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('Idea: nightly cron')
    expect(list[0].list_id).toBeNull()
    expect(list[0].board_id).toBe(board.id)
  })
})
