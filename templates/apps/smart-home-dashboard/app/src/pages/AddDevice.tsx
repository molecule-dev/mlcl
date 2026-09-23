import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const DEVICE_TYPES = ['light', 'thermostat', 'lock', 'camera', 'sensor', 'outlet'] as const

type DeviceType = (typeof DEVICE_TYPES)[number]

interface DeviceCreated {
  id: string
}

interface DevicePayload {
  name?: string
  type?: string
  room?: string | null
  manufacturer?: string | null
  model?: string | null
  firmware_version?: string | null
}

function unwrapCreated(payload: unknown): DeviceCreated | null {
  if (!payload || typeof payload !== 'object') return null
  if ('id' in payload && typeof (payload as { id: unknown }).id === 'string') {
    return payload as DeviceCreated
  }
  if ('data' in payload && (payload as { data?: unknown }).data) {
    const inner = (payload as { data: unknown }).data
    if (inner && typeof inner === 'object' && 'id' in inner) return inner as DeviceCreated
  }
  return null
}

export function AddDevice() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [type, setType] = useState<DeviceType>('light')
  const [room, setRoom] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [firmware, setFirmware] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(
        t(
          'addDevice.error.nameRequired',
          {},
          { defaultValue: 'Give this device a name to continue.' },
        ),
      )
      return
    }
    setSubmitting(true)
    setError(null)
    const payload: DevicePayload = {
      name: name.trim(),
      type,
      room: room.trim() || null,
      manufacturer: manufacturer.trim() || null,
      model: model.trim() || null,
      firmware_version: firmware.trim() || null,
    }
    try {
      const response = await http.post('/api/iot-devices', payload)
      track({
        name: 'device.added',
        properties: {
          device_id: unwrapCreated(response)?.id ?? null,
          device_type: payload.type ?? null,
        },
      })
      const created = unwrapCreated(response)
      if (created?.id) {
        navigate(`/devices/${created.id}`)
      } else {
        navigate('/rooms')
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(
              'addDevice.error.failed',
              {},
              { defaultValue: 'Could not add the device. Try again.' },
            )
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('3xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <Link
          to="/rooms"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary hover:underline',
          )}
        >
          <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
            chevron_left
          </span>
          {t('settings.devices', {}, { defaultValue: 'Devices' })}
        </Link>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('addDevice.heading', {}, { defaultValue: 'Add a device' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'addDevice.subheading',
            {},
            {
              defaultValue:
                'Pair a new light, thermostat, lock, camera, sensor, or outlet to your hub.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-2xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      ) : null}

      <form
        aria-label={t('addDevice.formLabel', {}, { defaultValue: 'Add a device' })}
        onSubmit={handleSubmit}
        className={cm.cn(cm.sp('p', 6), cm.stack(5), 'bg-surface-container-lowest rounded-2xl')}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="device-name"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.name', {}, { defaultValue: 'Name' })}
          </label>
          <input
            id="device-name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t(
              'addDevice.placeholder.name',
              {},
              { defaultValue: 'Living-room ceiling lights' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
            )}
          />
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="device-type"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.type', {}, { defaultValue: 'Type' })}
          </label>
          <select
            id="device-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as DeviceType)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
            )}
          >
            {DEVICE_TYPES.map((opt) => (
              <option key={opt} value={opt}>
                {t(`addDevice.type.${opt}`, {}, { defaultValue: opt })}
              </option>
            ))}
          </select>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="device-room"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('addDevice.field.room', {}, { defaultValue: 'Room' })}
          </label>
          <input
            id="device-room"
            name="room"
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder={t('addDevice.placeholder.room', {}, { defaultValue: 'Living room' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
            )}
          />
        </div>

        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="device-manufacturer"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('addDevice.field.manufacturer', {}, { defaultValue: 'Manufacturer' })}
            </label>
            <input
              id="device-manufacturer"
              name="manufacturer"
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder={t(
                'addDevice.placeholder.manufacturer',
                {},
                { defaultValue: 'Aurora Lighting' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
              )}
            />
          </div>

          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <label
              htmlFor="device-model"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[11px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.model', {}, { defaultValue: 'Model' })}
            </label>
            <input
              id="device-model"
              name="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t('addDevice.placeholder.model', {}, { defaultValue: 'A19 BR30' })}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
              )}
            />
          </div>
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <label
            htmlFor="device-firmware"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('addDevice.field.firmware', {}, { defaultValue: 'Firmware version' })}
          </label>
          <input
            id="device-firmware"
            name="firmware_version"
            type="text"
            value={firmware}
            onChange={(e) => setFirmware(e.target.value)}
            placeholder={t('addDevice.placeholder.firmware', {}, { defaultValue: 'v2.4.1' })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
            )}
          />
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <Link
            to="/rooms"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.roundedFull,
              'uppercase tracking-widest text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            data-testid="add-device-submit"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.roundedFull,
              'uppercase tracking-widest bg-primary text-on-primary disabled:opacity-50 hover:bg-primary/90',
            )}
          >
            {submitting
              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
              : t('addDevice.submit', {}, { defaultValue: 'Add device' })}
          </button>
        </div>
      </form>
    </div>
  )
}
