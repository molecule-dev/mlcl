// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppReact from '@molecule/app-react'

const fixture = vi.hoisted(() => ({
  user: { id: 'reader-a', name: 'Cached reader', email: 'cached@example.test' },
  get: vi.fn(),
}))
const http = { get: fixture.get, patch: vi.fn(async () => ({})) }
vi.mock('@molecule/app-react', async (original) => ({
  ...(await original<typeof AppReact>()),
  useAuth: () => ({ user: fixture.user }),
  useHttpClient: () => http,
  useTranslation: () => ({
    t: (_key: string, _values: unknown, options: { defaultValue?: string } = {}) =>
      options.defaultValue ?? _key,
  }),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      { cn: (...values: string[]) => values.join(' ') },
      { get: (value, key) => (key in value ? value[key as 'cn'] : () => '') },
    ),
}))
vi.mock('@molecule/app-ui-react', () => ({ LanguagePicker: () => null, ThemeToggle: () => null }))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsProfileSection.js', () => ({
  default: (props: {
    name: string
    email: string
    bio: string
    setName: (value: string) => void
    setEmail: (value: string) => void
    setBio: (value: string) => void
  }) =>
    createElement(
      'div',
      null,
      createElement('input', {
        'aria-label': 'Name',
        value: props.name,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setName(event.target.value),
      }),
      createElement('input', {
        'aria-label': 'Email',
        value: props.email,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          props.setEmail(event.target.value),
      }),
      createElement('input', {
        'aria-label': 'Bio',
        value: props.bio,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setBio(event.target.value),
      }),
    ),
}))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsAppearanceSection.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsDangerZoneSection.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsFormFooter.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsNotificationsSection.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsPageHeader.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsPrivacySection.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsSideNavBar.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/blog/app/src/components/SettingsTopNavBar.js', () => ({
  default: () => null,
}))

import Settings from '../../../templates/apps/blog/app/src/pages/Settings.js'

afterEach(cleanup)
beforeEach(() => {
  fixture.user = { id: 'reader-a', name: 'Cached reader', email: 'cached@example.test' }
  fixture.get.mockReset()
})

const loaded = (
  name = 'Server reader',
): {
  data: { id: string; name: string; email: string; preferences: Record<string, string | boolean> }
} => ({
  data: {
    id: fixture.user.id,
    name,
    email: 'server@example.test',
    preferences: {
      bio: 'Server bio',
      profileVisible: true,
      showEmail: false,
      newFollowers: true,
      commentsNotif: true,
      mentionsNotif: false,
      theme: 'light',
      fontSize: 'medium',
    },
  },
})

describe('the shipped blog edit form uses the shared dirty-preserving controller', () => {
  it('keeps an edit made before the request answers while filling pristine controls', async () => {
    let finish!: (value: ReturnType<typeof loaded>) => void
    fixture.get.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    render(createElement(Settings))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My draft' } })
    await act(async () => {
      finish(loaded())
    })
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('My draft')
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('server@example.test')
    expect((screen.getByLabelText('Bio') as HTMLInputElement).value).toBe('Server bio')
  })

  it('accepts a late value when the user has not edited the field', async () => {
    fixture.get.mockResolvedValue(loaded())
    render(createElement(Settings))
    await act(async () => {})
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Server reader')
  })

  it('starts a fresh form and load for a different record owner', async () => {
    fixture.get.mockResolvedValue(loaded())
    const view = render(createElement(Settings))
    await act(async () => {})
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Reader A draft' } })
    fixture.user = { id: 'reader-b', name: 'Reader B', email: 'b@example.test' }
    fixture.get.mockResolvedValue(loaded('Reader B on server'))
    view.rerender(createElement(Settings))
    await act(async () => {})
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Reader B on server')
    expect(fixture.get).toHaveBeenCalledTimes(2)
  })
})
