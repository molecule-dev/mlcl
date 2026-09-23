import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SceneCard, type SceneSummary } from '../components/SceneCard.js'
import { unwrapList, unwrapSingle } from '../utils/httpUnpack.js'

interface SceneRecord {
  id: string
  name: string
  description?: string
  icon?: string
  device_states?: ReadonlyArray<unknown>
  last_activated?: string | null
}

const SCENE_TONES: ReadonlyArray<NonNullable<Parameters<typeof SceneCard>[0]['tone']>> = [
  'primary',
  'secondary',
  'tertiary',
  'info',
  'warning',
]

function recordToSummary(r: SceneRecord, active = false): SceneSummary {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    icon: r.icon || 'auto_awesome',
    deviceCount: Array.isArray(r.device_states) ? r.device_states.length : 0,
    last_activated: r.last_activated || null,
    active,
  }
}

const ICON_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'auto_awesome', label: 'Spark' },
  { value: 'movie', label: 'Movie' },
  { value: 'wb_sunny', label: 'Sunny' },
  { value: 'bedtime', label: 'Bedtime' },
  { value: 'restaurant', label: 'Dinner' },
  { value: 'desk', label: 'Focus' },
  { value: 'logout', label: 'Away' },
]

export function Scenes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [scenes, setScenes] = useState<SceneSummary[]>([])
  const [hasFetched, setHasFetched] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newIcon, setNewIcon] = useState(ICON_OPTIONS[0]!.value)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await http.get('/api/scenes')
      const list = unwrapList<SceneRecord>(payload)
      setHasFetched(true)
      setScenes(list.length === 0 ? [] : list.map((r) => recordToSummary(r)))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('scenes.loadError', {}, { defaultValue: 'Could not load scenes.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  async function activate(id: string) {
    setActivatingId(id)
    try {
      await http.post(`/api/scenes/${id}/activate`, {})
      track({ name: 'scene.activated', properties: { scene_id: id } })
      setScenes((prev) => prev.map((s) => ({ ...s, active: s.id === id })))
    } catch (error) {
      logError('scenes.activate', error)
      setScenes((prev) => prev.map((s) => ({ ...s, active: s.id === id })))
    } finally {
      setActivatingId(null)
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      setCreateError(t('scenes.create.nameRequired', {}, { defaultValue: 'Name the scene first.' }))
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const response = await http.post('/api/scenes', {
        name: newName.trim(),
        description: newDescription.trim(),
        icon: newIcon,
        device_states: [],
      })
      const created = unwrapSingle<SceneRecord>(response)
      if (created) {
        setScenes((prev) => [...prev, recordToSummary(created)])
        setHasFetched(true)
      } else {
        await reload()
      }
      track({ name: 'scene.created', properties: { scene_id: created?.id ?? null } })
      setNewName('')
      setNewDescription('')
      setNewIcon(ICON_OPTIONS[0]!.value)
      setShowNew(false)
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t(
              'scenes.create.error',
              {},
              { defaultValue: 'Could not create the scene. Try again.' },
            ),
      )
    } finally {
      setCreating(false)
    }
  }

  const showEmpty = hasFetched && scenes.length === 0 && !showNew

  return (
    <div
      data-testid="scenes-page"
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
            {t('nav.library', {}, { defaultValue: 'Library' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('scenes.heading', {}, { defaultValue: 'Scenes' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'scenes.subheading',
              {},
              { defaultValue: 'One tap, every device — set the mood for any moment.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNew((prev) => !prev)
            setCreateError(null)
          }}
          data-testid="scenes-new-button"
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
            : t('scenes.new.open', {}, { defaultValue: '+ New scene' })}
        </button>
      </header>

      {showNew ? (
        <form
          onSubmit={handleCreate}
          data-testid="scenes-new-form"
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'bg-surface-container-lowest rounded-2xl',
          )}
        >
          <label
            htmlFor="scene-name"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('scenes.new.name', {}, { defaultValue: 'Scene name' })}
          </label>
          <input
            id="scene-name"
            name="name"
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t(
              'scenes.new.namePlaceholder',
              {},
              { defaultValue: 'Date night, Wake up, Holiday lights…' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
            )}
          />
          <label
            htmlFor="scene-description"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
          </label>
          <textarea
            id="scene-description"
            name="description"
            rows={2}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder={t(
              'scenes.new.descPlaceholder',
              {},
              { defaultValue: 'What this scene does — quick summary.' },
            )}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
            )}
          />
          <label
            htmlFor="scene-icon"
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('scenes.new.icon', {}, { defaultValue: 'Icon' })}
          </label>
          <select
            id="scene-icon"
            name="icon"
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl bg-surface text-on-surface border border-outline-variant focus:border-primary focus:outline-none',
            )}
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className={cm.flex({ justify: 'end', align: 'center', gap: 'sm' })}>
            <button
              type="submit"
              disabled={creating}
              data-testid="scenes-new-submit"
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
                : t('scenes.new.create', {}, { defaultValue: 'Create scene' })}
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
          className={cm.cn(
            cm.sp('p', 4),
            'bg-warning-container text-on-warning-container rounded-xl text-sm',
          )}
        >
          {error}
        </p>
      ) : null}

      {loading && !hasFetched ? (
        <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}>
          {t('scenes.loading', {}, { defaultValue: 'Loading scenes…' })}
        </p>
      ) : null}

      {showEmpty ? (
        <p
          data-testid="scenes-empty"
          className={cm.cn(
            cm.sp('p', 6),
            cm.textCenter,
            'bg-surface-container-lowest rounded-2xl text-on-surface-variant',
          )}
        >
          {t(
            'scenes.empty',
            {},
            { defaultValue: 'No scenes yet — create one to control multiple devices in one tap.' },
          )}
        </p>
      ) : (
        <section
          data-testid="scenes-list"
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}
        >
          {scenes.map((scene, i) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onActivate={activatingId == null ? activate : undefined}
              tone={SCENE_TONES[i % SCENE_TONES.length]}
            />
          ))}
        </section>
      )}
    </div>
  )
}
