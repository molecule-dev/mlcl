import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { SamplePhoto } from '../lib/sample-photos.js'

export type ExifShape = SamplePhoto['exif'] | (Record<string, unknown> | null | undefined)

interface ExifPanelProps {
  exif?: ExifShape
  /** Optional heading override. */
  heading?: string
  /** Optional fallback used when a field is missing. */
  unknownLabel?: string
  /**
   * Whether to include the GPS/location row. Driven by the owner's "Display
   * location metadata" preference (owner_prefs.showLocation); when false the
   * location row is omitted so a photo's coordinates are not shown to viewers.
   * Defaults to true (show).
   */
  showLocation?: boolean
}

const FIELDS: Array<{ key: string; defaultLabel: string; icon: string }> = [
  { key: 'camera', defaultLabel: 'Camera', icon: 'photo_camera' },
  { key: 'lens', defaultLabel: 'Lens', icon: 'lens' },
  { key: 'focal_length', defaultLabel: 'Focal length', icon: 'center_focus_strong' },
  { key: 'aperture', defaultLabel: 'Aperture', icon: 'aperture' },
  { key: 'shutter_speed', defaultLabel: 'Shutter speed', icon: 'shutter_speed' },
  { key: 'iso', defaultLabel: 'ISO', icon: 'iso' },
  { key: 'location', defaultLabel: 'Location', icon: 'place' },
  { key: 'taken_at', defaultLabel: 'Date taken', icon: 'event' },
]

/**
 * The EXIF fields to render given the owner's location-visibility preference.
 * When `showLocation` is false the GPS/location row is dropped so a photo's
 * coordinates are not exposed to viewers.
 */
export function visibleExifFields(showLocation: boolean): typeof FIELDS {
  return showLocation ? FIELDS : FIELDS.filter((field) => field.key !== 'location')
}

function readField(exif: ExifShape, key: string, fallback: string): string {
  if (!exif) return fallback
  const value = (exif as Record<string, unknown>)[key]
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Right-rail EXIF metadata panel — handles both the curated SamplePhoto
 * shape and the looser `exif_data` blob returned from the API. Missing
 * fields render as a dim "—" so the panel stays visually balanced.
 */
export function ExifPanel({
  exif,
  heading,
  unknownLabel = '—',
  showLocation = true,
}: ExifPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <aside
      data-testid="exif-panel"
      className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden')}
    >
      <header
        className={cm.cn(cm.sp('px', 5), cm.sp('py', 4), 'border-b border-outline-variant/60')}
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {t('exifPanel.eyebrow', {}, { defaultValue: 'Frame metadata' })}
        </p>
        <h3
          className={'text-base font-bold mt-0.5'}
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {heading ?? t('exifPanel.heading', {}, { defaultValue: 'EXIF' })}
        </h3>
      </header>
      <dl className="divide-y divide-outline-variant/40">
        {visibleExifFields(showLocation).map((field) => {
          const value = readField(exif, field.key, unknownLabel)
          return (
            <div
              key={field.key}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              )}
            >
              <dt
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <span
                  className={'material-symbols-outlined text-base text-on-surface-variant'}
                  aria-hidden="true"
                >
                  {field.icon}
                </span>
                {t(`exifPanel.${field.key}`, {}, { defaultValue: field.defaultLabel })}
              </dt>
              <dd
                className={cm.cn(
                  'text-sm font-mono tabular-nums text-on-surface text-right truncate',
                  value === unknownLabel && 'text-on-surface-variant/70',
                )}
                data-testid={`exif-${field.key}`}
              >
                {value}
              </dd>
            </div>
          )
        })}
      </dl>
    </aside>
  )
}
