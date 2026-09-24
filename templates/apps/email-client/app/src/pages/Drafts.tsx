import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import { MeridianAppShell } from '../components/MeridianAppShell.js'
import { MeridianThreadRow } from '../components/MeridianThreadRow.js'
import type { EmailRow } from '../lib/api.js'
import { emailToThreadRow, ensureArray, formatRelativeTimestamp } from '../lib/api.js'
import { useEmails } from '../lib/useEmails.js'
import { useIsMobile } from '../lib/useIsMobile.js'

export function Drafts() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [refreshKey, setRefreshKey] = useState(0)
  const {
    emails: drafts,
    loading,
    error,
    refetch,
  } = useEmails({
    folder: 'drafts',
    refreshKey,
    limit: 100,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  // Desktop keeps a default selection; mobile collapses to list → detail.
  const selected: EmailRow | null = useMemo(() => {
    if (isMobile) return (drafts.find((d) => d.id === selectedId) ?? null) as EmailRow | null
    return (drafts.find((d) => d.id === selectedId) ?? drafts[0] ?? null) as EmailRow | null
  }, [drafts, selectedId, isMobile])

  const deleteDraft = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/api/drafts/${id}`)
        track({ name: 'draft.deleted', properties: { draft_id: id } })
      } finally {
        setSelectedId(null)
        setRefreshKey((k) => k + 1)
        void refetch()
      }
    },
    [http, refetch],
  )

  return (
    <MeridianAppShell refreshKey={refreshKey}>
      <div className={cm.cn(cm.flex({}), 'h-full overflow-hidden')} data-mol-id="page-drafts">
        <section
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            isMobile
              ? selected
                ? 'hidden'
                : cm.w('full')
              : 'w-[400px] shrink-0 border-r border-outline-variant/40',
            'bg-surface',
          )}
        >
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 4),
              cm.sp('py', 3),
              'border-b border-outline-variant/40 bg-surface-container-lowest sticky top-0 z-10',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('meridian.drafts.title', {}, { defaultValue: 'Drafts' })}
              </h2>
              <span
                className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                data-mol-id="drafts-count"
              >
                {t(
                  'meridian.drafts.count',
                  { count: drafts.length },
                  { defaultValue: '{{count}} messages' },
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/compose')}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                cm.cursorPointer,
                'rounded-full bg-primary/10 text-primary-dark hover:bg-primary/20 transition-colors',
              )}
              data-mol-id="drafts-new"
            >
              {t('status.new', {}, { defaultValue: 'New' })}
            </button>
          </header>
          <div className={cm.cn(cm.flex1, 'overflow-y-auto')} data-mol-id="drafts-list">
            {loading && (
              <div className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-sm')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </div>
            )}
            {!loading && error && (
              <div className={cm.cn(cm.sp('p', 6), 'text-error text-sm')}>{error}</div>
            )}
            {!loading && drafts.length === 0 && (
              <div
                className={cm.cn(cm.sp('p', 6), 'text-on-surface-variant text-sm')}
                data-mol-id="drafts-empty"
              >
                {t(
                  'meridian.drafts.empty',
                  {},
                  { defaultValue: 'No drafts yet — start composing.' },
                )}
              </div>
            )}
            {drafts.map((d) => (
              <MeridianThreadRow
                key={d.id}
                thread={emailToThreadRow(d, {})}
                active={d.id === selected?.id}
                onClick={() => setSelectedId(d.id)}
              />
            ))}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.flex1,
            isMobile && !selected && 'hidden',
            'min-w-0 bg-surface-container-lowest overflow-y-auto relative',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'absolute inset-0 pointer-events-none',
            )}
            aria-hidden="true"
          >
            <span className="text-[10rem] font-black uppercase tracking-widest text-primary opacity-[0.03] -rotate-12 select-none">
              {t('meridian.drafts.watermark', {}, { defaultValue: 'Draft' })}
            </span>
          </div>
          {selected ? (
            <div
              className={cm.cn(
                cm.maxW('4xl'),
                cm.mxAuto,
                cm.sp('p', 8),
                'relative z-10 flex flex-col gap-6',
              )}
            >
              <header className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
                <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      data-mol-id="drafts-back"
                      aria-label={t('common.back', {}, { defaultValue: 'Back' })}
                      className={cm.cn(
                        cm.sp('p', 2),
                        cm.cursorPointer,
                        'rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors',
                      )}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        arrow_back
                      </span>
                    </button>
                  )}
                  <h1
                    className={cm.cn(
                      'text-2xl font-extrabold tracking-tight text-on-surface leading-tight',
                    )}
                    data-mol-id="drafts-subject"
                  >
                    {selected.subject ||
                      t('meridian.inbox.noSubject', {}, { defaultValue: '(no subject)' })}
                  </h1>
                </div>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    'text-on-surface-variant shrink-0',
                  )}
                >
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    cloud_done
                  </span>
                  {t(
                    'meridian.drafts.lastSaved',
                    { at: formatRelativeTimestamp(selected.updated_at ?? selected.created_at) },
                    { defaultValue: 'Saved {{at}}' },
                  )}
                </span>
              </header>

              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm space-y-4',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('pb', 3),
                    'border-b border-outline-variant/40',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('meridian.drafts.to', {}, { defaultValue: 'To' })}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface')}
                    data-mol-id="drafts-recipients"
                  >
                    {ensureArray(selected.to).join(', ') ||
                      t(
                        'meridian.drafts.noRecipients',
                        {},
                        { defaultValue: '(no recipients yet)' },
                      )}
                  </span>
                </div>
                <pre
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface leading-relaxed whitespace-pre-wrap font-sans',
                  )}
                  data-mol-id="drafts-body"
                >
                  {selected.body ||
                    t('meridian.drafts.noBody', {}, { defaultValue: '(empty body)' })}
                </pre>
              </article>

              <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                <button
                  type="button"
                  onClick={() => navigate(`/compose?draft=${selected.id}`)}
                  data-mol-id="drafts-continue"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    edit
                  </span>
                  {t('meridian.drafts.continue', {}, { defaultValue: 'Continue editing' })}
                </button>
                <ConfirmButton
                  label={t('meridian.drafts.delete', {}, { defaultValue: 'Delete draft' })}
                  confirmLabel={t(
                    'meridian.drafts.confirmDelete',
                    {},
                    { defaultValue: 'Tap again to delete' },
                  )}
                  onConfirm={() => deleteDraft(selected.id)}
                  disarmSeconds={6}
                  color="error"
                  data-mol-id="drafts-delete"
                />
              </div>
            </div>
          ) : (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-full text-on-surface-variant relative z-10',
              )}
            >
              {t('meridian.drafts.selectDraft', {}, { defaultValue: 'Select a draft to preview.' })}
            </div>
          )}
        </section>
      </div>
    </MeridianAppShell>
  )
}

export default Drafts
