import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WhiteboardLayout } from '../components/WhiteboardLayout.js'

interface TemplateRow {
  id: string
  name: string
  description?: string
  is_system?: boolean
  user_id?: string | null
  snapshot?: { elements?: unknown[] } | string
}

interface BoardRow {
  id: string
}

const ACCENTS = ['#5b5bf7', '#00c4a8', '#a855f7', '#f97316', '#ec4899', '#84cc16']
function accentForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]!
}

function elementCount(snapshot: TemplateRow['snapshot']): number {
  if (!snapshot) return 0
  const parsed = typeof snapshot === 'string' ? safeParse(snapshot) : snapshot
  return Array.isArray(parsed?.elements) ? parsed.elements.length : 0
}

function safeParse(s: string): { elements?: unknown[] } | null {
  try {
    return JSON.parse(s) as { elements?: unknown[] }
  } catch (_error) {
    // invalid snapshot JSON; caller treats null as an empty template
    return null
  }
}

export function TemplateDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id = '' } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<TemplateRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [using, setUsing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await http.get<TemplateRow>(`/api/templates/${id}`)
        if (!cancelled) {
          setTemplate(res.data ?? null)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (id) load()
    return () => {
      cancelled = true
    }
  }, [http, id])

  const handleUse = useCallback(async () => {
    if (!template) return
    setUsing(true)
    try {
      const res = await http.post<BoardRow>(`/api/templates/${template.id}/instantiate`, {
        title: template.name,
      })
      if (res.data?.id) {
        track({
          name: 'board.created',
          properties: { board_id: res.data.id, source: 'template', template_id: template.id },
        })
        navigate(`/board/${res.data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUsing(false)
    }
  }, [http, navigate, template])

  const handleDelete = useCallback(async () => {
    if (!template || template.is_system) return
    try {
      await http.delete(`/api/templates/${template.id}`)
      navigate('/templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [http, navigate, template])

  if (loading || !template) {
    return (
      <WhiteboardLayout
        title={t('templateDetail.loading', {}, { defaultValue: 'Loading template…' })!}
      >
        <div className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
          {error ?? t('templateDetail.loading', {}, { defaultValue: 'Loading template…' })}
        </div>
      </WhiteboardLayout>
    )
  }

  const accent = accentForId(template.id)
  const count = elementCount(template.snapshot)

  return (
    <WhiteboardLayout
      eyebrow={t(
        'templateDetail.eyebrow',
        { kind: template.is_system ? 'Built-in' : 'Custom' },
        { defaultValue: '{{kind}} template' },
      )}
      title={template.name}
      actions={
        <>
          <Link
            to="/templates"
            data-mol-id="template-detail-back"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'bg-surface-container text-on-surface rounded-xl border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
            )}
          >
            {t('templateDetail.allTemplates', {}, { defaultValue: 'All templates' })}
          </Link>
          {!template.is_system && (
            <button
              type="button"
              data-mol-id="template-detail-delete"
              onClick={handleDelete}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'bg-error-container/40 text-on-error-container rounded-xl border border-outline-variant/40 hover:bg-error-container/60',
              )}
            >
              {t('templateDetail.delete', {}, { defaultValue: 'Delete template' })}
            </button>
          )}
          <button
            type="button"
            data-mol-id="template-detail-use"
            onClick={handleUse}
            disabled={using}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl shadow-md shadow-primary/30 disabled:opacity-60',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>auto_awesome</span>
            {using
              ? t('templateDetail.using', {}, { defaultValue: 'Creating board…' })
              : t('common.usename', {}, { defaultValue: 'Use template' })}
          </button>
        </>
      }
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'col-span-8 rounded-[2rem] text-white relative overflow-hidden',
          )}
          style={{ background: `linear-gradient(135deg, ${accent} 0%, #1e1e2e 120%)` }}
        >
          <div className={cm.cn(cm.stack(4), 'relative z-10')}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-white/70',
              )}
            >
              {template.is_system
                ? t('templateDetail.systemEyebrow', {}, { defaultValue: 'Curated by the team' })
                : t('templateDetail.userEyebrow', {}, { defaultValue: 'Your saved template' })}
            </span>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl font-extrabold tracking-tighter leading-[0.95]',
              )}
            >
              {template.name}
            </h2>
            {template.description && (
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  cm.maxW('xl'),
                  'text-white/85 leading-relaxed',
                )}
              >
                {template.description}
              </p>
            )}
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'bg-surface/20 backdrop-blur-md',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')}>category</span>
                {t(
                  'templateDetail.elementsCount',
                  { count },
                  { defaultValue: '{{count}} starter elements' },
                )}
              </span>
            </div>
          </div>
        </section>

        <aside className={cm.cn('col-span-4', cm.stack(4))}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('common.howItWorks', {}, { defaultValue: 'How it works' })}
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
              {t(
                'templateDetail.body',
                { count, name: template.name },
                {
                  defaultValue:
                    'Click "Use template" to copy {{count}} starter elements into a brand-new board titled "{{name}}". Edit, share, and run your workshop from there.',
                },
              )}
            </p>
          </div>
        </aside>
      </div>
    </WhiteboardLayout>
  )
}

export default TemplateDetail
