import { useEffect, useState } from 'react'

import { useHttpClient, usePush, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProfileResponse {
  preferences: {
    emailNotifications?: boolean
    pushNotifications?: boolean
    dailyLogReminders?: boolean
    rfiUpdates?: boolean
    punchUpdates?: boolean
  }
}

function NotificationsSettingsSection() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const { requestPermission, register, unregister } = usePush()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [dailyLogReminders, setDailyLogReminders] = useState(true)
  const [rfiUpdates, setRfiUpdates] = useState(true)
  const [punchUpdates, setPunchUpdates] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const cm = getClassMap()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await http.get<ProfileResponse>('/api/profile/me')
        const data =
          (res as unknown as { data?: ProfileResponse }).data ?? (res as unknown as ProfileResponse)
        if (cancelled) return
        const p = data.preferences ?? {}
        if (typeof p.emailNotifications === 'boolean') setEmailNotifications(p.emailNotifications)
        if (typeof p.pushNotifications === 'boolean') setPushNotifications(p.pushNotifications)
        if (typeof p.dailyLogReminders === 'boolean') setDailyLogReminders(p.dailyLogReminders)
        if (typeof p.rfiUpdates === 'boolean') setRfiUpdates(p.rfiUpdates)
        if (typeof p.punchUpdates === 'boolean') setPunchUpdates(p.punchUpdates)
      } catch (_error) {
        // ignore — defaults remain
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const handlePushToggle = async (next: boolean) => {
    setPushNotifications(next)
    try {
      if (next) {
        await requestPermission()
        await register()
      } else {
        await unregister()
      }
    } catch (_error) {
      // Browser permission denied or service worker unavailable — keep prior visual state.
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)
    try {
      await http.patch('/api/profile/me', {
        preferences: {
          emailNotifications,
          pushNotifications,
          dailyLogReminders,
          rfiUpdates,
          punchUpdates,
        },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save preferences', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={cm.cn(cm.sp('p', 10), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }), 'md:flex-row')}>
        <div className={cm.cn(cm.w('full'), cm.stack(2), 'md:w-1/3')}>
          <h3
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-on-background tracking-tight',
            )}
          >
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'notificationsSettings.description',
              {},
              { defaultValue: 'Control how you receive updates and activity alerts.' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.w('full'), cm.stack(8), 'md:w-2/3')}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}>
            <div>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-background')}>
                {t('notificationsSettings.emailLabel', {}, { defaultValue: 'Email Notifications' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'notificationsSettings.emailDescription',
                  {},
                  { defaultValue: 'Receive RFI digests and daily-log summaries via email.' },
                )}
              </p>
            </div>
            <label
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.cursorPointer,
                'relative inline-flex',
              )}
            >
              <input
                aria-label={t(
                  'notificationsSettings.emailLabel',
                  {},
                  { defaultValue: 'Email Notifications' },
                )}
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className={cm.cn('sr-only peer')}
                type="checkbox"
              />
              <div
                className={cm.cn(
                  cm.h(6),
                  cm.roundedFull,
                  "w-11 bg-surface-container-highest peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
                )}
              ></div>
            </label>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}>
            <div>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-background')}>
                {t('notificationsSettings.pushLabel', {}, { defaultValue: 'Push Notifications' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'notificationsSettings.pushDescription',
                  {},
                  { defaultValue: 'Real-time alerts on your browser or mobile device.' },
                )}
              </p>
            </div>
            <label
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.cursorPointer,
                'relative inline-flex',
              )}
            >
              <input
                aria-label={t(
                  'notificationsSettings.pushLabel',
                  {},
                  { defaultValue: 'Push Notifications' },
                )}
                checked={pushNotifications}
                onChange={(e) => handlePushToggle(e.target.checked)}
                className={cm.cn('sr-only peer')}
                type="checkbox"
              />
              <div
                className={cm.cn(
                  cm.h(6),
                  cm.roundedFull,
                  "w-11 bg-surface-container-highest peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
                )}
              ></div>
            </label>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}>
            <div>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-background')}>
                {t('notificationsSettings.punchLabel', {}, { defaultValue: 'Punch-List Updates' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'notificationsSettings.punchDescription',
                  {},
                  { defaultValue: 'Notify me when a punch item is assigned or closed.' },
                )}
              </p>
            </div>
            <label
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.cursorPointer,
                'relative inline-flex',
              )}
            >
              <input
                aria-label={t(
                  'notificationsSettings.punchLabel',
                  {},
                  { defaultValue: 'Punch-List Updates' },
                )}
                checked={punchUpdates}
                onChange={(e) => setPunchUpdates(e.target.checked)}
                className={cm.cn('sr-only peer')}
                type="checkbox"
              />
              <div
                className={cm.cn(
                  cm.h(6),
                  cm.roundedFull,
                  "w-11 bg-surface-container-highest peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
                )}
              ></div>
            </label>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}>
            <div>
              <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-background')}>
                {t('notificationsSettings.rfiLabel', {}, { defaultValue: 'RFI updates' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'notificationsSettings.rfiDescription',
                  {},
                  { defaultValue: 'Notify me when an RFI is answered or closed.' },
                )}
              </p>
            </div>
            <label
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.cursorPointer,
                'relative inline-flex',
              )}
            >
              <input
                aria-label={t(
                  'notificationsSettings.rfiLabel',
                  {},
                  { defaultValue: 'RFI updates' },
                )}
                checked={rfiUpdates}
                onChange={(e) => setRfiUpdates(e.target.checked)}
                className={cm.cn('sr-only peer')}
                type="checkbox"
              />
              <div
                className={cm.cn(
                  cm.h(6),
                  cm.roundedFull,
                  "w-11 bg-surface-container-highest peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
                )}
              ></div>
            </label>
          </div>
          <div
            className={cm.cn(
              cm.sp('pt', 8),
              cm.flex({ justify: 'end', align: 'center', gap: 'md' }),
            )}
          >
            {saved && (
              <span
                className={cm.cn(cm.textSize('sm'), 'text-success')}
                role="status"
                data-testid="notifications-saved"
              >
                {t('common.saved', {}, { defaultValue: 'Saved' })}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-lg text-on-primary brand-gradient active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {loading
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('notificationsSettings.saveButton', {}, { defaultValue: 'Save Preferences' })}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default NotificationsSettingsSection
export { NotificationsSettingsSection }
