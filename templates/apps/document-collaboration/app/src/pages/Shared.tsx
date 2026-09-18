import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { DocumentVisibility } from '../components/DocumentVisibilityPill.js'
import { QuillonDocumentCard } from '../components/QuillonDocumentCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface SharedDoc {
  id: string
  owner_id: string
  title: string
  status: 'draft' | 'published' | 'archived'
  content: { blocks?: Array<{ type: string; text?: string }> } | null
  updated_at: string
  share_role: 'editor' | 'commenter' | 'viewer'
}

const ROLE_TONE: Record<SharedDoc['share_role'], string> = {
  editor: 'bg-primary/15 text-primary',
  commenter: 'bg-warning/15 text-warning',
  viewer: 'bg-info/15 text-info',
}

function previewOf(doc: SharedDoc): string {
  const blocks = doc.content?.blocks ?? []
  const para = blocks.find((b) => b.type === 'paragraph' && b.text)
  return para?.text ?? ''
}

function visibilityOf(doc: SharedDoc): DocumentVisibility {
  if (doc.status === 'published') return 'public'
  return 'restricted'
}

function initialsFor(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9]/g, '')
  return (cleaned.slice(0, 2) || 'UU').toUpperCase()
}

export function Shared() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [docs, setDocs] = useState<SharedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/documents/shared')
      .then((res) => {
        if (cancelled) return
        setDocs(unwrapList<SharedDoc>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('shared.loadFailed', {}, { defaultValue: 'Could not load shared documents.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')} data-testid="shared-root">
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('shared.eyebrow', {}, { defaultValue: 'Studio collaborations' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {t('shared.heading', {}, { defaultValue: 'Shared with me' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'shared.subtitle',
              {},
              { defaultValue: 'Manuscripts, briefs, and notes from the rest of the studio.' },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border-l-4 border-l-error bg-error/5 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : docs.length === 0 ? (
        <p
          className={cm.cn(cm.sp('py', 16), 'text-center text-sm text-on-surface-variant')}
          data-testid="shared-empty"
        >
          {t('shared.empty', {}, { defaultValue: 'Nothing has been shared with you yet.' })}
        </p>
      ) : (
        <div
          className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2 xl:grid-cols-3')}
          data-testid="shared-grid"
        >
          {docs.map((d) => (
            <QuillonDocumentCard
              key={d.id}
              id={d.id}
              title={d.title || t('status.untitled', {}, { defaultValue: 'Untitled' })}
              preview={previewOf(d)}
              visibility={visibilityOf(d)}
              collaborators={[{ id: d.owner_id, initials: initialsFor(d.owner_id) }]}
              updatedAt={d.updated_at}
              footerSlot={
                <span
                  className={cm.cn(
                    cm.fontWeight('extrabold'),
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-widest',
                    ROLE_TONE[d.share_role],
                  )}
                  data-testid={`shared-role-${d.id}`}
                >
                  {t(
                    `shared.role.${d.share_role}`,
                    {},
                    {
                      defaultValue:
                        d.share_role === 'editor'
                          ? 'Editor'
                          : d.share_role === 'commenter'
                            ? 'Commenter'
                            : 'Viewer',
                    },
                  )}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Shared
