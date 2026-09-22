import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface DocumentApi {
  id: string
  name: string
  category?: string
  kind?: string
  requires_signature?: boolean
  signed?: boolean
  signed_at?: string | null
  uploaded_at?: string
  file_url?: string | null
  s3_key?: string | null
  content_type?: string | null
}

const CATEGORY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  paperwork: {
    label: 'Paperwork',
    color: 'var(--mol-color-primary)',
    bg: 'color-mix(in srgb, var(--mol-color-primary) 12%, transparent)',
  },
  reading: {
    label: 'Required reading',
    color: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 12%, transparent)',
  },
  reference: {
    label: 'Reference',
    color: 'var(--mol-color-text-tertiary)',
    bg: 'color-mix(in srgb, var(--mol-color-text-tertiary) 12%, transparent)',
  },
  general: {
    label: 'General',
    color: 'var(--embark-milestone)',
    bg: 'color-mix(in srgb, var(--embark-milestone) 12%, transparent)',
  },
}

export function DocumentViewer() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<DocumentApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!http || !id) return
    setLoading(true)
    try {
      const r = await http.get<DocumentApi>(`/api/documents/${id}`)
      setDoc(r.data)
      setError(null)
    } catch (_error) {
      // Fetch failed — error message is shown to the user via setError below
      setError(
        t('documentViewer.loadError', {}, { defaultValue: 'We could not load this document.' }),
      )
      setDoc(null)
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const onSign = useCallback(async () => {
    if (!http || !doc || busy || doc.signed) return
    setBusy(true)
    try {
      await http.put(`/api/documents/${doc.id}`, { signed: true })
      void track({
        name: 'onboarding.document_signed',
        properties: { document_id: doc.id },
      })
      await reload()
    } catch (_error) {
      // Sign failed — re-sync from the server so the UI reflects reality
      await reload()
    } finally {
      setBusy(false)
    }
  }, [http, doc, busy, reload])

  const onDownload = useCallback(() => {
    if (!doc) return
    if (doc.file_url) {
      window.open(doc.file_url, '_blank')
      return
    }
    // Fall back: dump the JSON metadata as a text file so the action is at
    // least observable while uploads are still being wired in real envs.
    const blob = new Blob(
      [
        JSON.stringify(
          { name: doc.name, id: doc.id, downloaded_at: new Date().toISOString() },
          null,
          2,
        ),
      ],
      {
        type: 'application/json',
      },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.name}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [doc])

  if (loading) {
    return (
      <div data-mol-id="page-document-viewer" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <p className={cm.textMuted}>
          {t('documentViewer.loading', {}, { defaultValue: 'Loading document…' })}
        </p>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div data-mol-id="page-document-viewer" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <nav className="uppercase tracking-[0.18em] text-on-surface-variant">
          <Link to="/documents">
            {t('documentViewer.breadcrumbDocs', {}, { defaultValue: 'Documents' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.emptyState, cm.sp('py', 12))}>
          <p className={cm.emptyStateTitle}>
            {t('documentViewer.notFound', {}, { defaultValue: 'Document not found' })}
          </p>
          <p className={cm.emptyStateDescription}>{error}</p>
        </div>
      </div>
    )
  }

  const categoryKey = doc.category && doc.category in CATEGORY_LABEL ? doc.category : 'general'
  const category = CATEGORY_LABEL[categoryKey]
  const categoryLabel = t(
    `documentViewer.category.${categoryKey}`,
    {},
    { defaultValue: category.label },
  )
  const requiresSignature = !!doc.requires_signature
  const signed = !!doc.signed

  return (
    <div data-mol-id="page-document-viewer" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <nav className="uppercase tracking-[0.18em] text-on-surface-variant">
        <Link to="/documents">
          {t('documentViewer.breadcrumbDocs', {}, { defaultValue: 'Documents' })}
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>
          {t('documentViewer.breadcrumbCurrent', {}, { defaultValue: 'Viewer' })} #
          {doc.id.slice(0, 6)}
        </span>
      </nav>

      <header className={cm.flex({ direction: 'col', gap: 'sm' })}>
        <span
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{
            color: category.color,
            background: category.bg,
            padding: '2px 12px',
            borderRadius: '999px',
            alignSelf: 'flex-start',
          }}
        >
          {categoryLabel}
        </span>
        <h1
          data-mol-id="document-title"
          className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight')}
        >
          {doc.name}
        </h1>
        <p className={cm.cn(cm.textMuted, 'text-sm')}>
          {doc.uploaded_at
            ? t(
                'documentViewer.uploadedAt',
                { date: new Date(doc.uploaded_at).toLocaleDateString() },
                {
                  defaultValue: `Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}`,
                },
              )
            : t('documentViewer.uploadedRecently', {}, { defaultValue: 'Recently uploaded' })}
        </p>
      </header>

      <div
        className="eo-two-col"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '32px',
        }}
      >
        <section>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
            style={{
              minHeight: '480px',
              background:
                'linear-gradient(135deg, rgba(13, 148, 136, 0.04) 0%, rgba(139, 92, 246, 0.04) 100%)',
              border: '1px dashed var(--color-border, var(--mol-color-border-secondary))',
              borderRadius: '20px',
              padding: '48px',
              textAlign: 'center',
            }}
          >
            <div>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '64px', color: 'var(--mol-color-primary)' }}
              >
                picture_as_pdf
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'), cm.sp('mt', 4), 'text-base')}>
                {t('documentViewer.previewTitle', {}, { defaultValue: 'Document preview' })}
              </p>
              <p
                className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'text-sm max-w-md')}
                style={{ margin: '8px auto 0' }}
              >
                {doc.file_url
                  ? t(
                      'documentViewer.previewBodyExternal',
                      {},
                      { defaultValue: 'Use the download button to open the file in a new tab.' },
                    )
                  : t(
                      'documentViewer.previewBody',
                      {},
                      {
                        defaultValue:
                          'When uploads are configured we render the file inline. For now, the metadata download lets you confirm the record is real.',
                      },
                    )}
              </p>
              <button
                type="button"
                data-mol-id="document-download-button"
                onClick={onDownload}
                className="font-bold"
                style={{
                  marginTop: '24px',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  background: 'var(--color-surface, var(--mol-color-surface))',
                  border: '1px solid var(--color-border, var(--mol-color-border-secondary))',
                  color: 'var(--color-foreground, #0f172a)',
                  cursor: 'pointer',
                }}
              >
                {doc.file_url
                  ? t('common.download', {}, { defaultValue: 'Download' })
                  : t('documentViewer.downloadMeta', {}, { defaultValue: 'Download metadata' })}
              </button>
            </div>
          </div>
        </section>

        <aside className={cm.flex({ direction: 'col', gap: 'md' })}>
          {requiresSignature && (
            <div
              className={cm.sp('p', 5)}
              style={{
                background: 'var(--color-surface, var(--mol-color-surface))',
                borderRadius: '14px',
                border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant">
                {t('documentViewer.signatureHeading', {}, { defaultValue: 'Signature required' })}
              </p>
              <p className={cm.cn(cm.sp('mt', 2), 'text-sm leading-relaxed')}>
                {signed
                  ? t(
                      'documentViewer.signedAt',
                      { date: doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : '' },
                      {
                        defaultValue: doc.signed_at
                          ? `Signed on ${new Date(doc.signed_at).toLocaleDateString()}.`
                          : 'You have signed this document.',
                      },
                    )
                  : t(
                      'documentViewer.signatureBody',
                      {},
                      {
                        defaultValue:
                          'Read the document, then click below to sign and acknowledge.',
                      },
                    )}
              </p>
              <button
                type="button"
                data-mol-id="document-sign-button"
                onClick={() => void onSign()}
                disabled={signed || busy}
                className="font-bold text-white transition-all duration-200"
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '12px',
                  width: '100%',
                  background: signed
                    ? 'linear-gradient(135deg, var(--mol-color-success) 0%, var(--mol-color-success) 100%)'
                    : 'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
                  boxShadow: signed ? 'none' : '0 10px 24px -10px rgba(13, 148, 136, 0.5)',
                  opacity: signed || busy ? 0.85 : 1,
                  cursor: signed ? 'default' : busy ? 'wait' : 'pointer',
                }}
              >
                {signed
                  ? t('documentViewer.signed', {}, { defaultValue: '✓ Signed & filed' })
                  : busy
                    ? t('documentViewer.signing', {}, { defaultValue: 'Signing…' })
                    : t('documentViewer.sign', {}, { defaultValue: 'Sign and acknowledge' })}
              </button>
            </div>
          )}
          <div
            className={cm.sp('p', 5)}
            style={{
              background:
                'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
              borderRadius: '14px',
              border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: 'var(--mol-color-secondary)' }}
            >
              {t('documentViewer.helpEyebrow', {}, { defaultValue: 'Need help?' })}
            </p>
            <p className={cm.cn(cm.sp('mt', 2), 'text-sm leading-relaxed')}>
              {t(
                'documentViewer.helpBody',
                {},
                {
                  defaultValue:
                    'People & Culture answers handbook questions in #ask-people on Slack.',
                },
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
