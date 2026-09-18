import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, api } from './_helpers.js'

test('Mark lesson complete writes a row and shows up in /progress', async ({ page }) => {
  await signup(page)
  const course = await api<{ id: string }>(page, 'POST', '/courses', { name: 'Lesson Course' })
  const lessonId = 'demo-lesson-' + Date.now()
  const r = await api<{ completed: boolean }>(
    page,
    'POST',
    `/courses/${course.id}/lessons/${lessonId}/complete`,
    {},
  )
  expect(r.completed).toBe(true)
  const progress = await api<{ completedLessonIds: string[] }>(
    page,
    'GET',
    `/courses/${course.id}/progress`,
  )
  expect(progress.completedLessonIds).toContain(lessonId)
})

test('Re-marking the same lesson is idempotent (no duplicate row)', async ({ page }) => {
  await signup(page)
  const course = await api<{ id: string }>(page, 'POST', '/courses', { name: 'Idempotent Course' })
  const lessonId = 'demo-lesson-' + Date.now()
  await api(page, 'POST', `/courses/${course.id}/lessons/${lessonId}/complete`, {})
  await api(page, 'POST', `/courses/${course.id}/lessons/${lessonId}/complete`, {})
  const progress = await api<{ completedLessonIds: string[] }>(
    page,
    'GET',
    `/courses/${course.id}/progress`,
  )
  expect(progress.completedLessonIds.filter((id) => id === lessonId)).toHaveLength(1)
})
