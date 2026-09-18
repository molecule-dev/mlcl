import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Guide {
  key: string
  title: string
  body: string
  icon: string
  href: string
  /** Optional reading-time minutes. */
  readingMins?: number
  /** Tag tint group: stable / beta / experimental. */
  status?: 'stable' | 'beta' | 'experimental'
}

interface GuidesGridProps {
  guides: ReadonlyArray<Guide>
}

const STATUS_PILL: Record<NonNullable<Guide['status']>, string> = {
  stable: 'bg-emerald-500/15 text-emerald-400',
  beta: 'bg-amber-500/15 text-amber-400',
  experimental: 'bg-violet-500/15 text-violet-400',
}

const ICON_TINT = [
  'text-success',
  'text-blue-500',
  'text-violet-500',
  'text-warning',
  'text-cyan-500',
  'text-pink-500',
]

/**
 * Card grid of guide tiles — large icon-chip in dev-tools tint, bold
 * title, body, status pill, reading-time meta. Translated from
 * lms's CourseCard / ai-chatbot-builder's IntegrationCard pattern.
 */
export function GuidesGrid({ guides }: GuidesGridProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (guides.length === 0) return null

  return (
    <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
      {guides.map((g, i) => (
        <Link
          key={g.key}
          to={g.href}
          className={cm.cn(
            'group block rounded-2xl bg-surface-container-lowest p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all border border-outline-variant/40',
          )}
        >
          <div
            className={cm.cn(
              'inline-flex p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
              ICON_TINT[i % ICON_TINT.length],
            )}
          >
            <span className="material-symbols-outlined text-3xl" aria-hidden="true">
              {g.icon}
            </span>
          </div>
          <div className={cm.cn('mt-5 flex items-center gap-2 flex-wrap')}>
            {g.status && (
              <span
                className={cm.cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest font-mono',
                  STATUS_PILL[g.status],
                )}
              >
                {g.status}
              </span>
            )}
            {g.readingMins && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {t(
                  'guidesGrid.readingMins',
                  { mins: g.readingMins },
                  { defaultValue: '{{mins}} min read' },
                )}
              </span>
            )}
          </div>
          <h3
            className={cm.cn(
              'text-lg font-extrabold tracking-tight mt-2 group-hover:text-primary transition-colors',
            )}
          >
            {g.title}
          </h3>
          <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed mt-2 line-clamp-3')}>
            {g.body}
          </p>
        </Link>
      ))}
    </div>
  )
}
