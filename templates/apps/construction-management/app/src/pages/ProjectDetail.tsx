import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectNav } from '../components/ProjectNav.js'
import { StatusBadge } from '../components/StatusBadge.js'
import { formatDateLong, formatMoney } from '../lib/format.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface RfiLite {
  id: string
  drawings_ref: string
  status: string
}

interface Project {
  id: string
  code: string
  name: string
  description: string
  phase: string
  budget_cents: number
  progress: number
  start_date: string | null
  end_date: string | null
}

const PHASE_TONE: Record<string, 'info' | 'progress' | 'success' | 'neutral'> = {
  preconstruction: 'info',
  site_work: 'info',
  foundations: 'progress',
  structure: 'progress',
  envelope: 'progress',
  mechanicals: 'progress',
  finishes: 'success',
  closeout: 'neutral',
}

export function ProjectDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [sheets, setSheets] = useState<Array<{ ref: string; open: number; total: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!projectId) return
    setLoading(true)
    Promise.all([
      http.get(`/api/projects/${projectId}`),
      http
        .get(`/api/rfis?project_id=${projectId}`)
        .then((res) => unwrapList<RfiLite>(res))
        .catch(() => [] as RfiLite[]),
    ])
      .then(([p, rfis]) => {
        if (cancelled) return
        setProject(unwrapSingle<Project>(p))
        // Group the RFIs' drawing references into the sheet ledger —
        // the same "current sheets" view the super's table shows.
        const byRef = new Map<string, { open: number; total: number }>()
        for (const rfi of rfis) {
          const ref = rfi.drawings_ref?.trim()
          if (!ref) continue
          const entry = byRef.get(ref) ?? { open: 0, total: 0 }
          entry.total += 1
          if (rfi.status === 'open') entry.open += 1
          byRef.set(ref, entry)
        }
        setSheets(
          [...byRef.entries()]
            .map(([ref, counts]) => ({ ref, ...counts }))
            .sort((a, b) => b.open - a.open || a.ref.localeCompare(b.ref))
            .slice(0, 6),
        )
      })
      .catch(() => {
        if (!cancelled) setError(t('projects.notFound', {}, { defaultValue: 'Project not found' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, projectId, t])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loading', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  }
  if (error || !project) {
    return (
      <div className={cm.cn(cm.sp('py', 16), cm.textCenter)}>
        <p className={'text-error'}>{error}</p>
        <Link
          to="/projects"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.textSize('sm'),
            'text-primary hover:underline inline-block',
          )}
        >
          {t('projects.backToList', {}, { defaultValue: '← Back to projects' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn('px-4 md:px-8', cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant uppercase tracking-wider',
            )}
          >
            {project.code || '—'}
          </p>
          <h1 className={cm.cn('text-2xl md:text-3xl', cm.fontWeight('bold'), 'wrap-anywhere')}>
            {project.name}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {formatDateLong(project.start_date)} → {formatDateLong(project.end_date) || '—'}
          </p>
        </div>
        <StatusBadge
          value={project.phase}
          tone={PHASE_TONE[project.phase] ?? 'neutral'}
          translationKeyPrefix="projects.phase"
        />
      </header>

      <ProjectNav projectId={project.id} />

      {/* Sheets referenced in RFIs — the current-drawings ledger */}
      {sheets.length > 0 && (
        <section data-mol-id="project-sheets" className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <div
            className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}
          >
            <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {t('project.sheets', {}, { defaultValue: 'Sheets referenced in RFIs' })}
            </h2>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'project.sheetsHint',
                {},
                { defaultValue: 'Open RFIs cite these drawing references' },
              )}
            </span>
          </div>
          <ul className={cm.cn(cm.sp('mt', 4), 'divide-y divide-outline-variant')}>
            {sheets.map((s) => (
              <li
                key={s.ref}
                className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}
              >
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-primary whitespace-nowrap',
                  )}
                >
                  {s.ref}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {s.open > 0
                    ? t(
                        'project.sheetsOpen',
                        { count: s.total, open: s.open },
                        { defaultValue: '{{count}} RFI(s) · {{open}} open' },
                      )
                    : t(
                        'project.sheetsTotal',
                        { count: s.total },
                        { defaultValue: '{{count}} RFI(s)' },
                      )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
        <section className={cm.cn(cm.card(), cm.sp('p', 6), 'lg:col-span-2')}>
          <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('project.about', {}, { defaultValue: 'About this project' })}
          </h2>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('sm'),
              'text-on-surface-variant',
              'leading-relaxed',
            )}
          >
            {project.description ||
              t('project.noDescription', {}, { defaultValue: 'No description yet.' })}
          </p>
          <div className={cm.cn(cm.sp('mt', 6), 'space-y-2')}>
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('project.progressLabel', {}, { defaultValue: 'Progress' })}
              </span>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t(
                  'projects.progress',
                  { progress: project.progress },
                  { defaultValue: '{{progress}}% complete' },
                )}
              </span>
            </div>
            <div className={'h-3 rounded-full bg-surface-container-highest overflow-hidden'}>
              <div
                className={'h-full bg-primary'}
                style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
              />
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
          <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('project.vitals', {}, { defaultValue: 'Vitals' })}
          </h2>
          <dl className={cm.cn(cm.sp('mt', 4), 'space-y-4')}>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'uppercase tracking-wider',
                )}
              >
                {t('project.budget', {}, { defaultValue: 'Budget' })}
              </dt>
              <dd className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {formatMoney(project.budget_cents)}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'uppercase tracking-wider',
                )}
              >
                {t('project.phase', {}, { defaultValue: 'Current phase' })}
              </dt>
              <dd className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'capitalize')}>
                {t(
                  `projects.phase.${project.phase}`,
                  {},
                  { defaultValue: project.phase.replace(/_/g, ' ') },
                )}
              </dd>
            </div>
          </dl>
          <div className={cm.cn(cm.sp('mt', 6), 'space-y-2')}>
            <Link
              to={`/projects/${project.id}/logs`}
              data-mol-id="project-detail-open-logs"
              className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline block')}
            >
              {t('project.openDailyLogs', {}, { defaultValue: 'Open daily logs →' })}
            </Link>
            <Link
              to={`/projects/${project.id}/punch`}
              data-mol-id="project-detail-open-punch"
              className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline block')}
            >
              {t('project.openPunch', {}, { defaultValue: 'Open punch list →' })}
            </Link>
            <Link
              to={`/projects/${project.id}/rfis`}
              data-mol-id="project-detail-open-rfis"
              className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline block')}
            >
              {t('project.openRfis', {}, { defaultValue: 'Open RFIs →' })}
            </Link>
            <Link
              to={`/projects/${project.id}/subs`}
              data-mol-id="project-detail-open-subs"
              className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline block')}
            >
              {t('project.openSubs', {}, { defaultValue: 'Open subcontractors →' })}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProjectDetail
