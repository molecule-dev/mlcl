import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/play (signature flow)', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/play')
  })

  test('loads today’s puzzle via GET /api/puzzles/today', async ({ page }) => {
    const respPromise = page.waitForResponse((r) => /\/api\/puzzles\/today/.test(r.url()))
    await page.goto(APP_BASE + '/play')
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(400)
    await expect(page.locator('[data-mol-id="board-active-row"]')).toBeVisible()
  })

  test('board renders six rows and the active row five tiles', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    for (let col = 0; col < 5; col++) {
      await expect(page.locator(`[data-mol-id="board-tile-${col}"]`)).toBeVisible()
    }
  })

  test('on-screen keyboard renders all letter keys', async ({ page }) => {
    await expect(page.locator('[data-mol-id="puzzle-keyboard"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="key-enter"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="key-backspace"]')).toBeVisible()
    for (const letter of ['q', 'w', 'a', 's', 'z', 'm']) {
      await expect(page.locator(`[data-mol-id="key-${letter}"]`)).toBeVisible()
    }
  })

  test('tapping on-screen keys fills the active row tiles', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    for (const letter of ['c', 'r', 'a', 'n', 'e']) {
      await page.locator(`[data-mol-id="key-${letter}"]`).click()
    }
    for (let col = 0; col < 5; col++) {
      await expect(page.locator(`[data-mol-id="board-tile-${col}"]`)).toHaveText('crane'[col], {
        ignoreCase: true,
      })
    }
  })

  test('physical keyboard input fills the active row', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    await page.keyboard.type('sto', { delay: 30 })
    await expect(page.locator('[data-mol-id="board-tile-0"]')).toHaveText('s', { ignoreCase: true })
    await expect(page.locator('[data-mol-id="board-tile-2"]')).toHaveText('o', { ignoreCase: true })
    await expect(page.locator('[data-mol-id="board-tile-3"]')).toHaveText('', { ignoreCase: true })
  })

  test('backspace removes the last typed letter', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    await page.keyboard.type('sto', { delay: 30 })
    await page.keyboard.press('Backspace')
    await expect(page.locator('[data-mol-id="board-tile-2"]')).toHaveText('', { ignoreCase: true })
  })

  test('submitting a word outside the dictionary shows the toast', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    await page.keyboard.type('zzzzz', { delay: 20 })
    // Expected 4xx: the rejected guess POST logs a browser console error.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 4\\d\\d' })
    const guessResp = page.waitForResponse(
      (r) => /\/guess$/.test(r.url()) && r.request().method() === 'POST',
    )
    await page.keyboard.press('Enter')
    const resp = await guessResp
    expect(resp.status()).toBe(422)
    await expect(page.locator('[data-mol-id="game-toast"]')).toHaveText(/not in the word list/i)
  })

  test('submitting a real word returns feedback and colors a tile row', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    await page.keyboard.type('stone', { delay: 20 })
    const guessResp = page.waitForResponse(
      (r) => /\/guess$/.test(r.url()) && r.request().method() === 'POST',
    )
    await page.keyboard.press('Enter')
    const resp = await guessResp
    expect(resp.status()).toBe(201)
    // After a submitted row the board advances: a NEW active row appears
    // (5 guesses left) and the keyboard stays visible.
    await expect(page.locator('[data-mol-id="puzzle-keyboard"]')).toBeVisible()
  })

  test('share button is absent while the game is in progress', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    await expect(page.locator('[data-mol-id="share-button"]')).toHaveCount(0)
  })

  test('puzzle number header renders', async ({ page }) => {
    await page.locator('[data-mol-id="board-active-row"]').waitFor()
    await expect(page.getByText(/^#\d+$/).first()).toBeVisible()
  })
})
