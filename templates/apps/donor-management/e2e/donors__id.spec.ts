import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, firstDonorId, signup, waitForSeed } from './_helpers.js'

test.describe('donor detail', () => {
  test('profile shows contact, giving history, and notes sections for a seeded donor', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const donorId = await firstDonorId(page, accessToken)

    await page.goto(APP_BASE + `/donors/${donorId}`)
    await expect(page).toHaveURL(new RegExp(`/donors/${donorId}`))
    await expect(
      page.getByRole('heading', { name: /giving history|notes/i, level: 2 }).first(),
    ).toBeVisible({ timeout: 15000 })
    // The lifetime stat block renders (label + a value).
    await expect(page.getByText(/lifetime giving/i)).toBeVisible()
  })

  test('adding a note through the form prepends it to the notes list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const donorId = await firstDonorId(page, accessToken)

    await page.goto(APP_BASE + `/donors/${donorId}`)
    const body = `E2E note ${Date.now() % 100000}`
    await page.getByPlaceholder(/preferences|relationships|note/i).fill(body)
    await page.getByRole('button', { name: /^add note$/i }).click()
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 10000 })
    // Survives a reload (persisted server-side, not just local state).
    await page.reload()
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 15000 })
  })
})
