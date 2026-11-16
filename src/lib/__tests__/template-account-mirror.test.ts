// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AppReact from '@molecule/app-react'

const fixture = vi.hoisted(() => ({
  user: {
    id: 'account-a',
    name: 'Account A',
    email: 'a@example.test',
    oauthData: { phone: 'Cached phone' },
  },
  get: vi.fn(),
  translate: (key: string, _values: unknown, options: { defaultValue?: string } = {}) =>
    options.defaultValue ?? key,
}))
const http = { get: fixture.get }
vi.mock('@molecule/app-react', async (original) => ({
  ...(await original<typeof AppReact>()),
  useAuth: () => ({ user: fixture.user }),
  useHttpClient: () => http,
  useTranslation: () => ({ t: fixture.translate }),
}))
vi.mock('react-router', () => ({ useNavigate: () => () => {} }))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      { cn: (...values: string[]) => values.join(' ') },
      { get: (target, key) => (key in target ? target[key as 'cn'] : () => '') },
    ),
}))
vi.mock('@molecule/app-ui-react', () => ({ LanguagePicker: () => null, ThemeToggle: () => null }))
vi.mock('@molecule/app-settings-panel-react', () => ({ NotificationsSection: () => null }))
vi.mock('../../../templates/apps/online-store/app/src/components/SettingsProfileCard.js', () => ({
  default: (props: { phone: string; setPhone: (value: string) => void }) =>
    createElement('input', {
      'aria-label': 'Phone',
      value: props.phone,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.setPhone(event.target.value),
    }),
}))
vi.mock(
  '../../../templates/apps/online-store/app/src/components/SettingsAnnouncementBar.js',
  () => ({ default: () => null }),
)
vi.mock('../../../templates/apps/online-store/app/src/components/SettingsDangerZone.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/online-store/app/src/components/SettingsDevicesCard.js', () => ({
  default: () => null,
}))
vi.mock(
  '../../../templates/apps/online-store/app/src/components/SettingsNotificationsCard.js',
  () => ({ default: () => null }),
)
vi.mock('../../../templates/apps/online-store/app/src/components/SettingsPageHeader.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/online-store/app/src/components/SettingsPasswordCard.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/online-store/app/src/components/SettingsSideNav.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/online-store/app/src/components/SettingsTopNavBar.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/online-store/app/src/components/SettingsTwoFactorCard.js', () => ({
  default: () => null,
}))
vi.mock('../../../templates/apps/online-store/app/src/components/StoreFooter.js', () => ({
  default: () => null,
}))

import Settings from '../../../templates/apps/online-store/app/src/pages/Settings.js'
afterEach(cleanup)
beforeEach(() => {
  fixture.user = {
    id: 'account-a',
    name: 'Account A',
    email: 'a@example.test',
    oauthData: { phone: 'Cached phone' },
  }
  fixture.get.mockReset().mockResolvedValue({ data: {} })
})
describe('account snapshots refill the shipped store profile form', () => {
  it('keeps an edited phone when a same-account auth snapshot refreshes', async () => {
    const view = render(createElement(Settings))
    await act(async () => {})
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: 'My phone draft' } })
    fixture.user = { ...fixture.user, oauthData: { phone: 'Refreshed phone' } }
    view.rerender(createElement(Settings))
    await act(async () => {})
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('My phone draft')
  })
  it('starts a new phone draft when the account identity changes', async () => {
    const view = render(createElement(Settings))
    await act(async () => {})
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: 'A draft' } })
    fixture.user = {
      id: 'account-b',
      name: 'Account B',
      email: 'b@example.test',
      oauthData: { phone: 'B phone' },
    }
    view.rerender(createElement(Settings))
    await act(async () => {})
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('B phone')
  })
})
