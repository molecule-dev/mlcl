/**
 * Bespoke dataset card — format glyph chip, name, description, dense
 * row/cols/size dt-dd row, schema-column chip strip, "ANALYZED Xh AGO"
 * eyebrow. Hover lifts card and reveals primary border.
 *
 * Translated from personal-finance/AccountCard.tsx (status pill + headline +
 * dense KPI strip + chip footer) and crm/ActivityFeed editorial cards.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type DatasetFormat = 'csv' | 'xlsx' | 'json' | 'parquet'

export interface DatasetCardData {
  id: string
  name: string
  description: string
  rows: number
  cols: number
  size_bytes: number
  last_analyzed_at: string | null
  format: DatasetFormat
  column_preview: string[]
}

const FORMAT_TONE: Record<DatasetFormat, { chip: string; glyph: string }> = {
  csv: { chip: 'bg-success/10 text-success border-success/30', glyph: 'text-success' },
  xlsx: { chip: 'bg-primary/10 text-primary border-primary/30', glyph: 'text-primary' },
  json: { chip: 'bg-secondary/10 text-secondary border-secondary/30', glyph: 'text-secondary' },
  parquet: {
    chip: 'bg-tertiary-container/15 text-tertiary-container border-tertiary-container/30',
    glyph: 'text-tertiary-container',
  },
}

function fmtBytes(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} GB`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} KB`
  return `${n} B`
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never'
  const d = new Date(iso)
  const diffH = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60))
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

export interface DatasetCardProps {
  dataset: DatasetCardData
}

export function DatasetCard({ dataset }: DatasetCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = FORMAT_TONE[dataset.format] ?? FORMAT_TONE.csv

  return (
    <Link
      to={`/datasets/${dataset.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 4 }),
        cm.sp('p', 5),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/50 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-200 group',
      )}
    >
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.roundedFull,
            'text-[10px] uppercase tracking-widest font-black border font-mono',
            tone.chip,
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xs'), tone.glyph)}
            aria-hidden="true"
          >
            table_view
          </span>
          {dataset.format}
        </span>
        <span
          className={cm.cn(
            'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
          )}
        >
          {t(
            'datasetCard.analyzedPrefix',
            { when: fmtRelative(dataset.last_analyzed_at) },
            { defaultValue: 'analyzed {{when}}' },
          )}
        </span>
      </header>

      <div className={cm.flex({ direction: 'col', gap: 1 })}>
        <h3
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight leading-snug text-on-surface group-hover:text-primary transition-colors',
          )}
        >
          {dataset.name}
        </h3>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'text-on-surface-variant leading-relaxed line-clamp-2',
          )}
        >
          {dataset.description}
        </p>
      </div>

      <dl
        className={cm.cn(cm.grid({ cols: 3, gap: 3 }), 'border-y border-outline-variant/40 py-3')}
      >
        <div>
          <dt
            className={cm.cn(
              'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
            )}
          >
            {t('datasetCard.rows', {}, { defaultValue: 'Rows' })}
          </dt>
          <dd
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline tabular-nums text-on-surface tracking-tight',
            )}
          >
            {dataset.rows.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt
            className={cm.cn(
              'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
            )}
          >
            {t('datasetCard.cols', {}, { defaultValue: 'Cols' })}
          </dt>
          <dd
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline tabular-nums text-on-surface tracking-tight',
            )}
          >
            {dataset.cols}
          </dd>
        </div>
        <div>
          <dt
            className={cm.cn(
              'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant',
            )}
          >
            {t('form.size', {}, { defaultValue: 'Size' })}
          </dt>
          <dd
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline tabular-nums text-on-surface tracking-tight',
            )}
          >
            {fmtBytes(dataset.size_bytes)}
          </dd>
        </div>
      </dl>

      <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 2 }), 'min-h-[28px]')}>
        {dataset.column_preview.slice(0, 4).map((c) => (
          <span
            key={c}
            className={cm.cn(
              cm.sp('px', 2),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              'bg-surface-container font-mono text-on-surface-variant',
            )}
          >
            {c}
          </span>
        ))}
        {dataset.column_preview.length > 4 ? (
          <span
            className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant self-center font-mono')}
          >
            +{dataset.column_preview.length - 4}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

export default DatasetCard
