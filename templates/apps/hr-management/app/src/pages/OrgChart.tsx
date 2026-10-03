import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface OrgNode {
  id: string
  name: string
  title: string
  department: string
  initial: string
  children: OrgNode[]
}

export function OrgChart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tree, setTree] = useState<OrgNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((): Promise<void> => {
    setLoading(true)
    return http
      .get('/api/org-tree')
      .then((res) => {
        setTree(unwrapSingle<OrgNode>(res))
      })
      .catch(() => {
        setError(t('nav.failedToLoad', {}, { defaultValue: 'Failed to load.' }))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [http, t])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}>
          {t('orgChart.eyebrow', {}, { defaultValue: 'Reporting structure' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('orgChart.heading', {}, { defaultValue: 'Org chart' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'orgChart.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'A living view of how {{appName}} reports up. Click any node to open the profile.',
            },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-[2rem] bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-x-auto',
        )}
      >
        {loading ? (
          <p className={cm.cn('text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <LoadErrorBanner message={error} onRetry={load} />
        ) : !tree ? (
          <p className={cm.cn(cm.textCenter, 'text-on-surface-variant')}>
            {t('orgChart.empty', {}, { defaultValue: 'No structure yet.' })}
          </p>
        ) : (
          <div className={cm.cn('mx-auto', 'min-w-fit')}>
            <OrgTreeNode node={tree} root />
          </div>
        )}
      </section>
    </div>
  )
}

function OrgTreeNode({ node, root }: { node: OrgNode; root?: boolean }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.sp('mx', 2))}>
      <Link
        to={`/employees/${node.id}`}
        className={cm.cn(
          cm.sp('p', 4),
          cm.flex({ direction: 'col', align: 'center' }),
          'rounded-2xl border-2 border-transparent bg-surface-container-low w-[220px] hover:border-primary hover:scale-[1.02] hover:shadow-md transition-all',
          root ? 'border-primary' : '',
        )}
      >
        <span
          className={cm.cn(
            'grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary-dark text-xl font-extrabold tracking-tight',
          )}
        >
          {node.initial}
        </span>
        <p
          className={cm.cn(
            cm.sp('mt', 3),
            cm.textSize('sm'),
            'font-bold text-on-surface text-center',
          )}
        >
          {node.name}
        </p>
        <p
          className={cm.cn(
            cm.sp('mt', 1),
            cm.textSize('xs'),
            'font-medium text-on-surface-variant text-center',
          )}
        >
          {node.title}
        </p>
        <span
          className={cm.cn(
            cm.sp('mt', 2),
            cm.sp('px', 2),
            cm.sp('py', 1),
            'rounded-full bg-primary/10 text-primary-dark text-[10px] font-black uppercase tracking-widest',
          )}
        >
          {node.department}
        </span>
      </Link>

      {node.children.length > 0 ? (
        <>
          <div
            aria-hidden="true"
            className={cm.cn('h-8 w-px bg-outline-variant/40')}
            style={{ backgroundColor: 'var(--color-orgchart-connector)' }}
          />
          <div
            className={cm.cn(
              cm.flex({ align: 'start', justify: 'center' }),
              cm.sp('pt', 4),
              'gap-x-2 border-t-2 relative',
            )}
            style={{ borderColor: 'var(--color-orgchart-connector)' }}
          >
            {node.children.map((child) => (
              <div key={child.id} className={cm.cn('relative')}>
                <div
                  aria-hidden="true"
                  className={cm.cn('absolute left-1/2 -top-4 h-4 w-px')}
                  style={{ backgroundColor: 'var(--color-orgchart-connector)' }}
                />
                <OrgTreeNode node={child} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
