import { useCallback, useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface IntegrationDef {
  key: string
  name: string
  category: 'Calendar' | 'Video'
  descriptionDefault: string
  icon: string
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    key: 'google_calendar',
    name: 'Google Calendar',
    category: 'Calendar',
    descriptionDefault:
      'Auto-import upcoming meetings; one-click join with {{appName}} as a participant.',
    icon: 'event',
  },
  {
    key: 'outlook',
    name: 'Microsoft Outlook',
    category: 'Calendar',
    descriptionDefault: 'Pulls events from Exchange/Office 365.',
    icon: 'event_available',
  },
  {
    key: 'zoom',
    name: 'Zoom',
    category: 'Video',
    descriptionDefault: '{{appName}} joins as a meeting bot to capture transcript and audio.',
    icon: 'video_camera_front',
  },
  {
    key: 'google_meet',
    name: 'Google Meet',
    category: 'Video',
    descriptionDefault: 'Same flow as Zoom — auto-join scheduled Meet links.',
    icon: 'duo',
  },
  {
    key: 'teams',
    name: 'Microsoft Teams',
    category: 'Video',
    descriptionDefault: 'OAuth required; supports Teams Meeting + scheduled meetings.',
    icon: 'groups',
  },
]

interface IntegrationState {
  connected: boolean
  connectedAt?: string
}

/**
 * Server-side settings channel (`/api/settings/me`). The platform user
 * resource never returns `oauthData` on reads, so integration states MUST
 * round-trip through this channel — hydrating from GET /api/users/:id would
 * silently reset every card to "Not connected" on each load.
 */
interface IntegrationsMeResponse {
  id: string
  integrations?: Record<string, IntegrationState>
}

export function Integrations() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [states, setStates] = useState<Record<string, IntegrationState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<IntegrationsMeResponse>('/api/settings/me')
      const stored = res.data?.integrations ?? {}
      setStates(stored)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('integrations.loadError', {}, { defaultValue: 'Failed to load integrations.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const flash = (msg: string) => {
    setStatusMessage(msg)
    window.setTimeout(() => setStatusMessage((cur) => (cur === msg ? null : cur)), 3000)
  }

  const toggle = async (key: string) => {
    const current = states[key]
    const nextStateBool = !current?.connected
    setPending(key)
    try {
      // Send ONLY the toggled key — the server merges the slice, so other
      // integrations (and the profile/settings slices) cannot be clobbered.
      const nextEntry: IntegrationState = nextStateBool
        ? { connected: true, connectedAt: new Date().toISOString() }
        : { connected: false }
      await http.patch<IntegrationsMeResponse>('/api/settings/me', {
        integrations: { [key]: nextEntry },
      })
      setStates((prev) => ({ ...prev, [key]: nextEntry }))
      flash(
        nextStateBool
          ? t('status.connected', { name: key }, { defaultValue: 'Connected' })
          : t('integrations.disconnected', { name: key }, { defaultValue: 'Disconnected' }),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('integrations.updateError', {}, { defaultValue: 'Update failed.' }),
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <div
      data-mol-id="integrations-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}
    >
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'integrations.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Connect calendars and video platforms so {{appName}} joins automatically.',
            },
          )}
        </p>
      </header>

      {statusMessage ? (
        <p
          data-mol-id="integrations-status"
          role="status"
          className={cm.cn(cm.textSize('sm'), 'text-success')}
        >
          {statusMessage}
        </p>
      ) : null}
      {error ? (
        <p
          data-mol-id="integrations-error"
          role="alert"
          className={cm.cn(cm.textSize('sm'), 'text-error')}
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        (['Calendar', 'Video'] as const).map((group) => (
          <section key={group}>
            <h2 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
              {t(`integrations.category.${group.toLowerCase()}`, {}, { defaultValue: group })}
            </h2>
            <ul className={cm.grid({ cols: 3, gap: 'md' })}>
              {INTEGRATIONS.filter((i) => i.category === group).map((i) => {
                const isConnected = !!states[i.key]?.connected
                const isPending = pending === i.key
                return (
                  <li
                    key={i.key}
                    data-mol-id={`integration-card-${i.key}`}
                    data-status={isConnected ? 'connected' : 'not_connected'}
                    className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
                  >
                    <header className={cm.flex({ align: 'center', justify: 'between' })}>
                      <span
                        className="material-symbols-outlined text-3xl text-primary"
                        aria-hidden="true"
                      >
                        {i.icon}
                      </span>
                      <span
                        data-mol-id={`integration-status-${i.key}`}
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.roundedFull,
                          isConnected
                            ? 'bg-success/15 text-success'
                            : cm.cn('bg-surface-container', 'text-on-surface-variant'),
                        )}
                      >
                        {isConnected
                          ? t('status.connected', {}, { defaultValue: 'Connected' })
                          : t(
                              'integrations.notConnectedTag',
                              {},
                              { defaultValue: 'Not connected' },
                            )}
                      </span>
                    </header>
                    <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                      {i.name}
                    </h3>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        `integrations.${i.key}.description`,
                        { appName: APP_NAME },
                        { defaultValue: i.descriptionDefault },
                      )}
                    </p>
                    <button
                      type="button"
                      data-mol-id={`integration-toggle-${i.key}`}
                      disabled={isPending}
                      onClick={() => void toggle(i.key)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('medium'),
                        'border border-outline rounded-md hover:bg-surface-container w-full disabled:opacity-50',
                      )}
                    >
                      {isPending
                        ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                        : isConnected
                          ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                          : t('common.connect', {}, { defaultValue: 'Connect' })}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
