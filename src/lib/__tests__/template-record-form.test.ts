// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppReact from '@molecule/app-react'

const fixture = vi.hoisted(() => ({
  id: 'a',
  get: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  api: vi.fn(),
  navigate: vi.fn(),
  search: new URLSearchParams(),
  translate: (key: string, _values: unknown, options: { defaultValue?: string } = {}) =>
    options.defaultValue ?? key,
  user: { id: 'reader' },
}))
const http = { get: fixture.get, patch: fixture.patch, put: fixture.put }
vi.mock('@molecule/app-react', async (original) => ({
  ...(await original<typeof AppReact>()),
  useAuth: () => ({ user: fixture.user }),
  useHttpClient: () => http,
  useTranslation: () => ({ t: fixture.translate }),
}))
vi.mock('react-router', () => ({
  useParams: () => ({ id: fixture.id }),
  useNavigate: () => fixture.navigate,
  useSearchParams: () => [fixture.search],
  Link: ({ children }: { children: ReactNode }) => createElement('span', null, children),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      { cn: (...values: string[]) => values.join(' ') },
      {
        get: (target, key) => (key in target ? target[key as 'cn'] : () => ''),
      },
    ),
}))
vi.mock('@molecule/app-analytics', () => ({ track: vi.fn() }))
vi.mock('@molecule/app-markdown', () => ({
  requireProvider: () => ({ render: () => ({ html: '' }), sanitize: () => '' }),
}))
vi.mock('../../../templates/apps/course-marketplace/app/src/lib/api.js', () => ({
  api: fixture.api,
}))
vi.mock('../../../templates/apps/course-marketplace/app/src/components/LessonRow.js', () => ({
  LessonRow: () => null,
}))
vi.mock('../../../templates/apps/course-marketplace/app/src/components/UserMenu.js', () => ({
  UserMenu: () => null,
}))
vi.mock('../../../templates/apps/survey-feedback-tool/app/src/components/StatusPill.js', () => ({
  StatusPill: () => null,
}))
vi.mock('../../../templates/apps/document-collaboration/app/src/bonds/auth-default.js', () => ({
  authClient: { getState: () => ({ user: fixture.user }), getUser: () => fixture.user },
}))
vi.mock('../../../templates/apps/document-collaboration/app/src/lib/realtime.js', () => ({
  getRealtimeConnection: async () => {
    throw new Error('No realtime transport in this form test')
  },
}))
vi.mock(
  '../../../templates/apps/document-collaboration/app/src/components/DocumentVisibilityPill.js',
  () => ({ DocumentVisibilityPill: () => null }),
)
vi.mock('../../../templates/apps/online-store/app/src/components/AdminLayout.js', () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => children,
}))
vi.mock(
  '../../../templates/apps/online-store/app/src/components/AdminNotificationsSettingsCard.js',
  () => ({ default: () => null }),
)
vi.mock(
  '../../../templates/apps/online-store/app/src/components/AdminPaymentSettingsCard.js',
  () => ({ default: () => null }),
)
vi.mock(
  '../../../templates/apps/online-store/app/src/components/AdminSettingsPageHeader.js',
  () => ({ default: () => null }),
)
vi.mock('../../../templates/apps/online-store/app/src/components/AdminSettingsSaveBar.js', () => ({
  default: () => null,
}))
vi.mock(
  '../../../templates/apps/online-store/app/src/components/AdminSettingsTopNavBar.js',
  () => ({ default: () => null }),
)
vi.mock(
  '../../../templates/apps/online-store/app/src/components/AdminShippingSettingsCard.js',
  () => ({ default: () => null }),
)
vi.mock('../../../templates/apps/online-store/app/src/components/AdminTaxSettingsCard.js', () => ({
  default: () => null,
}))

import { PostEditorPage } from '../../../templates/.agents/skills/examples/content/markdown-blog/app/pages/admin/PostEditorPage.js'
import Lesson from '../../../templates/apps/course-marketplace/app/src/pages/Lesson.js'
import Editor from '../../../templates/apps/document-collaboration/app/src/pages/Editor.js'
import AdminSettingsPage from '../../../templates/apps/online-store/app/src/pages/AdminSettingsPage.js'
import Builder from '../../../templates/apps/survey-feedback-tool/app/src/pages/Builder.js'

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const value = (element: HTMLElement): string => (element as HTMLInputElement).value
const documentRow = (id: string): Record<string, unknown> => ({
  id,
  owner_id: 'reader',
  title: 'Document ' + id,
  content: { blocks: [] },
  version: 1,
  status: 'draft',
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
beforeEach(() => {
  fixture.id = 'a'
  fixture.user = { id: 'reader' }
  fixture.get.mockReset()
  fixture.patch.mockReset()
  fixture.put.mockReset()
  fixture.api.mockReset()
  const notes = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => notes.get(key) ?? null,
    setItem: (key: string, value: string) => notes.set(key, String(value)),
  })
})

describe('shipped forms hydrate and change record owners', () => {
  it('fills untouched properties of a record while preserving an edited property', async () => {
    const load = deferred<unknown>()
    fixture.get.mockReturnValue(load.promise)
    const view = render(createElement(AdminSettingsPage))
    const name = view.container.querySelector('[data-mol-id="input-store-name"]')!
    const url = view.container.querySelector('[data-mol-id="input-store-url"]')!
    fireEvent.change(name, { target: { value: 'My store draft' } })
    await act(async () =>
      load.resolve({
        data: {
          store: {
            storeName: 'Remote store',
            storeUrl: 'remote.test',
            storeDescription: 'Remote description',
            logoUrl: '',
          },
        },
      }),
    )
    expect(value(name)).toBe('My store draft')
    expect(value(url)).toBe('remote.test')
  })

  it('drops a previous prop-selected post draft before hydrating the next post', async () => {
    const post = (id: string): Record<string, unknown> => ({
      id,
      title: 'Post ' + id,
      slug: id,
      body_markdown: 'Body ' + id,
      draft: true,
    })
    const fetch = vi.fn(async (url: unknown) => ({
      ok: true,
      json: async () => post(String(url).endsWith('/a') ? 'a' : 'b'),
    }))
    vi.stubGlobal('fetch', fetch)
    const view = render(createElement(PostEditorPage, { slug: 'a' }))
    await act(async () => {})
    const title = screen.getByLabelText(/title/i)
    fireEvent.change(title, { target: { value: 'A draft' } })
    view.rerender(createElement(PostEditorPage, { slug: 'b' }))
    await act(async () => {})
    expect(value(screen.getByLabelText(/title/i))).toBe('Post b')
  })

  it('keeps lesson notes with their lesson while the next route is loading', async () => {
    const next = deferred<unknown>()
    fixture.api.mockImplementation(async (path: string) =>
      path === '/lessons/a'
        ? { id: 'a', course_id: 'course', title: 'Lesson A', duration_seconds: 0 }
        : path === '/lessons/b'
          ? next.promise
          : path.startsWith('/lessons/course')
            ? []
            : { id: 'course', title: 'Course' },
    )
    localStorage.setItem('lesson_notes:a', 'A saved note')
    localStorage.setItem('lesson_notes:b', 'B saved note')
    const view = render(createElement(Lesson))
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /notes/i }))
    fireEvent.change(screen.getByPlaceholderText(/notes/i), { target: { value: 'A edited note' } })
    fixture.id = 'b'
    view.rerender(createElement(Lesson))
    await act(async () => {})
    expect(localStorage.getItem('lesson_notes:a')).toBe('A edited note')
    expect(localStorage.getItem('lesson_notes:b')).toBe('B saved note')
    await act(async () =>
      next.resolve({ id: 'b', course_id: 'course', title: 'Lesson B', duration_seconds: 0 }),
    )
    expect(value(screen.getByPlaceholderText(/notes/i))).toBe('B saved note')
  })

  it('keeps notes when auth changes on the same lesson because their storage belongs to the lesson', async () => {
    fixture.api.mockImplementation(async (path: string) =>
      path === '/lessons/a'
        ? { id: 'a', course_id: 'course', title: 'Lesson A', duration_seconds: 0 }
        : path.startsWith('/lessons/course')
          ? []
          : { id: 'course', title: 'Course' },
    )
    localStorage.setItem('lesson_notes:a', 'Saved note')
    const view = render(createElement(Lesson))
    await act(async () => {})
    fixture.user = { id: 'another-reader' }
    view.rerender(createElement(Lesson))
    await act(async () => {})
    expect(localStorage.getItem('lesson_notes:a')).toBe('Saved note')
    fireEvent.click(screen.getByRole('button', { name: /notes/i }))
    expect(value(screen.getByPlaceholderText(/notes/i))).toBe('Saved note')
  })

  it('does not autosave a previous document draft into a newly selected document', async () => {
    const next = deferred<unknown>()
    fixture.get.mockImplementation(async (path: string) =>
      path === '/api/documents/a'
        ? { data: documentRow('a') }
        : path === '/api/documents/b'
          ? next.promise
          : { data: [] },
    )
    fixture.put.mockResolvedValue({ data: documentRow('b') })
    const view = render(createElement(Editor))
    await act(async () => {})
    fireEvent.change(screen.getByLabelText('Document title'), {
      target: { value: 'A unsaved draft' },
    })
    fixture.id = 'b'
    view.rerender(createElement(Editor))
    await act(async () => next.resolve({ data: documentRow('b') }))
    expect(value(screen.getByLabelText('Document title'))).toBe('Document b')
    // The earlier edit's debounce must not survive a route transition.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 850))
    })
    expect(fixture.put).not.toHaveBeenCalled()
  })

  it('persists a survey title on blur and keeps a newer edit when its save answers late', async () => {
    fixture.get.mockResolvedValue({
      data: {
        id: 'a',
        title: 'Original',
        description: '',
        status: 'draft',
        slug: 'a',
        questions: [],
      },
    })
    const saved = deferred<unknown>()
    fixture.patch.mockReturnValue(saved.promise)
    render(createElement(Builder))
    await act(async () => {})
    const title = screen.getByTestId('survey-title-input')
    fireEvent.change(title, { target: { value: 'First edit' } })
    fireEvent.blur(title)
    expect(fixture.patch).toHaveBeenCalledWith('/api/surveys/a', { title: 'First edit' })
    fireEvent.change(title, { target: { value: 'Newer draft' } })
    await act(async () => saved.resolve({ data: { title: 'First edit' } }))
    expect(value(title)).toBe('Newer draft')
  })
})
