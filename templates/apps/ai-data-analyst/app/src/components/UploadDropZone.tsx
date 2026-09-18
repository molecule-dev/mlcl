/**
 * Hero drop zone — gradient frame around a dashed-border target with a
 * 64px upload glyph in a frosted-pill, format chips, max-size note, and a
 * subtle drag-active state. The frame is a 1px gradient sleeve in the
 * Clarion primary→secondary palette so the zone reads as the page hero
 * even before any drag state is engaged.
 *
 * Translated from personal-finance/NetWorthCard.tsx (gradient frame +
 * decorative orbs vocabulary) and crm/StatsRow.tsx (uppercase 10px
 * labels, frosted-glass pill chrome) — adapted for the upload affordance
 * shape called out in DESIGN.md §Upload Drop Zone.
 */
import type { DragEvent } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export interface UploadDropZoneProps {
  /** File currently selected (after drop or browse). */
  file: File | null
  /** Accepted formats, e.g. ['CSV', 'XLSX', 'JSON', 'Parquet']. */
  formats: readonly string[]
  /** Max-file-size hint, pre-formatted (e.g. "1 GB"). */
  maxSizeLabel: string
  /** Whether a drag is currently over the zone. */
  dragActive: boolean
  /** File-input change handler. */
  onSelect: (file: File | null) => void
  /** Drag-over handler — sets `dragActive` true. */
  onDragOver: (e: DragEvent<HTMLLabelElement>) => void
  /** Drag-leave handler — sets `dragActive` false. */
  onDragLeave: (e: DragEvent<HTMLLabelElement>) => void
  /** Drop handler — sets the file and `dragActive` false. */
  onDrop: (e: DragEvent<HTMLLabelElement>) => void
}

const FORMAT_TONE = [
  'bg-primary/10 text-primary',
  'bg-secondary/10 text-secondary',
  'bg-success/10 text-success',
  'bg-tertiary-container/15 text-tertiary-container',
]

function fmtSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`
  return `${(bytes / 1_000).toFixed(0)} KB`
}

export function UploadDropZone({
  file,
  formats,
  maxSizeLabel,
  dragActive,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}: UploadDropZoneProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        'rounded-[2rem] p-[1.5px] relative overflow-hidden',
        'bg-gradient-to-br from-primary/40 via-secondary/30 to-tertiary-container/20',
        dragActive ? 'shadow-[0_24px_60px_rgba(53,37,205,0.18)]' : '',
      )}
    >
      <span
        aria-hidden="true"
        className={
          'absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none'
        }
      />
      <span
        aria-hidden="true"
        className={
          'absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-secondary/20 blur-3xl pointer-events-none'
        }
      />

      <label
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 4 }),
          cm.sp('p', 12),
          cm.textCenter,
          'rounded-[calc(2rem-1.5px)] bg-surface-container-lowest/95 border-2 border-dashed cursor-pointer transition-colors duration-200 relative z-10',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant hover:border-primary/40',
        )}
      >
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            'bg-gradient-to-br from-primary/15 to-secondary/15 text-primary',
            dragActive
              ? 'scale-110 transition-transform duration-200'
              : 'transition-transform duration-200',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{
              fontSize: '40px',
              fontVariationSettings: dragActive ? "'FILL' 1" : "'FILL' 0",
            }}
            aria-hidden="true"
          >
            cloud_upload
          </span>
        </span>

        <div className={cm.flex({ direction: 'col', gap: 1 })}>
          <p className={cm.cn('text-[10px] uppercase tracking-[0.22em] font-black text-primary')}>
            {file
              ? t('uploadDropZone.readyEyebrow', {}, { defaultValue: 'Ready to analyze' })
              : t(
                  'uploadDropZone.eyebrow',
                  {},
                  { defaultValue: 'Drop a file · or click to browse' },
                )}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'font-headline tracking-tight text-on-surface',
            )}
          >
            {file
              ? file.name
              : t('uploadDropZone.title', {}, { defaultValue: 'Upload your dataset' })}
          </h2>
          {file ? (
            <p
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums font-mono')}
            >
              {fmtSize(file.size)} ·{' '}
              {file.type || t('uploadDropZone.unknownType', {}, { defaultValue: 'unknown type' })}
            </p>
          ) : (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant max-w-md leading-relaxed mx-auto',
              )}
            >
              {t(
                'uploadDropZone.subtitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} auto-detects the schema, runs statistics, and surfaces anomalies the moment your file lands.',
                },
              )}
            </p>
          )}
        </div>

        <div className={cm.cn(cm.flex({ wrap: 'wrap', justify: 'center', gap: 2 }))}>
          {formats.map((f, i) => (
            <span
              key={f}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'uppercase tracking-widest font-mono',
                FORMAT_TONE[i % FORMAT_TONE.length],
              )}
            >
              {f}
            </span>
          ))}
        </div>

        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'uploadDropZone.maxSize',
            { size: maxSizeLabel },
            { defaultValue: 'Max file size {{size}} · CSV preferred for largest datasets' },
          )}
        </p>

        <input
          type="file"
          accept=".csv,.xlsx,.json,.parquet"
          onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          className={'sr-only'}
          aria-label={t(
            'uploadDropZone.fileInputLabel',
            {},
            { defaultValue: 'Choose a file to upload' },
          )}
        />
      </label>
    </section>
  )
}

export default UploadDropZone
