import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LanguagePairBadge } from '../components/LanguagePairBadge.js'
import { PageHeading } from '../components/PageHeading.js'
import { type ProjectStatus, ProjectStatusPill } from '../components/ProjectStatusPill.js'
import {
  type ActivityEvent,
  TranslationActivityTimeline,
} from '../components/TranslationActivityTimeline.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ProjectFile {
  id: string
  name: string
  format: string
  segments: number
  progress: number
}

interface TargetProgress {
  lang: string
  progress: number
}

interface TeamMemberCard {
  name: string
  role: string
  initials: string
}

interface ApiProject {
  id?: unknown
  name?: unknown
  description?: unknown
  source_lang?: unknown
  target_langs?: unknown
  status?: unknown
  due_date?: unknown
  segments?: unknown
  stats?: unknown
}

interface ApiSegment {
  id?: unknown
  status?: unknown
  target_lang?: unknown
  position?: unknown
}

interface ApiTeamRow {
  email?: unknown
  role?: unknown
}

interface ApiActivityRow {
  id?: unknown
  actor?: unknown
  actor_initials?: unknown
  kind?: unknown
  text?: unknown
  timestamp?: unknown
}

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[.\-_+]/).filter(Boolean)
  if (parts.length === 0) return email.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function adaptActivity(row: ApiActivityRow, idx: number): ActivityEvent {
  return {
    id: String(row.id ?? `a_${idx}`),
    actor: String(row.actor ?? 'Workspace'),
    actor_initials: String(row.actor_initials ?? ''),
    kind: ((): ActivityEvent['kind'] => {
      const k = String(row.kind ?? 'commented')
      const allowed: ActivityEvent['kind'][] = [
        'approved',
        'uploaded',
        'mt_pass',
        'commented',
        'glossary_updated',
        'review_requested',
      ]
      return (allowed as string[]).includes(k) ? (k as ActivityEvent['kind']) : 'commented'
    })(),
    text: String(row.text ?? ''),
    timestamp: String(row.timestamp ?? ''),
  }
}

export function ProjectDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [project, setProject] = useState<ApiProject | null>(null)
  const [files, setFiles] = useState<ReadonlyArray<ProjectFile>>([])
  const [targetProgress, setTargetProgress] = useState<ReadonlyArray<TargetProgress>>([])
  const [team, setTeam] = useState<ReadonlyArray<TeamMemberCard>>([])
  const [activity, setActivity] = useState<ReadonlyArray<ActivityEvent>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/projects/${encodeURIComponent(id)}`).catch(() => null),
      http.get('/team').catch(() => null),
      http.get('/activity').catch(() => null),
    ])
      .then(([pRes, tRes, aRes]) => {
        if (cancelled) return
        const apiProject = unwrapSingle<ApiProject>(pRes)
        if (apiProject) {
          setProject(apiProject)
          const segments = Array.isArray(apiProject.segments)
            ? (apiProject.segments as ApiSegment[])
            : []
          const targets = Array.isArray(apiProject.target_langs) ? apiProject.target_langs : []
          // Build per-locale progress from segments
          const perLang = new Map<string, { total: number; approved: number }>()
          for (const lang of targets) {
            perLang.set(String(lang), { total: 0, approved: 0 })
          }
          for (const s of segments) {
            const tgt = String(s.target_lang ?? '')
            const bucket = perLang.get(tgt) ?? { total: 0, approved: 0 }
            bucket.total += 1
            if (String(s.status ?? '') === 'approved') bucket.approved += 1
            perLang.set(tgt, bucket)
          }
          setTargetProgress(
            Array.from(perLang.entries()).map(([lang, b]) => ({
              lang: lang.toLowerCase(),
              progress: b.total > 0 ? Math.round((b.approved / b.total) * 100) : 0,
            })),
          )
        }
        const teamList = unwrapList<ApiTeamRow>(tRes)
        setTeam(
          teamList.map((row) => {
            const email = String(row.email ?? '')
            return {
              name: email.split('@')[0] ?? email,
              role: String(row.role ?? 'translator'),
              initials: initialsFromEmail(email),
            }
          }),
        )
        const actList = unwrapList<ApiActivityRow>(aRes)
        setActivity(actList.map(adaptActivity))
        // Files: empty until /api/projects/:id/files endpoint exists
        setFiles([])
      })
      .catch(() => {
        if (!cancelled)
          setError(t('projectDetail.loadError', {}, { defaultValue: 'Failed to load project.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const overall =
    targetProgress.length > 0
      ? Math.round(targetProgress.reduce((sum, p) => sum + p.progress, 0) / targetProgress.length)
      : 0
  const projectName = project?.name
    ? String(project.name)
    : t('projectDetail.untitled', {}, { defaultValue: 'Untitled project' })
  const sourceLang = project?.source_lang ? String(project.source_lang).toLowerCase() : 'en'
  const firstTarget =
    Array.isArray(project?.target_langs) && project.target_langs.length > 0
      ? String(project.target_langs[0]).toLowerCase()
      : 'es'
  const rawStatus = project?.status ? String(project.status) : 'in_progress'
  const projectStatus: ProjectStatus =
    rawStatus === 'draft' ||
    rawStatus === 'in_progress' ||
    rawStatus === 'in_review' ||
    rawStatus === 'approved' ||
    rawStatus === 'archived' ||
    rawStatus === 'pending'
      ? rawStatus
      : 'in_progress'

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        cm.maxW('7xl'),
        cm.mxAuto,
        cm.minH('screen'),
        'w-full',
      )}
    >
      <PageHeading
        eyebrow={t('projectDetail.eyebrow', { id: id ?? '' }, { defaultValue: 'Project · {{id}}' })}
        title={projectName}
        subtitle={
          project?.description
            ? String(project.description)
            : t(
                'projectDetail.subtitle',
                {},
                { defaultValue: 'Project overview, files, and team activity.' },
              )
        }
        actions={
          <Link
            to={`/translate/${id ?? ''}`}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full inline-flex items-center gap-2 text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity shadow-sm shadow-primary/30',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              edit_note
            </span>
            {t('projectDetail.openEditor', {}, { defaultValue: 'Open editor' })}
          </Link>
        }
      />

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container text-on-error-container text-sm',
          )}
        >
          {error}
        </div>
      )}

      {loading && (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('projectDetail.loading', {}, { defaultValue: 'Loading project…' })}
        </p>
      )}

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-start')}>
        {/* Overview hero — gradient pane with donut + locale progress */}
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'lg:col-span-8 rounded-[1.75rem] bg-gradient-to-br from-primary to-primary-container text-on-primary relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-primary-fixed/80',
                )}
              >
                {t('projectDetail.overallLabel', {}, { defaultValue: 'Overall progress' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('4xl'),
                  'mt-2 font-extrabold tracking-tighter tabular-nums',
                )}
              >
                {overall}%
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'mt-3')}>
                <ProjectStatusPill status={projectStatus} />
                <LanguagePairBadge source={sourceLang} target={firstTarget} />
              </div>
            </div>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <DonutChart value={overall} />
            </div>
          </div>
          <div className={cm.cn(cm.sp('mt', 8), cm.flex({ direction: 'col', gap: 'sm' }))}>
            {targetProgress.length === 0 ? (
              <p className={cm.cn(cm.textSize('xs'), 'text-on-primary/80')}>
                {t(
                  'projectDetail.noTargets',
                  {},
                  { defaultValue: 'No target locales configured yet.' },
                )}
              </p>
            ) : (
              targetProgress.map((p) => (
                <div key={p.lang} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      cm.w(12),
                      cm.textSize('xs'),
                      'font-mono uppercase tracking-widest text-on-primary/80 font-bold',
                    )}
                  >
                    {p.lang}
                  </span>
                  <div className={cm.cn('flex-1 h-1.5 rounded-full bg-surface/20 overflow-hidden')}>
                    <div
                      className={cm.cn('h-full bg-surface rounded-full')}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <span
                    className={cm.cn(
                      cm.w(12),
                      cm.textSize('xs'),
                      'font-mono tabular-nums text-right',
                    )}
                  >
                    {p.progress}%
                  </span>
                </div>
              ))
            )}
          </div>
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
            )}
          />
        </section>

        {/* Team card */}
        <aside
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-4 rounded-[1.75rem] bg-surface-container-lowest border border-surface-container/50 shadow-sm',
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.team', {}, { defaultValue: 'Team' })}
          </h3>
          {team.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('projectDetail.teamEmpty', {}, { defaultValue: 'No team members yet.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {team.map((m) => (
                <li key={m.name} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(8),
                      cm.h(8),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'rounded-full bg-primary text-on-primary',
                    )}
                  >
                    {m.initials}
                  </span>
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{m.name}</p>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant uppercase tracking-widest font-bold',
                      )}
                    >
                      {m.role}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
        )}
      >
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('projectDetail.filesHeading', {}, { defaultValue: 'Files' })}
        </h3>
        {files.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('projectDetail.filesEmpty', {}, { defaultValue: 'No files uploaded yet.' })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={cm.cn('w-full text-sm min-w-[520px]')}>
              <thead>
                <tr className={cm.cn('text-on-surface-variant')}>
                  <th
                    className={cm.cn(
                      'text-left py-2 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('projectDetail.col.name', {}, { defaultValue: 'File' })}
                  </th>
                  <th
                    className={cm.cn(
                      'text-left py-2 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('form.format', {}, { defaultValue: 'Format' })}
                  </th>
                  <th
                    className={cm.cn(
                      'text-right py-2 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('projectDetail.col.segments', {}, { defaultValue: 'Segments' })}
                  </th>
                  <th
                    className={cm.cn(
                      'text-left py-2 font-bold text-[10px] uppercase tracking-widest',
                    )}
                  >
                    {t('nav.progress', {}, { defaultValue: 'Progress' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-surface-container')}>
                {files.map((f) => (
                  <tr
                    key={f.id}
                    className={cm.cn('hover:bg-surface-container-low transition-colors')}
                  >
                    <td className={cm.cn('py-3 font-mono')}>{f.name}</td>
                    <td className={cm.cn('py-3')}>
                      <span
                        className={cm.cn(
                          'inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-secondary-fixed/50 text-on-secondary-fixed font-mono',
                        )}
                      >
                        {f.format}
                      </span>
                    </td>
                    <td
                      className={cm.cn(
                        'py-3 text-right tabular-nums font-mono text-on-surface-variant',
                      )}
                    >
                      {f.segments}
                    </td>
                    <td className={cm.cn('py-3 w-72')}>
                      <div className={cm.cn('flex items-center gap-3')}>
                        <div
                          className={cm.cn(
                            'flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden',
                          )}
                        >
                          <div
                            className={cm.cn(
                              'h-full rounded-full',
                              f.progress === 100 ? 'bg-success' : 'bg-primary',
                            )}
                            style={{ width: `${f.progress}%` }}
                          />
                        </div>
                        <span
                          className={cm.cn(
                            'font-mono text-xs font-bold text-primary tabular-nums w-10 text-right',
                          )}
                        >
                          {f.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl border border-surface-container/50 shadow-sm',
        )}
      >
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mb', 4),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('projectDetail.activityHeading', {}, { defaultValue: 'Project activity' })}
        </h3>
        {activity.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('projectDetail.activityEmpty', {}, { defaultValue: 'No project activity yet.' })}
          </p>
        ) : (
          <TranslationActivityTimeline events={activity} />
        )}
      </section>
    </div>
  )
}

interface DonutChartProps {
  value: number
}

function DonutChart({ value }: DonutChartProps) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" aria-hidden="true">
      <circle
        cx="48"
        cy="48"
        r={radius}
        stroke="color-mix(in srgb, white 20%, transparent)"
        strokeWidth="10"
        fill="none"
      />
      <circle
        cx="48"
        cy="48"
        r={radius}
        stroke="white"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="54" textAnchor="middle" fontSize="20" fontWeight="900" fill="white">
        {value}%
      </text>
    </svg>
  )
}

export default ProjectDetail
export { ProjectDetail as ProjectDetailPage }
