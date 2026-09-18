import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'
import { TemplateCard } from '../components/TemplateCard.js'

interface TemplateRow {
  id: string
  name: string
  description?: string | null
  category: string
  accent_color?: string | null
  icon_name?: string | null
  usage_count?: number | null
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'space_dashboard' },
  { id: 'UI Mockup', label: 'UI Mockup', icon: 'phone_iphone' },
  { id: 'Branding', label: 'Branding', icon: 'palette' },
  { id: 'Illustration', label: 'Illustration', icon: 'draw' },
  { id: 'Marketing', label: 'Marketing', icon: 'campaign' },
  { id: 'Design Ops', label: 'Design Ops', icon: 'tune' },
  { id: 'Print', label: 'Print', icon: 'print' },
  { id: 'Workshop', label: 'Workshop', icon: 'extension' },
]

const ACCENT_FALLBACK = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981']

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [usingId, setUsingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/templates')
      .then((resp) => {
        if (cancelled) return
        const data = ((resp as { data?: unknown }).data ?? []) as TemplateRow[]
        setTemplates(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError((err as { message?: string }).message ?? 'Failed to load templates')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const applyTemplate = async (templateId: string) => {
    if (usingId) return
    setUsingId(templateId)
    try {
      const resp = await http.post(`/api/templates/${templateId}/use`, {})
      const created = (resp as { data?: { id?: string } }).data ?? null
      if (created?.id) navigate(`/editor/${created.id}`)
    } finally {
      setUsingId(null)
    }
  }

  const filtered = useMemo(() => {
    return activeCategory === 'all'
      ? templates
      : templates.filter((tpl) => tpl.category === activeCategory)
  }, [templates, activeCategory])

  return (
    <DesignCanvasLayout
      eyebrow={t(
        'templates.eyebrow',
        { appName: APP_NAME },
        { defaultValue: 'Workspace · {{appName}} Library' },
      )}
      title={t('nav.templates', {}, { defaultValue: 'Templates' })}
    >
      <div className={cm.cn(cm.stack(8))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('p', 6),
            'rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 border border-outline-variant/30',
          )}
        >
          <div className={cm.stack(2)}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-primary',
              )}
            >
              {t('templates.heroEyebrow', {}, { defaultValue: 'Curated this week' })}
            </span>
            <h2
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t(
                'templates.heroTitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Ship faster with templates polished by {{appName}}’s design partners.',
                },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant leading-relaxed max-w-xl',
              )}
            >
              {t(
                'templates.heroBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Every template is a real {{appName}} file you can fork — auto-layout, components, and tokens included. Tap "Use template" to start a new project.',
                },
              )}
            </p>
          </div>
        </div>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {CATEGORIES.map((c) => {
            const active = c.id === activeCategory
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                data-mol-id={`templates-filter-${c.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  active
                    ? 'bg-primary text-white shadow-sm shadow-primary/30 rounded-xl'
                    : 'bg-surface-container-lowest text-on-surface-variant rounded-xl border border-outline-variant/30 hover:bg-surface-container transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>{c.icon}</span>
                {t(`templates.category.${c.id}`, {}, { defaultValue: c.label })}
              </button>
            )
          })}
        </div>

        {loading ? (
          <p
            data-mol-id="templates-loading"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('templates.loading', {}, { defaultValue: 'Loading templates…' })}
          </p>
        ) : error ? (
          <p
            data-mol-id="templates-error"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {error}
          </p>
        ) : (
          <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))} data-mol-id="templates-grid">
            {filtered.map((tpl, idx) => {
              const card = {
                id: tpl.id,
                title: tpl.name,
                description: tpl.description ?? '',
                category: tpl.category,
                accentColor: tpl.accent_color ?? ACCENT_FALLBACK[idx % ACCENT_FALLBACK.length],
                iconName: tpl.icon_name ?? 'auto_awesome',
                usageCount: tpl.usage_count ?? 0,
              }
              return (
                <div
                  key={tpl.id}
                  data-mol-id={`template-${tpl.id}`}
                  className={cm.cn(cm.flex({ direction: 'col' }), 'relative')}
                >
                  <TemplateCard template={card} onUse={() => void applyTemplate(tpl.id)} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void applyTemplate(tpl.id)
                    }}
                    disabled={usingId === tpl.id}
                    data-mol-id={`template-use-${tpl.id}`}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'absolute bottom-4 right-4 rounded-lg bg-primary text-white shadow-sm hover:bg-primary-hover disabled:opacity-60',
                    )}
                  >
                    {usingId === tpl.id
                      ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                      : t('common.usename', {}, { defaultValue: 'Use template' })}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DesignCanvasLayout>
  )
}

export default Templates
