import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { GridPreview } from '../components/GridPreview.js'
import { WorkbenchLayout } from '../components/WorkbenchLayout.js'

const SAMPLE_PREVIEW = {
  columns: [
    { id: 'objective', label: 'Objective', type: 'text' as const, width: 240 },
    { id: 'owner', label: 'Owner', type: 'select' as const, width: 130 },
    { id: 'progress', label: 'Progress', type: 'percent' as const, width: 110 },
    { id: 'target', label: 'Target', type: 'currency' as const, width: 130 },
    { id: 'status', label: 'Status', type: 'select' as const, width: 110 },
  ],
  rows: [
    [
      { display: 'Lift NRR to 115% by Q4', type: 'text' as const },
      { display: 'Aanya', type: 'select' as const, tint: 'violet' as const },
      { display: '78%', type: 'percent' as const, numeric: true },
      { display: '$2.4M', type: 'currency' as const, numeric: true },
      { display: 'On track', type: 'select' as const, tint: 'emerald' as const },
    ],
    [
      { display: 'Reduce ICP CAC to <12 mo', type: 'text' as const },
      { display: 'Mike', type: 'select' as const, tint: 'primary' as const },
      { display: '52%', type: 'percent' as const, numeric: true, selected: true },
      { display: '$840k', type: 'currency' as const, numeric: true },
      { display: 'Watch', type: 'select' as const, tint: 'amber' as const },
    ],
    [
      { display: 'Grow Pro tier expansion 30%', type: 'text' as const },
      { display: 'Rosa', type: 'select' as const, tint: 'rose' as const },
      { display: '94%', type: 'percent' as const, numeric: true },
      { display: '$1.1M', type: 'currency' as const, numeric: true },
      { display: 'Ahead', type: 'select' as const, tint: 'emerald' as const },
    ],
  ],
}

const HIGHLIGHTS = [
  { icon: 'function', label: 'Live formulas', value: 47 },
  { icon: 'view_kanban', label: 'Pre-built views', value: 6 },
  { icon: 'link', label: 'Linked tables', value: 3 },
  { icon: 'bolt', label: 'Automations', value: 4 },
]

export function TemplatePreview() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function instantiate(): Promise<void> {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      const res = await http.post<{ id: string }>(`/spreadsheet-templates/${id}/instantiate`, {})
      const created = res.data
      if (created?.id) navigate(`/workbooks/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <WorkbenchLayout>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'text-xs font-bold text-on-surface-variant',
        )}
      >
        <Link
          to="/templates"
          className={'hover:text-primary transition-colors uppercase tracking-widest'}
        >
          {t('nav.templates', {}, { defaultValue: 'Templates' })}
        </Link>
        <span className={'material-symbols-outlined text-base'} aria-hidden="true">
          chevron_right
        </span>
        <span className="uppercase tracking-widest text-on-surface">{id || 'tpl_okrs'}</span>
      </div>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 10),
            'col-span-12 lg:col-span-8 min-h-[320px] bg-gradient-to-br from-primary to-primary-dark rounded-[2rem] text-on-primary relative overflow-hidden shadow-xl shadow-primary/20',
          )}
        >
          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-on-primary/80">
              {t('templatePreview.eyebrow', {}, { defaultValue: 'Template · Operating Cadence' })}
            </p>
            <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mt-3')}>
              {t(
                'templatePreview.headline',
                {},
                { defaultValue: 'OKR Tracker — quarterly cadence' },
              )}
            </h1>
            <p className={cm.cn(cm.sp('mt', 4), cm.textSize('lg'), 'max-w-xl text-on-primary/90')}>
              {t(
                'templatePreview.subhead',
                {},
                {
                  defaultValue:
                    'Linked records to every parent/child objective. Roll-ups update live as teams update progress. Three views (Grid · Kanban · Calendar) ship pre-configured.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
                cm.sp('mt', 6),
              )}
            >
              <button
                onClick={instantiate}
                type="button"
                disabled={busy || !id}
                data-testid="use-template"
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-primary bg-surface rounded-full hover:bg-surface/90 transition-colors disabled:opacity-50'
                }
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  content_copy
                </span>
                {busy
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('templatePreview.useThis', {}, { defaultValue: 'Use this template' })}
              </button>
              {error && (
                <p role="alert" className={'text-sm text-rose-200'}>
                  {error}
                </p>
              )}
              <Link
                to="/templates"
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full border border-surface/30 hover:bg-surface/10 transition-colors'
                }
              >
                {t('templatePreview.browseMore', {}, { defaultValue: 'Browse more' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
          <div
            className={
              'w-80 h-80 rounded-full absolute -right-20 -bottom-20 bg-surface/10 blur-3xl'
            }
            aria-hidden="true"
          />
        </section>

        <aside
          className={cm.cn(
            'col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/40 p-6 flex flex-col gap-4',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('sm'),
              'font-extrabold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('templatePreview.includes', {}, { defaultValue: 'What it includes' })}
          </h2>
          <ul className={cm.cn(cm.stack(3))}>
            {HIGHLIGHTS.map((h) => (
              <li key={h.icon} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(9),
                    cm.h(9),
                    'rounded-xl bg-primary-fixed text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[18px]">{h.icon}</span>
                </span>
                <span className={cm.cn(cm.flex1)}>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    {t(`templatePreview.highlight.${h.icon}`, {}, { defaultValue: h.label })}
                  </span>
                  <span className={'block text-2xl font-extrabold tabular-nums text-on-surface'}>
                    {h.value}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div
            className={cm.cn(
              'rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant',
            )}
          >
            {t(
              'templatePreview.disclaimer',
              {},
              {
                defaultValue:
                  'Sample data is synthetic — making a copy gives you an empty workbook with the same schema, formulas, and views.',
              },
            )}
          </div>
        </aside>
      </div>

      <section className={cm.cn(cm.stack(3))}>
        <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('templatePreview.previewHeadline', {}, { defaultValue: 'Live preview' })}
        </h2>
        <GridPreview
          {...SAMPLE_PREVIEW}
          formula="=SUMPRODUCT(Progress, Target) / SUM(Target)"
          selectedCellRef="C3"
        />
      </section>
    </WorkbenchLayout>
  )
}

export default TemplatePreview
