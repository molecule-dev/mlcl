import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, createArticle, createSpace, signup } from './_helpers.js'

test("Drafts page lists only the user's drafts", async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  await createArticle(page, {
    space_id: space.id,
    title: 'My draft',
    body_md: '# WIP',
    body_html: '<h1>WIP</h1>',
    status: 'draft',
  })
  await createArticle(page, {
    space_id: space.id,
    title: 'My published',
    body_md: '# Done',
    body_html: '<h1>Done</h1>',
    status: 'published',
  })

  await page.goto(APP_BASE + '/drafts')
  await expect(page.getByText('My draft')).toBeVisible()
  await expect(page.getByText('My published')).not.toBeVisible()
})

test('Drafts filter "Touched today" shows the recent draft', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  await createArticle(page, {
    space_id: space.id,
    title: 'Recent WIP',
    body_md: '# WIP',
    body_html: '<h1>WIP</h1>',
    status: 'draft',
  })
  await page.goto(APP_BASE + '/drafts')
  await page.getByRole('button', { name: /touched today/i }).click()
  await expect(page.getByText('Recent WIP')).toBeVisible()
})

test('Clicking a draft row navigates to the editor', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const a = await createArticle(page, {
    space_id: space.id,
    title: 'Edit me',
    body_md: 'hello',
    body_html: '<p>hello</p>',
    status: 'draft',
  })
  await page.goto(APP_BASE + '/drafts')
  await page.getByText('Edit me').click()
  await expect(page).toHaveURL(new RegExp(`/article/${a.id}/edit`))
})
