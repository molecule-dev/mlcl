import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import RecentModelsHeader from './RecentModelsHeader.js'

interface Model {
  id: string
  name: string
  format?: string
  polygon_count?: number
  thumbnail_url?: string
  updated_at?: string
}

function RecentModelsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    http
      .get('/api/models')
      .then((res) => setModels(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section>
      <RecentModelsHeader />
      <div
        className={cm.cn(
          cm.flex({ gap: 6 }),
          cm.sp('pb', 8),
          'overflow-x-auto hide-scrollbar -mb-8 snap-x',
        )}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className={cm.cn(
                  'bg-surface-container-lowest rounded-xl min-w-[320px] snap-start animate-pulse',
                )}
                style={{ minHeight: 220 }}
              />
            ))
          : models.slice(0, 6).map((model) => (
              <Link key={model.id} to={`/models/${model.id}`} className="contents">
                <div
                  className={cm.cn(
                    cm.cursorPointer,
                    'bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(15,15,35,0.06)] min-w-[320px] snap-start group transition-transform duration-200 hover:-translate-y-1',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'aspect-[16/10] bg-on-background relative overflow-hidden',
                    )}
                  >
                    {model.format && (
                      <div
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.fontWeight('bold'),
                          'absolute top-3 right-3 bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 rounded text-on-surface z-10',
                        )}
                      >
                        {model.format.toUpperCase()}
                      </div>
                    )}
                    {model.polygon_count != null && (
                      <div
                        className={cm.cn(
                          cm.roundedFull,
                          cm.sp('py', 1),
                          'absolute bottom-3 left-3 bg-secondary-container/90 backdrop-blur-sm text-on-secondary-container font-mono text-[11px] px-2.5 z-10',
                        )}
                      >
                        {t(
                          'recentModelsSection.polygonCount',
                          { count: model.polygon_count.toLocaleString() },
                          { defaultValue: '{{count}} polys' },
                        )}
                      </div>
                    )}
                    {model.thumbnail_url ? (
                      <img
                        className={cm.cn(
                          cm.w('full'),
                          cm.h('full'),
                          'object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500',
                        )}
                        src={model.thumbnail_url}
                        alt={model.name}
                      />
                    ) : (
                      <div className={cm.cn(cm.w('full'), cm.h('full'))} />
                    )}
                  </div>
                  <div className={cm.sp('p', 4)}>
                    <h4 className={cm.cn(cm.fontWeight('medium'), 'text-on-surface truncate')}>
                      {model.name}
                    </h4>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.sp('mt', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {model.updated_at
                        ? t(
                            'recentModelsSection.lastEdited',
                            { date: model.updated_at },
                            { defaultValue: 'Edited {{date}}' },
                          )
                        : t(
                            'recentModelsSection.recentlyEdited',
                            {},
                            { defaultValue: 'Recently edited' },
                          )}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </section>
  )
}

export default RecentModelsSection
export { RecentModelsSection }
