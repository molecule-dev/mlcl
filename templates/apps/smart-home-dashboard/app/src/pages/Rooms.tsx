import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type RoomSummary, RoomTriad } from '../components/RoomTriad.js'
import { unwrapList, unwrapSingle } from '../utils/httpUnpack.js'

interface RoomRecord {
  id: string
  name: string
  icon?: string | null
  floor?: number | null
  area_sqft?: number | null
}

interface DeviceRecord {
  id: string
  room?: string | null
  status?: string
  is_on?: boolean
}

const ROOM_KIND_KEYWORDS: Array<{ kind: RoomSummary['kind']; keywords: ReadonlyArray<string> }> = [
  { kind: 'living', keywords: ['living', 'lounge', 'family'] },
  { kind: 'kitchen', keywords: ['kitchen', 'pantry', 'dining'] },
  { kind: 'bedroom', keywords: ['bedroom', 'bed ', 'master', 'nursery', 'guest'] },
  { kind: 'bath', keywords: ['bath', 'restroom'] },
  { kind: 'office', keywords: ['office', 'study', 'studio'] },
  { kind: 'outdoor', keywords: ['patio', 'garden', 'deck', 'porch', 'yard', 'garage'] },
]

function inferKind(name: string): RoomSummary['kind'] {
  const lower = name.toLowerCase()
  for (const entry of ROOM_KIND_KEYWORDS) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.kind
  }
  return 'living'
}

export function Rooms() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rooms, setRooms] = useState<RoomRecord[] | null>(null)
  const [devices, setDevices] = useState<DeviceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [roomsPayload, devicesPayload] = await Promise.all([
        http.get('/api/rooms'),
        http.get('/api/iot-devices').catch(() => null),
      ])
      setRooms(unwrapList<RoomRecord>(roomsPayload))
      setDevices(unwrapList<DeviceRecord>(devicesPayload))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('rooms.loadError', {}, { defaultValue: 'Could not load rooms.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const merged: RoomSummary[] = useMemo(() => {
    if (!rooms) return []
    if (rooms.length === 0) return []
    const byRoom = new Map<string, { on: number; total: number }>()
    for (const d of devices) {
      const r = (d.room || 'unassigned').toLowerCase()
      const cur = byRoom.get(r) || { on: 0, total: 0 }
      cur.total += 1
      if (d.is_on) cur.on += 1
      byRoom.set(r, cur)
    }
    return rooms.map((r) => {
      const stats = byRoom.get(r.name.toLowerCase()) || { on: 0, total: 0 }
      return {
        id: r.id,
        name: r.name,
        kind: inferKind(r.name),
        devicesOn: stats.on,
        devicesTotal: stats.total,
        temperatureF: 70,
      }
    })
  }, [devices, rooms])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      setCreateError(t('rooms.create.nameRequired', {}, { defaultValue: 'Name the room first.' }))
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const response = await http.post('/api/rooms', {
        name: newName.trim(),
        floor: 1,
      })
      const created = unwrapSingle<RoomRecord>(response)
      if (created) {
        setRooms((prev) => (prev ? [...prev, created] : [created]))
      } else {
        await reload()
      }
      track({ name: 'room.created', properties: { room_id: created?.id ?? null } })
      setNewName('')
      setShowNew(false)
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('rooms.create.error', {}, { defaultValue: 'Could not create the room. Try again.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      data-testid="rooms-page"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}
    >
      <header
        className={cm.cn(cm.flex({ justify: 'between', align: 'start', gap: 'md', wrap: 'wrap' }))}
      >
        <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('rooms.eyebrow', {}, { defaultValue: 'House' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('rooms.heading', {}, { defaultValue: 'Rooms' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'rooms.subheading',
              {},
              { defaultValue: 'Tap any room for full per-device control.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNew((prev) => !prev)
            setCreateError(null)
          }}
          data-testid="rooms-new-button"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.roundedFull,
            'uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90',
          )}
        >
          {showNew
            ? t('common.close', {}, { defaultValue: 'Close' })
            : t('rooms.new.open', {}, { defaultValue: '+ New room' })}
        </button>
      </header>

      {showNew ? (
        <form
          onSubmit={handleCreate}
          data-testid="rooms-new-form"
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'bg-surface-container-lowest rounded-2xl',
          )}
        >
          <label
            htmlFor="room-name"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('rooms.new.name', {}, { defaultValue: 'Room name' })}
          </label>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
            <input
              id="room-name"
              name="name"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t(
                'rooms.new.placeholder',
                {},
                { defaultValue: 'Sunroom, Garage, Kid bedroom…' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'flex-1 min-w-[240px] rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
              )}
            />
            <button
              type="submit"
              disabled={creating}
              data-testid="rooms-new-submit"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.roundedFull,
                'uppercase tracking-widest bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50',
              )}
            >
              {creating
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('rooms.new.create', {}, { defaultValue: 'Create room' })}
            </button>
          </div>
          {createError ? (
            <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error')}>
              {createError}
            </p>
          ) : null}
        </form>
      ) : null}

      {error ? (
        <p
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'bg-warning-container text-on-warning-container rounded-xl text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      {loading && rooms === null ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('rooms.loading', {}, { defaultValue: 'Loading rooms…' })}
        </p>
      ) : null}

      {merged.length === 0 ? (
        <div
          data-testid="rooms-empty"
          className={cm.cn(cm.sp('p', 8), cm.textCenter, 'bg-surface-container-lowest rounded-2xl')}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'rooms.empty',
              {},
              { defaultValue: 'No rooms yet. Add your first room to get started.' },
            )}
          </p>
        </div>
      ) : (
        <section className={cm.stack(8)} data-testid="rooms-list">
          <RoomTriad rooms={merged.slice(0, 3)} />
          {merged.length > 3 ? <RoomTriad rooms={merged.slice(3, 6)} /> : null}
          {merged.length > 6 ? <RoomTriad rooms={merged.slice(6, 9)} /> : null}
        </section>
      )}
    </div>
  )
}
