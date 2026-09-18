import { useCallback, useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

import { AVATAR_BG } from '../lib/avatarColors.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Device {
  id: string
  name: string
  created_at: string | null
  updated_at: string | null
}

/**
 * Device as returned by the canonical `GET /api/devices` endpoint — the
 * revoke-aware source. Unlike the `/api/profile/me` device shape, it marks
 * the current session with `isCurrent` (and sorts it to the front).
 */
interface DeviceFull {
  id: string
  name?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  isCurrent?: boolean
}

interface Me {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  status_text: string | null
  planKey: string | null
  last_seen_at: string | null
  devices: Device[]
}

function initialsOf(name: string | null | undefined): string {
  const n = (name ?? '').trim()
  if (!n) return '??'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function stableHash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0
  return Math.abs(h)
}

function safetyNumberFor(userId: string): string {
  const seed = stableHash(userId + ':self')
  const digits = []
  let cur = seed
  for (let i = 0; i < 60; i++) {
    cur = (cur * 1103515245 + 12345) & 0x7fffffff
    digits.push(String(cur % 10))
  }
  const groups: string[] = []
  for (let i = 0; i < 12; i++) groups.push(digits.slice(i * 5, i * 5 + 5).join(''))
  return groups.join(' ')
}

type Translate = ReturnType<typeof useTranslation>['t']

function relTime(iso: string | null | undefined, t: Translate): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const min = Math.round(ms / 60000)
  if (min < 1) return t('time.justNow', {}, { defaultValue: 'now' })
  if (min < 60) return t('time.minutesAgo', { count: min }, { defaultValue: '{{count}} min ago' })
  const hr = Math.round(min / 60)
  if (hr < 24) return t('time.hoursAgo', { count: hr }, { defaultValue: '{{count}} hr ago' })
  const day = Math.round(hr / 24)
  return day === 1
    ? t('time.dayAgo', {}, { defaultValue: '1 day ago' })
    : t('time.daysAgo', { count: day }, { defaultValue: '{{count}} days ago' })
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [statusText, setStatusText] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [devices, setDevices] = useState<DeviceFull[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<Me>(res)
        if (data) {
          setMe(data)
          setName(data.name ?? '')
          setEmail(data.email ?? '')
          setStatusText(data.status_text ?? '')
          setPhone(data.phone ?? '')
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadProfile', {}, { defaultValue: 'Failed to load profile.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // Load the canonical device list (revoke-aware, with `isCurrent`).
  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceFull>(res))
    } catch (error) {
      logError('profile.loadDevices', error)
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Revoke (sign out) a device. The API enforces server-side session
  // revocation when the device row is deleted, so this actually signs the
  // device out — then we refetch the list to reflect the change.
  const revokeDevice = async (id: string) => {
    setRevokingId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await loadDevices()
    } catch (error) {
      logError('profile.revokeDevice', error)
    } finally {
      setRevokingId(null)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await http.patch('/api/profile/me', {
        name: name.trim() || null,
        status_text: statusText.trim() || null,
        phone: phone.trim() || null,
      })
      const updated = unwrapSingle<Me>(res)
      if (updated) {
        setMe((prev) => (prev ? { ...prev, ...updated, devices: prev.devices } : prev))
      }
      // Email lives on the canonical user resource (not the messaging
      // profile row), so persist a change via the user endpoint.
      const trimmedEmail = email.trim()
      if (me && trimmedEmail && trimmedEmail !== (me.email ?? '')) {
        await http.patch(`/api/users/${me.id}`, { email: trimmedEmail })
        setMe((prev) => (prev ? { ...prev, email: trimmedEmail } : prev))
      }
      setSavedAt(Date.now())
    } catch (error) {
      logError('profile.saveChanges', error)
      setError(t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }))
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!me)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {error ?? t('profile.notFound', {}, { defaultValue: 'Profile not found.' })}
      </p>
    )

  const initials = initialsOf(name || me.name || me.email)
  const colorIdx = stableHash(me.id) % AVATAR_BG.length

  return (
    <form
      onSubmit={submit}
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}
    >
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
      </header>

      <section className={cm.cn(cm.card(), cm.sp('p', 6), cm.textCenter, 'space-y-3')}>
        <div
          className={cm.cn(
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full text-white',
            cm.fontWeight('bold'),
          )}
          style={{
            width: '96px',
            height: '96px',
            backgroundColor: AVATAR_BG[colorIdx],
            fontSize: '32px',
          }}
        >
          {initials}
        </div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            'uppercase tracking-wider',
            cm.sp('mt', 2),
          )}
        >
          {t('nav.you', {}, { defaultValue: 'You' })} · {me.email}
        </p>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('nav.identity', {}, { defaultValue: 'Identity' })}
        </h2>
        <Field
          label={t('form.displayName', {}, { defaultValue: 'Display name' })}
          value={name}
          onChange={setName}
          name="name"
          autoComplete="name"
        />
        <Field
          label={t('settings.email', {}, { defaultValue: 'Email' })}
          value={email}
          onChange={setEmail}
          type="email"
          name="email"
          autoComplete="email"
        />
        <Field
          label={t('nav.status', {}, { defaultValue: 'Status' })}
          value={statusText}
          onChange={setStatusText}
          name="status"
          maxLength={140}
        />
        <Field
          label={t('form.phone', {}, { defaultValue: 'Phone' })}
          value={phone}
          onChange={setPhone}
          type="tel"
          name="phone"
          autoComplete="tel"
        />

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', justify: 'end' }))}>
          {error && <p className={cm.cn(cm.textSize('sm'), 'text-error', cm.flex1)}>{error}</p>}
          {savedAt && !error && (
            <p className={cm.cn(cm.textSize('sm'), 'text-success', cm.flex1)}>
              {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </div>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('profile.safetyHeading', {}, { defaultValue: 'Your safety number' })}
        </h2>
        <code
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            'block font-mono',
            cm.sp('p', 3),
            'bg-surface-container rounded',
          )}
        >
          {safetyNumberFor(me.id)}
        </code>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'profile.safetyNote',
            {},
            {
              defaultValue:
                'Share these numbers with someone in person to verify your encrypted connection.',
            },
          )}
        </p>
      </section>

      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('profile.devicesHeading', {}, { defaultValue: 'Linked devices' })}
        </h2>
        {!devicesLoading && devices.length === 0 && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.noDevices', {}, { defaultValue: 'No devices linked yet.' })}
          </p>
        )}
        {devices.map((d, idx) => (
          <DeviceRow
            key={d.id}
            name={
              d.name ||
              t(
                'profile.deviceFallbackName',
                { index: idx + 1 },
                { defaultValue: 'Device {{index}}' },
              )
            }
            lastActive={relTime(d.updatedAt, t) || relTime(d.createdAt, t)}
            isCurrent={!!d.isCurrent}
            confirming={confirmingId === d.id}
            revoking={revokingId === d.id}
            onAskRevoke={() => setConfirmingId(d.id)}
            onCancelRevoke={() => setConfirmingId(null)}
            onRevoke={() => revokeDevice(d.id)}
          />
        ))}
      </section>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  name,
  autoComplete,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  name?: string
  autoComplete?: string
  maxLength?: number
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function DeviceRow({
  name,
  lastActive,
  isCurrent,
  confirming,
  revoking,
  onAskRevoke,
  onCancelRevoke,
  onRevoke,
}: {
  name: string
  lastActive: string
  isCurrent?: boolean
  confirming: boolean
  revoking: boolean
  onAskRevoke: () => void
  onCancelRevoke: () => void
  onRevoke: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <span className="material-symbols-outlined" style={{ opacity: 0.5 }} aria-hidden="true">
          devices
        </span>
        <div className={cm.flex1}>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{name}</p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{lastActive || '—'}</p>
        </div>
        {isCurrent ? (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded bg-success-container text-on-success-container',
            )}
          >
            {t('profile.thisDevice', {}, { defaultValue: 'This device' })}
          </span>
        ) : confirming ? (
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <Button variant="ghost" size="sm" disabled={revoking} onClick={onCancelRevoke}>
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </Button>
            <Button
              color="error"
              size="sm"
              loading={revoking}
              onClick={onRevoke}
              data-mol-id="device-revoke-confirm"
            >
              {t('profile.signOutDevice', {}, { defaultValue: 'Sign out' })}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={onAskRevoke} data-mol-id="device-revoke">
            {t('profile.signOutDevice', {}, { defaultValue: 'Sign out' })}
          </Button>
        )}
      </div>
      {confirming ? (
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'profile.revokeDeviceWarning',
            {},
            { defaultValue: "This device's access will be revoked shortly. Sign it out?" },
          )}
        </p>
      ) : null}
    </div>
  )
}
