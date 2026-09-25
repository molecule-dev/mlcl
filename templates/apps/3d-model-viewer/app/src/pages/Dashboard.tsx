// Phase 1 baseline — verbatim JSX of design-3d-model-viewer-dashboard.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ActivityFeed from '../components/ActivityFeed.js'
import DashboardStatsRow from '../components/DashboardStatsRow.js'
import DashboardTopBar from '../components/DashboardTopBar.js'
import FloatingUploadButton from '../components/FloatingUploadButton.js'
import ModelCard from '../components/ModelCard.js'
import StorageBreakdown from '../components/StorageBreakdown.js'
import WelcomeHeader from '../components/WelcomeHeader.js'

interface Model {
  id: string
  name?: string
  format?: string
  polygon_count?: number
  thumbnail_url?: string
  updated_at?: string
}

function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const [models, setModels] = useState<Model[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)

  useEffect(() => {
    // Cancellation guard. Without it, navigating away while this fetch is in
    // flight aborts it, the catch below cannot tell that from a real API
    // failure, and it logs "dashboard.fetchModels HttpError: Failed to fetch"
    // — a console error on a page the user already left. Any spec asserting a
    // clean console then fails on a route it never visited.
    let cancelled = false
    http
      .get<Model[] | { data: Model[] }>('/api/models')
      .then((res) => {
        if (cancelled) return
        const body = res.data
        setModels(Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [])
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // The dashboard degrades gracefully to an empty "Recent Models" grid;
        // log so a failing models API is still diagnosable.
        logError('dashboard.fetchModels', error)
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const recentModels = models.slice(0, 6)
  const userName = user?.name ?? user?.email?.split('@')[0] ?? 'Alex'

  return (
    <div className={cm.cn('bg-surface text-on-surface font-body antialiased')}>
      {/* Page top bar — md+ chrome riding inside the shell's Content (the
          shell's mobile TopBar replaces it below the breakpoint). */}
      <DashboardTopBar />
      <div
        className={cm.cn(
          cm.sp('px', 8),
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.stack(12),
          'pt-6 pb-24 md:pb-24',
        )}
      >
        {/* Welcome Header */}
        <WelcomeHeader name={userName} />
        {/* Stats Row */}
        <DashboardStatsRow />
        {/* Recent Models */}
        <section>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
            <h3 className={cm.cn(cm.textSize('xl'), 'font-headline text-on-surface')}>
              {t('dashboard.recentModels', {}, { defaultValue: 'Recent Models' })}
            </h3>
            <Link
              className={cm.cn(
                'text-sm font-medium text-primary hover:text-primary-container transition-colors',
              )}
              to="/models"
            >
              {t('common.viewAll', {}, { defaultValue: 'View All' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ gap: 6 }),
              cm.sp('pb', 8),
              'overflow-x-auto hide-scrollbar -mb-8 snap-x',
            )}
          >
            {modelsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={cm.cn(
                      'min-w-[320px] snap-start bg-surface-container-lowest rounded-xl animate-pulse',
                    )}
                    style={{ minHeight: 200 }}
                    aria-hidden="true"
                  />
                ))
              : recentModels.map((model) => (
                  <Link key={model.id} to={`/models/${model.id}`} className="contents">
                    <ModelCard model={model} />
                  </Link>
                ))}
          </div>
        </section>
        {/* Bottom Section: Activity & Storage */}
        <section className={cm.cn(cm.grid({ cols: 1, gap: 8 }), 'lg:grid-cols-3')}>
          {/* Activity Feed */}
          <ActivityFeed />
          {/* Storage Breakdown */}
          <StorageBreakdown />
        </section>
      </div>
      {/* Floating Upload Button (Glass & Gradient Rule) */}
      <FloatingUploadButton />
    </div>
  )
}

export default Dashboard
export { Dashboard, Dashboard as DashboardPage }
