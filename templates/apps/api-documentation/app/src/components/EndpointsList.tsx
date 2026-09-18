import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface Endpoint {
  id: string
  method: Method
  path: string
  summary: string
  resource: string
  deprecated?: boolean
}

interface EndpointsListProps {
  endpoints: Endpoint[]
  /** Limit rows; default unlimited. */
  limit?: number
}

const METHOD_TINT: Record<Method, { bg: string; text: string }> = {
  GET: { bg: 'bg-emerald-500/15', text: 'text-success' },
  POST: { bg: 'bg-blue-500/15', text: 'text-blue-500' },
  PUT: { bg: 'bg-amber-500/15', text: 'text-warning' },
  DELETE: { bg: 'bg-red-500/15', text: 'text-error' },
  PATCH: { bg: 'bg-violet-500/15', text: 'text-violet-500' },
}

/**
 * Editorial endpoint list — bold method badge + monospace path + summary
 * + resource group meta + deprecated tag. Translated from CRM's
 * RecentActivities pattern, recoloured to method-tint logic.
 */
export function EndpointsList({ endpoints, limit }: EndpointsListProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = typeof limit === 'number' ? endpoints.slice(0, limit) : endpoints

  if (visible.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t('endpointsList.empty', {}, { defaultValue: 'No endpoints in this group yet.' })}
      </p>
    )
  }

  return (
    <ul
      className={cm.cn(
        'divide-y divide-outline-variant/40 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm',
      )}
    >
      {visible.map((e) => {
        const tint = METHOD_TINT[e.method]
        return (
          <li
            key={e.id}
            className={cm.cn('group hover:bg-surface-container-low transition-colors')}
          >
            <Link
              to={`/docs/endpoints/${e.id}`}
              className={cm.cn('flex items-center gap-4 px-5 py-3.5')}
            >
              <span
                className={cm.cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest font-mono shrink-0 w-[64px] text-center',
                  tint.bg,
                  tint.text,
                )}
              >
                {e.method}
              </span>
              <span className={cm.cn('flex-1 min-w-0 flex items-baseline gap-3 flex-wrap')}>
                <code className={cm.cn('font-mono text-sm text-on-surface font-bold truncate')}>
                  {e.path}
                </code>
                <span className={cm.cn('text-sm text-on-surface-variant truncate')}>
                  {e.summary}
                </span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0">
                {e.resource}
              </span>
              {e.deprecated && (
                <span
                  className={cm.cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-warning/10 text-warning shrink-0',
                  )}
                >
                  {t('endpointsList.deprecated', {}, { defaultValue: 'Deprecated' })}
                </span>
              )}
              <span
                className={cm.cn(
                  'material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all text-base shrink-0',
                )}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
