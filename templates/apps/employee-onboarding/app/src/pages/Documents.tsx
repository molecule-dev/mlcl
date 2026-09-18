import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatTriad } from '../components/StatTriad.js'

interface DocumentApi {
  id: string
  name: string
  category?: string
  requires_signature?: boolean
  signed?: boolean
  uploaded_at?: string
  file_url?: string
}

const FILE_TYPE_COLOR: Record<string, string> = {
  pdf: '#b91c1c',
  doc: '#1d4ed8',
  img: '#92400e',
  default: '#556377',
}

function fileType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? 'default'
  if (['pdf'].includes(ext)) return 'pdf'
  if (['doc', 'docx'].includes(ext)) return 'doc'
  if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return 'img'
  return 'default'
}

export function Documents() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [docs, setDocs] = useState<DocumentApi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!http) return
    http
      .get<DocumentApi[]>('/api/documents')
      .then((r) => setDocs(r.data ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [http])

  const required = docs.filter((d) => d.requires_signature)
  const signed = docs.filter((d) => d.signed)
  const pending = required.filter((d) => !d.signed)

  return (
    <div data-mol-id="page-documents" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <header>
        <p
          className="text-[11px] font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--mol-color-primary)' }}
        >
          {t('documents.eyebrow', {}, { defaultValue: 'Onboarding · Documents' })}
        </p>
        <h1 className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-3xl tracking-tight')}>
          {t('documents.title', {}, { defaultValue: 'Everything you need to read & sign.' })}
        </h1>
        <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'max-w-2xl')}>
          {t(
            'documents.subtitle',
            {},
            { defaultValue: 'Your handbook, forms, and signed agreements — all in one place.' },
          )}
        </p>
      </header>

      <StatTriad
        items={[
          {
            id: 'all',
            label: t('documents.stat.all', {}, { defaultValue: 'All documents' }),
            value: String(docs.length),
            icon: 'folder',
            accent: '#0f766e',
            helper: t('documents.stat.allHelper', {}, { defaultValue: 'Across categories' }),
          },
          {
            id: 'pending',
            label: t('documents.stat.pending', {}, { defaultValue: 'Pending signatures' }),
            value: String(pending.length),
            icon: 'edit_note',
            accent: '#92400e',
            helper: t(
              'documents.stat.pendingHelper',
              {},
              { defaultValue: 'Required for completion' },
            ),
            trend:
              pending.length > 0
                ? {
                    label: t('documents.stat.actionNeeded', {}, { defaultValue: 'Sign now' }),
                    positive: false,
                  }
                : undefined,
          },
          {
            id: 'signed',
            label: t('documents.stat.signed', {}, { defaultValue: 'Signed' }),
            value: String(signed.length),
            icon: 'verified',
            accent: '#166534',
            helper: t('documents.stat.signedHelper', {}, { defaultValue: 'Stored securely' }),
          },
        ]}
      />

      {loading ? (
        <p className={cm.textMuted}>
          {t('documents.loading', {}, { defaultValue: 'Loading documents…' })}
        </p>
      ) : docs.length === 0 ? (
        <div className={cm.cn(cm.emptyState, cm.sp('py', 12))}>
          <div className={cm.emptyStateIcon}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '40px', color: 'var(--mol-color-primary)' }}
            >
              folder_open
            </span>
          </div>
          <p className={cm.emptyStateTitle}>
            {t('documents.empty.title', {}, { defaultValue: 'No documents yet' })}
          </p>
          <p className={cm.emptyStateDescription}>
            {t(
              'documents.empty.body',
              {},
              { defaultValue: 'Documents added by your team will appear here.' },
            )}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {docs.map((doc) => {
            const type = fileType(doc.name)
            const color = FILE_TYPE_COLOR[type] ?? FILE_TYPE_COLOR.default
            const status = doc.signed ? 'signed' : doc.requires_signature ? 'required' : 'optional'
            const STATUS_PALETTE = {
              signed: {
                fg: '#166534',
                bg: 'rgba(22, 163, 74, 0.10)',
                label: t('documents.status.signed', {}, { defaultValue: 'Signed' }),
              },
              required: {
                fg: '#92400e',
                bg: 'rgba(232, 147, 22, 0.12)',
                label: t('documents.status.required', {}, { defaultValue: 'Required' }),
              },
              optional: {
                fg: '#556377',
                bg: 'rgba(100, 116, 139, 0.10)',
                label: t('documents.status.optional', {}, { defaultValue: 'Optional' }),
              },
            } as const
            const st = STATUS_PALETTE[status]
            return (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                data-mol-id={`document-card-${doc.id}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 5),
                  'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                )}
                style={{
                  background: 'var(--color-surface, var(--mol-color-surface))',
                  borderRadius: '14px',
                  border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
                }}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <div
                    className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: `color-mix(in srgb, ${color} 14%, transparent)`,
                      color,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                      description
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{
                      color: st.fg,
                      background: st.bg,
                      padding: '2px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    {st.label}
                  </span>
                </div>
                <h3
                  className={cm.fontWeight('semibold')}
                  style={{ fontSize: '15px', color: 'var(--color-foreground, #0f172a)' }}
                >
                  {doc.name}
                </h3>
                <p className={cm.cn(cm.textMuted, 'text-xs')}>
                  {doc.uploaded_at
                    ? t(
                        'documents.uploadedOn',
                        { date: new Date(doc.uploaded_at).toLocaleDateString() },
                        {
                          defaultValue: `Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}`,
                        },
                      )
                    : t('documents.uploadedRecently', {}, { defaultValue: 'Recently uploaded' })}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
