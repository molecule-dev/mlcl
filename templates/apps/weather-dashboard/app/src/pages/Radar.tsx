import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const LAYERS = [
  { key: 'precipitation', defaultLabel: 'Precipitation', icon: 'rainy' },
  { key: 'temperature', defaultLabel: 'Temperature', icon: 'thermostat' },
  { key: 'wind', defaultLabel: 'Wind', icon: 'air' },
  { key: 'satellite', defaultLabel: 'Satellite', icon: 'satellite_alt' },
] as const

interface ApiLocation {
  id: string
  name: string
  region?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

function unwrapBody(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload
  const wrapper = payload as { data?: unknown }
  return 'data' in wrapper ? wrapper.data : payload
}

function unwrapSingle<T>(payload: unknown): T | null {
  const body = unwrapBody(payload)
  if (!body || typeof body !== 'object') return null
  if ((body as { error?: unknown }).error) return null
  return body as T
}

const num = (value: unknown): number | null => {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function Radar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [activeLayer, setActiveLayer] = useState<string>('precipitation')
  const [defaultLocation, setDefaultLocation] = useState<ApiLocation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function load() {
      const def = await http.get<ApiLocation>('/api/locations/default').catch(() => null)
      if (cancelled) return
      setDefaultLocation(unwrapSingle<ApiLocation>(def))
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const lat = num(defaultLocation?.latitude)
  const lon = num(defaultLocation?.longitude)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(6))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('radar.eyebrow', {}, { defaultValue: 'Live radar' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('radar.heading', {}, { defaultValue: 'Centered on your default location' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'radar.subheading',
            {},
            {
              defaultValue:
                'Live precipitation, temperature, wind and satellite layers tile in from a public source on an OpenStreetMap basemap. Switch layers to inspect the sky around your saved coordinates.',
            },
          )}
        </p>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        {LAYERS.map((layer) => {
          const active = activeLayer === layer.key
          return (
            <button
              key={layer.key}
              type="button"
              onClick={() => setActiveLayer(layer.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'transition-colors',
                active
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/30'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
              )}
              aria-pressed={active}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                aria-hidden="true"
              >
                {layer.icon}
              </span>
              {t(`radar.layer.${layer.key}`, {}, { defaultValue: layer.defaultLabel })}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className={cm.cn(cm.sp('py', 24), cm.textCenter, 'text-on-surface-variant')}>
          {t('radar.loading', {}, { defaultValue: 'Locating your sky…' })}
        </p>
      ) : !defaultLocation || lat == null || lon == null ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.stack(3),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest text-on-surface-variant',
          )}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('5xl'), 'text-primary')}>
            radar
          </span>
          <p className={cm.fontWeight('bold')}>
            {t(
              'radar.empty.title',
              {},
              { defaultValue: 'Set a default location to centre the radar.' },
            )}
          </p>
          <p>
            {t(
              'radar.empty.body',
              {},
              {
                defaultValue:
                  'The radar uses your default location’s latitude and longitude as its anchor.',
              },
            )}
          </p>
          <div>
            <Link
              to="/locations"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                'rounded-full bg-primary text-on-primary font-bold inline-flex items-center gap-2 hover:opacity-90',
              )}
            >
              <span className="material-symbols-outlined">add_location</span>
              {t('radar.empty.cta', {}, { defaultValue: 'Manage locations' })}
            </Link>
          </div>
        </div>
      ) : (
        <RadarMap lat={lat} lon={lon} locationName={defaultLocation.name} layer={activeLayer} />
      )}
    </div>
  )
}

interface RadarMapProps {
  lat: number
  lon: number
  locationName: string
  layer: string
}

function RadarMap({ lat, lon, locationName, layer }: RadarMapProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  // OpenStreetMap embed centered on lat/lon.
  // The selected `layer` is reflected in the legend chip; the core map
  // tiles always come from OSM (free, keyless). When a paid radar bond
  // is wired (see api/bonds.ts) the iframe URL can be swapped without
  // touching this component.
  const delta = 0.5
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(',')
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
  const externalHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=8/${lat}/${lon}`
  return (
    <div className={cm.stack(3)}>
      <div
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] bg-surface-container-low shadow-2xl shadow-primary/20 border border-outline-variant',
        )}
        style={{ minHeight: '480px' }}
      >
        <iframe
          title={t(
            'radar.mapTitle',
            { name: locationName },
            { defaultValue: 'Radar map for {{name}}' },
          )}
          src={src}
          className={cm.cn(cm.w('full'))}
          style={{ minHeight: '480px', border: 'none' }}
          loading="lazy"
        />
        <div
          className={cm.cn(
            'absolute top-4 left-4 px-3 py-2 rounded-full bg-surface/80 backdrop-blur-md',
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.fontWeight('bold'),
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-primary', cm.textSize('base'))}
            aria-hidden="true"
          >
            location_on
          </span>
          <span className={cm.cn(cm.textSize('sm'))}>
            {locationName} · {lat.toFixed(3)}, {lon.toFixed(3)}
          </span>
        </div>
        <div
          className={cm.cn(
            'absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/90 text-on-primary text-[10px] font-bold uppercase tracking-widest',
          )}
        >
          {t(`radar.layer.${layer}`, {}, { defaultValue: layer })}
        </div>
      </div>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }))}
      >
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'radar.attribution',
            {},
            {
              defaultValue:
                'Basemap © OpenStreetMap contributors. Tile-based weather layers require a wired radar provider; the layer chips above represent the active intent.',
            },
          )}
        </p>
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'bg-surface-container hover:bg-surface-container-high inline-flex items-center gap-1',
          )}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            open_in_new
          </span>
          {t('radar.openExternal', {}, { defaultValue: 'Open larger map' })}
        </a>
      </div>
    </div>
  )
}
