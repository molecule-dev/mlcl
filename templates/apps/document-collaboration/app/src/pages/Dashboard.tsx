import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { DocumentVisibility } from '../components/DocumentVisibilityPill.js'
import type { PresenceCollaborator } from '../components/PresenceAvatars.js'
import { QuillonActivityRow, type QuillonActivityType } from '../components/QuillonActivityRow.js'
import { QuillonDocumentCard } from '../components/QuillonDocumentCard.js'
import { QuillonKpiCard } from '../components/QuillonKpiCard.js'
import { QuillonStudioHero } from '../components/QuillonStudioHero.js'
import { unwrapList } from '../lib/unwrap.js'

interface DocumentRow {
  id: string
  owner_id: string
  title: string
  content: { blocks?: Array<{ type: string; text?: string }> } | null
  status: string
  is_template: boolean
  version: number
  trashed_at: string | null
  updated_at: string
  share_role?: string
}

interface ActivityRow {
  id: string
  type: QuillonActivityType
  actor: string
  description: string
  created_at: string
  href?: string | null
  unread?: boolean
}

function previewOf(doc: DocumentRow): string {
  const blocks = doc.content?.blocks ?? []
  const para = blocks.find((b) => b.type === 'paragraph' && b.text)
  if (para?.text) return para.text
  const heading = blocks.find((b) => b.type === 'heading' && b.text)
  if (heading?.text) return heading.text
  return ''
}

function visibilityOf(doc: DocumentRow): DocumentVisibility {
  if (doc.status === 'published') return 'public'
  if (doc.status === 'archived') return 'restricted'
  return 'private'
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [shared, setShared] = useState<DocumentRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/documents'),
      http.get('/api/documents/shared').catch(() => null),
      http.get('/api/notifications'),
    ])
      .then(([dRes, sRes, aRes]) => {
        if (cancelled) return
        setDocs(unwrapList<DocumentRow>(dRes))
        setShared(unwrapList<DocumentRow>(sRes))
        setActivity(unwrapList<ActivityRow>(aRes))
        setError(null)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('dashboard.error', {}, { defaultValue: 'Could not load the studio.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const totalDocs = docs.length
  const sharedCount = shared.length
  const draftDocs = docs.filter((d) => d.status === 'draft').length
  const publishedDocs = docs.filter((d) => d.status === 'published').length

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}
      data-testid="dashboard-root"
    >
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('dashboard.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} studio' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Manuscripts' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subtitle',
              {},
              { defaultValue: 'Recent drafts, shared works, and the day\u2019s edits.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <Link
            to="/templates"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline text-on-surface hover:bg-surface-container',
            )}
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = (await http.post('/api/documents', { title: 'Untitled' })) as
                  { id?: string } | { data?: { id?: string } }
                const created = (res as { data?: { id?: string } }).data ?? (res as { id?: string })
                if (created?.id) navigate(`/doc/${created.id}`)
              } catch (error) {
                logError('dashboard.createDoc', error)
                setError(
                  t('dashboard.createFailed', {}, { defaultValue: 'Could not create a document.' }),
                )
              }
            }}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('extrabold'),
              cm.textSize('sm'),
              'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
            )}
            data-testid="dashboard-new-doc"
          >
            {t('dashboard.newCta', {}, { defaultValue: 'New document' })}
          </button>
        </div>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border-l-4 border-l-error bg-error/5 text-sm text-error',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <QuillonStudioHero
        wordsToday={Math.max(0, totalDocs * 120)}
        documentsToday={Math.min(totalDocs, 6)}
        activeCollaborators={sharedCount}
      />

      <section className={cm.grid({ cols: 4, gap: 'md' })}>
        <QuillonKpiCard
          tone="primary"
          label={t('dashboard.kpi.docs', {}, { defaultValue: 'All manuscripts' })}
          value={totalDocs}
          hint={t('dashboard.kpi.docsHint', {}, { defaultValue: 'Drafts + published' })}
        />
        <QuillonKpiCard
          tone="info"
          label={t('status.shared', {}, { defaultValue: 'Shared' })}
          value={sharedCount}
          hint={t('dashboard.kpi.sharedHint', {}, { defaultValue: 'Sent to you' })}
        />
        <QuillonKpiCard
          tone="warning"
          label={t('dashboard.kpi.drafts', {}, { defaultValue: 'In draft' })}
          value={draftDocs}
          hint={t('dashboard.kpi.draftsHint', {}, { defaultValue: 'Private to you' })}
        />
        <QuillonKpiCard
          tone="success"
          label={t('status.published', {}, { defaultValue: 'Published' })}
          value={publishedDocs}
          hint={t('dashboard.kpi.publishedHint', {}, { defaultValue: 'Public manuscripts' })}
        />
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
        <section className={cm.cn('col-span-12 lg:col-span-8 space-y-4')}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.recentHeading', {}, { defaultValue: 'Recent manuscripts' })}
            </h2>
          </div>
          {loading ? (
            <p className={cm.cn(cm.sp('py', 16), 'text-center text-on-surface-variant')}>
              {t('dashboard.loading', {}, { defaultValue: 'Opening the studio…' })}
            </p>
          ) : docs.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-2xl border-2 border-dashed border-outline-variant text-center text-sm text-on-surface-variant',
              )}
              data-testid="dashboard-empty"
            >
              {t(
                'dashboard.empty',
                {},
                { defaultValue: 'No manuscripts yet — start with the New document button.' },
              )}
            </div>
          ) : (
            <div
              className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2 xl:grid-cols-3')}
              data-testid="dashboard-doc-grid"
            >
              {docs.slice(0, 6).map((d) => {
                const cardCollab: PresenceCollaborator[] = [{ id: d.owner_id, initials: 'YOU' }]
                return (
                  <QuillonDocumentCard
                    key={d.id}
                    id={d.id}
                    title={d.title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
                    preview={previewOf(d)}
                    visibility={visibilityOf(d)}
                    collaborators={cardCollab}
                    updatedAt={d.updated_at}
                  />
                )
              })}
            </div>
          )}
        </section>

        <section
          className={cm.cn(
            'col-span-12 lg:col-span-4',
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant shadow-sm',
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.activityHeading', {}, { defaultValue: 'What\u2019s happening' })}
            </h2>
            <Link
              to="/notifications"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('dashboard.viewFeed', {}, { defaultValue: 'Feed →' })}
            </Link>
          </div>
          {activity.length === 0 ? (
            <p
              className={cm.cn(
                cm.sp('mt', 6),
                cm.sp('py', 8),
                'text-center text-sm text-on-surface-variant',
              )}
              data-testid="dashboard-activity-empty"
            >
              {t('dashboard.noActivity', {}, { defaultValue: 'No recent activity.' })}
            </p>
          ) : (
            <ol className={cm.cn(cm.sp('mt', 4), 'space-y-1')} data-testid="dashboard-activity">
              {activity.slice(0, 6).map((ev) => (
                <li key={ev.id}>
                  <QuillonActivityRow
                    id={ev.id}
                    type={ev.type}
                    actor={ev.actor}
                    description={ev.description}
                    createdAt={ev.created_at}
                    href={ev.href ?? undefined}
                    unread={ev.unread}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
