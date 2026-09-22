import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import MiniMap from '../components/MiniMap.js'
import SideNavBar from '../components/SideNavBar.js'
import { PageHeader } from '../components/StatusBadge.js'
import { deriveAddress } from '../lib/geo.js'

interface WatchArea {
  id: string
  name: string
  x: number
  y: number
  radius: number
  derived_address: string
  created_at: string
}

const RADIUS_CHOICES = [5, 10, 15, 20] as const

/**
 * WatchAreas — saved named circles on the city grid (name + center pin +
 * radius in blocks). New issues whose pin falls inside one of your areas
 * fan out a row in the in-app notifications feed.
 */
export function WatchAreasPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [areas, setAreas] = useState<WatchArea[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null)
  const [radius, setRadius] = useState<number>(10)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // Destructive deletes get an inline two-step confirm plus a busy state —
  // a single-tap Delete once silently destroyed an area on a stray tap.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    document.title = t(
      'watchAreas.pageTitle',
      { appName: APP_NAME },
      { defaultValue: 'Watch areas — {{appName}}' },
    )
  }, [t])

  const fetchAreas = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await http.get('/api/watch-areas')
      const raw: WatchArea[] = Array.isArray(res)
        ? (res as WatchArea[])
        : Array.isArray((res as { data?: unknown })?.data)
          ? (res as { data: WatchArea[] }).data
          : []
      setAreas(raw)
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setLoadError(
        t('watchAreas.loadError', {}, { defaultValue: 'Could not load watch areas. Try again.' }),
      )
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void fetchAreas()
  }, [fetchAreas])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !center || saving) return
    setSaving(true)
    setFormError(null)
    try {
      const res = await http.post('/api/watch-areas', {
        name: name.trim(),
        x: center.x,
        y: center.y,
        radius,
      })
      const o = res as { id?: string; data?: { id?: string } }
      const createdId = o?.id ?? o?.data?.id
      // Domain event: a resident opted into proximity notifications.
      void track({
        name: 'watch_area.added',
        properties: { watch_area_id: createdId ?? null, radius },
      })
      setName('')
      setCenter(null)
      setRadius(10)
      await fetchAreas()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : t(
              'watchAreas.saveError',
              {},
              { defaultValue: 'Could not save watch area. Try again.' },
            ),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    setDeletingId(id)
    try {
      await http.delete(`/api/watch-areas/${id}`)
      setConfirmDeleteId(null)
      // Domain event: the watch area was removed.
      void track({ name: 'watch_area.removed', properties: { watch_area_id: id } })
      await fetchAreas()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      setLoadError(
        t('watchAreas.deleteError', {}, { defaultValue: 'Could not delete watch area.' }),
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <SideNavBar />
      <main className={cm.cn(cm.minH('screen'), 'md:ml-[240px]')}>
        <div className={cm.cn(cm.mxAuto, 'max-w-5xl', cm.sp('px', 6), cm.sp('py', 8), cm.stack(6))}>
          <PageHeader
            molId="watch-areas-title"
            title={t('watchAreas.title', {}, { defaultValue: 'Watch areas' })}
            subtitle={t(
              'watchAreas.subtitle',
              {},
              {
                defaultValue:
                  'Save places you care about — your block, the school route, the park. New reports inside an area land in your notifications feed.',
              },
            )}
            action={
              <Link
                data-mol-id="watch-areas-feed-link"
                to="/notifications"
                className={cm.cn(
                  cm.sp('px', 4),
                  'rounded-lg py-2 text-sm font-semibold shrink-0',
                  'border border-outline-variant text-on-surface hover:bg-surface-container-low',
                )}
              >
                {t('watchAreas.openFeed', {}, { defaultValue: 'Open feed' })}
              </Link>
            }
          />

          {/* Form + list stack below lg so a phone gets the full width for each. */}
          <div className={cm.cn(cm.flex({ align: 'start', gap: 6 }), 'flex-col lg:flex-row')}>
            {/* Create form */}
            <form
              data-mol-id="watch-area-form"
              className={cm.cn(
                cm.stack(4),
                cm.sp('p', 5),
                'rounded-xl bg-surface-container-lowest border border-outline-variant/40 w-full lg:w-[340px] shrink-0',
              )}
              onSubmit={handleSave}
            >
              <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                {t('watchAreas.newArea', {}, { defaultValue: 'New watch area' })}
              </h2>
              <div className={cm.stack(2)}>
                <label
                  htmlFor="watch-area-name"
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                >
                  {t('watchAreas.nameLabel', {}, { defaultValue: 'Name' })}
                </label>
                <input
                  id="watch-area-name"
                  data-mol-id="watch-area-name"
                  type="text"
                  required
                  maxLength={100}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
                  )}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(
                    'watchAreas.namePlaceholder',
                    {},
                    { defaultValue: 'e.g. Around home' },
                  )}
                />
              </div>
              <div className={cm.stack(2)}>
                <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                  {t('watchAreas.centerLabel', {}, { defaultValue: 'Center — click the map' })}
                </span>
                <MiniMap
                  data-mol-id="watch-area-map"
                  activePin={center}
                  onPick={(x, y) => setCenter({ x, y })}
                />
                <p
                  data-mol-id="watch-area-address-preview"
                  className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                >
                  {center
                    ? deriveAddress(center.x, center.y)
                    : t(
                        'watchAreas.noCenter',
                        {},
                        { defaultValue: 'Click the map (or use arrow keys) to set the center.' },
                      )}
                </p>
              </div>
              <div className={cm.stack(2)}>
                <label
                  htmlFor="watch-area-radius"
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                >
                  {t('watchAreas.radiusLabel', {}, { defaultValue: 'Radius (blocks)' })}
                </label>
                <select
                  id="watch-area-radius"
                  data-mol-id="watch-area-radius"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-full rounded-lg border border-outline-variant bg-surface-container-lowest',
                  )}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                >
                  {RADIUS_CHOICES.map((r) => (
                    <option key={r} value={r}>
                      {t(
                        'watchAreas.radiusBlocks',
                        { radius: r },
                        { defaultValue: '{{radius}} blocks' },
                      )}
                    </option>
                  ))}
                </select>
              </div>
              {formError && (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-error')}
                  data-mol-id="watch-area-error"
                >
                  {formError}
                </p>
              )}
              <button
                type="submit"
                data-mol-id="watch-area-submit"
                className={cm.cn(
                  cm.sp('px', 4),
                  'rounded-lg py-2 text-sm font-semibold',
                  'bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
                )}
                disabled={saving || !name.trim() || !center}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('watchAreas.save', {}, { defaultValue: 'Save watch area' })}
              </button>
            </form>

            {/* Saved areas — w-full keeps the stacked (mobile) child stretched
                to the column; align-start would hug it to content width. */}
            <section
              data-mol-id="watch-area-list"
              className={cm.cn(cm.flex1, 'w-full lg:w-auto min-w-0', cm.stack(3))}
            >
              {loading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : loadError ? (
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-error')}
                  data-mol-id="watch-areas-load-error"
                >
                  {loadError}
                </p>
              ) : areas.length === 0 ? (
                <p
                  data-mol-id="watch-areas-empty"
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                >
                  {t(
                    'watchAreas.empty',
                    {},
                    {
                      defaultValue:
                        'No watch areas yet — save one to start hearing about nearby reports.',
                    },
                  )}
                </p>
              ) : (
                areas.map((area) => (
                  <div
                    key={area.id}
                    data-mol-id="watch-area-item"
                    className={cm.cn(
                      cm.stack(2),
                      cm.sp('p', 4),
                      'rounded-lg border border-outline-variant/50 bg-surface-container-lowest',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', justify: 'between', gap: 3 })}>
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                        {area.name}
                      </span>
                      {confirmDeleteId === area.id ? (
                        <span className={cm.flex({ align: 'center', gap: 2 })}>
                          <button
                            type="button"
                            data-mol-id="watch-area-delete-confirm"
                            onClick={() => void handleDelete(area.id)}
                            disabled={deletingId === area.id}
                            className={cm.cn(
                              cm.sp('px', 3),
                              'rounded-lg border border-error text-xs font-semibold py-1 text-error bg-error-container/30 disabled:opacity-50',
                            )}
                          >
                            {deletingId === area.id
                              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                              : t(
                                  'watchAreas.confirmDelete',
                                  {},
                                  { defaultValue: 'Confirm delete' },
                                )}
                          </button>
                          <button
                            type="button"
                            data-mol-id="watch-area-delete-cancel"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={deletingId === area.id}
                            className={cm.cn(
                              cm.sp('px', 3),
                              'rounded-lg border border-outline-variant text-xs font-medium py-1 text-on-surface-variant disabled:opacity-50',
                            )}
                          >
                            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          data-mol-id="watch-area-delete"
                          onClick={() => setConfirmDeleteId(area.id)}
                          className={cm.cn(
                            cm.sp('px', 3),
                            'rounded-lg border border-outline-variant text-xs font-medium py-1 text-on-surface-variant hover:bg-error-container/20 hover:text-error',
                          )}
                        >
                          {t('common.delete', {}, { defaultValue: 'Delete' })}
                        </button>
                      )}
                    </div>
                    <div className={cm.cn(cm.w('[160px]'))}>
                      <MiniMap
                        data-mol-id={`watch-area-item-map-${area.id}`}
                        circles={[
                          {
                            x: area.x,
                            y: area.y,
                            radius: area.radius,
                            color: 'var(--mol-color-primary)',
                            label: area.name,
                          },
                        ]}
                        activePin={{ x: area.x, y: area.y }}
                      />
                    </div>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'watchAreas.areaSummary',
                        { address: area.derived_address, radius: area.radius },
                        { defaultValue: 'Around {{address}} · {{radius}} block radius' },
                      )}
                    </p>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default WatchAreasPage
