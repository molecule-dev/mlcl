import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { signup, getMe, listSpaces, createSpace, createPage } from './_helpers.js'

test.describe('smoke: end-to-end happy path', () => {
  test('signup → /me has default space + welcome page seeded', async ({ page }) => {
    const { accessToken, userId } = await signup(page)
    expect(accessToken.length).toBeGreaterThan(20)
    expect(userId).toBeTruthy()

    const me = await getMe(page, accessToken)
    expect(me.id).toBe(userId)
    expect(me.defaultSpace?.id).toBeTruthy()
    expect(me.stats.spaceCount).toBeGreaterThanOrEqual(1)

    const spaces = await listSpaces(page, accessToken)
    expect(spaces.length).toBeGreaterThanOrEqual(1)
  })

  test('create space + create page persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const space = await createSpace(page, accessToken, { name: 'Engineering' })
    const created = await createPage(page, accessToken, space.id, {
      title: 'A persistent doc',
      content: '# Heading\n\nSome body content.',
    })

    await page.goto(`/page/${created.id}`)
    await expect(page.getByTestId('page-view-title')).toHaveText('A persistent doc', {
      timeout: 15000,
    })

    await page.reload()
    await expect(page.getByTestId('page-view-title')).toHaveText('A persistent doc')
  })
})
