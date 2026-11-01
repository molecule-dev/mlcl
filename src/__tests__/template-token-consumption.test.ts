// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  type RenderResult,
  screen,
  waitFor,
} from '@testing-library/react'
import React, { StrictMode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'

import { BrowserRouter } from '@molecule/app-routing-react-router'

const { post } = vi.hoisted(() => ({ post: vi.fn().mockRejectedValue(new Error('retry')) }))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, _values: unknown, options: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
  useHttpClient: () => ({ post }),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => '' }),
}))
vi.mock('@molecule/app-legal-pages-react', () => ({ LegalModalLinks: () => null }))
vi.mock('../../templates/apps/3d-model-viewer/app/src/config.js', () => ({ loadContent: () => '' }))

import { VerifyEmailPage } from '../../templates/.agents/skills/examples/auth/email-verification/app/pages/VerifyEmailPage.js'
import Reset from '../../templates/apps/3d-model-viewer/app/src/pages/ResetPassword.js'
import BlogReset from '../../templates/apps/blog/app/src/components/ResetPasswordForm.js'
import NewsletterReset from '../../templates/apps/newsletter/app/src/components/ResetPasswordForm.js'

let locationSearch = ''
let navigate: ReturnType<typeof useNavigate>
function Probe(): null {
  locationSearch = useLocation().search
  navigate = useNavigate()
  return null
}

afterEach((): void => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const begin = (): void =>
  window.history.replaceState(
    { safe: 'state' },
    '',
    '/reset-password?token=reset-secret&safe=byte%20value#section',
  )
const mount = (page: React.ReactNode): RenderResult =>
  render(
    React.createElement(
      StrictMode,
      null,
      React.createElement(BrowserRouter, null, React.createElement(Probe), page),
    ),
  )

it('retains a reset token through StrictMode and failed-submit retries', async () => {
  begin()
  mount(React.createElement(Reset))
  expect(window.location.search).not.toContain('reset-secret')

  fireEvent.change(document.querySelector('#password')!, { target: { value: 'GoodPass123!' } })
  fireEvent.change(document.querySelector('#confirm')!, { target: { value: 'GoodPass123!' } })
  fireEvent.submit(document.querySelector('form')!)
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  fireEvent.submit(document.querySelector('form')!)
  await waitFor(() => expect(post).toHaveBeenCalledTimes(2))

  expect(post.mock.calls.every((call) => call[1].token === 'reset-secret')).toBe(true)
  expect(window.location.hash).toBe('#section')
  expect(window.history.state.safe).toBe('state')
})

it('keeps Router and window locations in agreement after cleanup', () => {
  begin()
  mount(React.createElement(Reset))

  expect(window.location.search).not.toContain('reset-secret')
  expect(locationSearch).toBe(window.location.search)
})

it('retains the captured reset token through query-only navigation', async () => {
  begin()
  mount(React.createElement(Reset))
  await act(async () => {
    await navigate('?safe=2')
  })

  fireEvent.change(document.querySelector('#password')!, { target: { value: 'GoodPass123!' } })
  fireEvent.change(document.querySelector('#confirm')!, { target: { value: 'GoodPass123!' } })
  fireEvent.submit(document.querySelector('form')!)
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  expect(post.mock.calls[0][1].token).toBe('reset-secret')
})

for (const [name, Page] of [
  ['blog', BlogReset],
  ['newsletter', NewsletterReset],
] as const) {
  it(`${name} consumes and clears a reset token in its child form`, () => {
    begin()
    mount(React.createElement(Page))

    expect(document.querySelector('form')).not.toBeNull()
    expect(window.location.search).not.toContain('reset-secret')
  })
}

it('keeps the original email-verification token for retry after cleanup', async () => {
  begin()
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }))
  vi.stubGlobal('fetch', fetcher)
  mount(React.createElement(VerifyEmailPage))
  await waitFor(() => expect(screen.getByText('Could not check this link')).toBeTruthy())

  expect(window.location.search).not.toContain('reset-secret')
  const before = fetcher.mock.calls.length
  fireEvent.click(screen.getByText('Try again'))
  await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(before))
  expect(fetcher.mock.calls.every((call) => String(call[0]).includes('token=reset-secret'))).toBe(
    true,
  )
})

it('cleans a second token consumed on the same mounted reset route', async () => {
  begin()
  mount(React.createElement(Reset))

  await act(async () => {
    await navigate('/reset-password?token=second-link-secret&safe=2')
  })

  expect(window.location.search).not.toContain('second-link-secret')
})
