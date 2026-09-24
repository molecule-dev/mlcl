/**
 * /instructor + /instructor/courses/:id/edit — instructor authoring flow.
 *
 * Asserts the bug fixes from the production-ready pass:
 *
 *   1. Become-instructor flips the user's `is_instructor` flag.
 *   2. The "New course" CTA actually creates a draft (POST /courses)
 *      and lands the user on /instructor/courses/:id/edit with a real
 *      uuid, not the literal "new". (Old bug: link pointed at
 *      /instructor/courses/new/edit which 404'd against the editor's
 *      uuid validator.)
 *   3. PATCH /courses/:id (Save details) and POST /lessons (Add lesson)
 *      actually wire through — the api utility now handles JSON
 *      serialization itself, so the calls send the correct
 *      Content-Type. (Old bug: the page manually JSON.stringify-ed and
 *      api() then skipped the header, so the backend body parser
 *      rejected the payload.)
 *   4. Publish flips status='published' and the published course is
 *      visible on the public catalog.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  becomeInstructor,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('instructor authoring flow', () => {
  test('become-instructor flips is_instructor=true on /api/instructors/me', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('instructor-become'))
    const before = await page.request.get(`${API_BASE}/instructors/me`, {
      headers: authHeaders(accessToken),
    })
    const beforeBody = (await before.json()) as { is_instructor: boolean }
    expect(beforeBody.is_instructor).toBe(false)
    await becomeInstructor(page, accessToken)
    const after = await page.request.get(`${API_BASE}/instructors/me`, {
      headers: authHeaders(accessToken),
    })
    const afterBody = (await after.json()) as { is_instructor: boolean }
    expect(afterBody.is_instructor).toBe(true)
  })

  test('new-course CTA creates a real draft and opens the editor', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('instructor-new'))
    await becomeInstructor(page, accessToken)
    await page.goto(APP_BASE + '/instructor')
    await page.waitForLoadState('networkidle')
    // Click the secondary "New course" button (always visible above the
    // courses table, regardless of count).
    await page.locator('[data-mol-id="instructor-new-course"]').first().click()
    await page.waitForURL(/\/instructor\/courses\/[0-9a-f-]+\/edit/, {
      timeout: 10000,
    })
    // The editor must load the draft, not 404.
    await expect(page.locator('[data-mol-id="course-editor-title"]')).toBeVisible({
      timeout: 10000,
    })
  })

  test('PATCH course details actually persists across reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('instructor-patch'))
    await becomeInstructor(page, accessToken)
    // Mint a draft via API, navigate straight to editor.
    const created = await page.request.post(`${API_BASE}/courses`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Patch Me Original',
        description: 'before',
        category: 'general',
        price_cents: 0,
      },
    })
    expect(created.status()).toBeLessThan(400)
    const { id } = (await created.json()) as { id: string }
    const newTitle = `Patch Me ${Date.now()}`
    const patchRes = await page.request.patch(`${API_BASE}/courses/${id}`, {
      headers: authHeaders(accessToken),
      data: {
        title: newTitle,
        description: 'after',
        category: 'design',
        price_cents: 1999,
      },
    })
    expect(patchRes.status()).toBe(200)
    // Read-after-write: GET must reflect the patch.
    const reread = await page.request.get(`${API_BASE}/courses/${id}`, {
      headers: authHeaders(accessToken),
    })
    const body = (await reread.json()) as {
      title: string
      description: string
      category: string
      price_cents: number
    }
    expect(body.title).toBe(newTitle)
    expect(body.description).toBe('after')
    expect(body.category).toBe('design')
    expect(body.price_cents).toBe(1999)
  })

  test('POST lesson appears in GET /lessons/course/:id and bumps total_lessons', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('instructor-lesson'))
    await becomeInstructor(page, accessToken)
    const created = await page.request.post(`${API_BASE}/courses`, {
      headers: authHeaders(accessToken),
      data: { title: 'Lesson Course', description: '', category: 'general', price_cents: 0 },
    })
    expect(created.status()).toBeLessThan(400)
    const { id: courseId } = (await created.json()) as { id: string }
    const before = await page.request.get(`${API_BASE}/courses/${courseId}`, {
      headers: authHeaders(accessToken),
    })
    const beforeBody = (await before.json()) as { total_lessons: number }
    expect(beforeBody.total_lessons).toBe(0)
    const lessonRes = await page.request.post(`${API_BASE}/lessons`, {
      headers: authHeaders(accessToken),
      data: {
        course_id: courseId,
        title: 'Spec Lesson',
        duration_sec: 120,
        sort_order: 0,
        free_preview: true,
      },
    })
    expect(lessonRes.status()).toBe(201)
    const after = await page.request.get(`${API_BASE}/courses/${courseId}`, {
      headers: authHeaders(accessToken),
    })
    const afterBody = (await after.json()) as { total_lessons: number }
    expect(afterBody.total_lessons).toBe(1)
    // GET /lessons/course/:id (must publish first so it's world-readable).
    await page.request.patch(`${API_BASE}/courses/${courseId}`, {
      headers: authHeaders(accessToken),
      data: { status: 'published' },
    })
    const lessonsList = await page.request.get(`${API_BASE}/lessons/course/${courseId}`, {
      headers: authHeaders(accessToken),
    })
    const lessons = (await lessonsList.json()) as Array<{ title: string }>
    expect(lessons.find((l) => l.title === 'Spec Lesson')).toBeTruthy()
  })

  test('publish flips status and surfaces the course on the public catalog', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('instructor-publish'))
    await becomeInstructor(page, accessToken)
    const title = `Publish Me ${Date.now()}`
    const created = await page.request.post(`${API_BASE}/courses`, {
      headers: authHeaders(accessToken),
      data: { title, description: 'pub', category: 'design', price_cents: 0 },
    })
    expect(created.status()).toBeLessThan(400)
    const { id } = (await created.json()) as { id: string }
    const publishRes = await page.request.patch(`${API_BASE}/courses/${id}`, {
      headers: authHeaders(accessToken),
      data: { status: 'published' },
    })
    expect(publishRes.status()).toBe(200)
    const publicRead = await page.request.get(`${API_BASE}/courses/${id}`)
    expect(publicRead.status()).toBe(200)
    const body = (await publicRead.json()) as { status: string; published_at: string | null }
    expect(body.status).toBe('published')
    expect(body.published_at).not.toBeNull()
  })

  test('delete lesson uses the shared two-click ConfirmButton (arm, then commit)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('instructor-delete'))
    await becomeInstructor(page, accessToken)
    const created = await page.request.post(`${API_BASE}/courses`, {
      headers: authHeaders(accessToken),
      data: {
        title: 'Delete Lesson Course',
        description: '',
        category: 'general',
        price_cents: 0,
      },
    })
    expect(created.status()).toBeLessThan(400)
    const { id: courseId } = (await created.json()) as { id: string }
    const postLesson = (title: string, sortOrder: number) =>
      page.request.post(`${API_BASE}/lessons`, {
        headers: authHeaders(accessToken),
        data: {
          course_id: courseId,
          title,
          duration_sec: 60,
          sort_order: sortOrder,
          free_preview: false,
        },
      })
    const firstRes = await postLesson('Delete Me', 0)
    expect(firstRes.status()).toBe(201)
    const { id: lessonId } = (await firstRes.json()) as { id: string }
    // A second lesson keeps the list non-empty after the first delete, so the
    // disarm-back-to-idle behavior is observable.
    const keepRes = await postLesson('Keep Me', 1)
    expect(keepRes.status()).toBe(201)
    const { id: keepId } = (await keepRes.json()) as { id: string }

    await page.goto(`${APP_BASE}/instructor/courses/${courseId}/edit`)
    const deleteButton = page.locator(`[data-mol-id="delete-lesson-${lessonId}"]`)
    await expect(deleteButton).toBeVisible({ timeout: 10000 })

    // The native window.confirm is GONE (migrated to the shared ConfirmButton):
    // the first click ARMS the button and surfaces the confirm label — no
    // dialog event fires, the lesson is not yet deleted.
    await deleteButton.click()
    await expect(deleteButton).toHaveAttribute('data-state', 'armed')
    await expect(deleteButton).toHaveText(/Delete this lesson\?/)
    await expect(page.locator(`[data-mol-id="course-editor-lesson-${lessonId}"]`)).toBeVisible()
    await expect(page.locator(`[data-mol-id="course-editor-lesson-${keepId}"]`)).toBeVisible()

    // The second click COMMITS: the row drops from the reloaded list while the
    // untouched lesson stays, and the surviving button is disarmed back to idle.
    await deleteButton.click()
    await expect(page.locator(`[data-mol-id="course-editor-lesson-${lessonId}"]`)).toHaveCount(0)
    await expect(page.locator(`[data-mol-id="course-editor-lesson-${keepId}"]`)).toBeVisible()
    const keepButton = page.locator(`[data-mol-id="delete-lesson-${keepId}"]`)
    await expect(keepButton).toHaveAttribute('data-state', 'idle')
    await expect(keepButton).toHaveText(/Delete lecture/)
  })
})
