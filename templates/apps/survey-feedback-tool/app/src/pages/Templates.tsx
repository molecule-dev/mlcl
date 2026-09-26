import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TemplateApi {
  id: string
  name: string
  description: string
  kind: string
  questions: unknown
  is_public?: boolean
  owner_id?: string | null
}

interface TemplateCard {
  id: string
  name: string
  category: string
  questions: number
  description: string
  icon: string
}

const KIND_ICONS: Record<string, string> = {
  nps: 'thumb_up',
  csat: 'star',
  employee: 'groups',
  product: 'science',
  event: 'celebration',
  onboarding: 'rocket_launch',
  general: 'list_alt',
}

function categoryFromKind(kind: string): string {
  if (!kind) return 'General'
  const k = kind.toLowerCase()
  if (k === 'nps') return 'NPS'
  if (k === 'csat') return 'CSAT'
  if (k === 'employee') return 'Employee'
  if (k === 'product') return 'Product'
  if (k === 'event') return 'Event'
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}

function questionsCount(questions: unknown): number {
  if (Array.isArray(questions)) return questions.length
  if (typeof questions === 'string') {
    try {
      const parsed = JSON.parse(questions)
      if (Array.isArray(parsed)) return parsed.length
    } catch (_error) {
      // JSON.parse failed — fall back to 0 question count
      return 0
    }
  }
  return 0
}

const CATEGORY_CLASS: Record<string, string> = {
  NPS: 'bg-primary/10 text-primary',
  CSAT: 'bg-warning-light text-[color:var(--color-on-warning)]',
  Employee: 'bg-secondary/10 text-secondary',
  Product: 'bg-[var(--color-accent-purple-bg)] text-[color:var(--color-accent-purple)]',
  Event: 'bg-success-light text-[color:var(--color-on-success)]',
  General: 'bg-surface-secondary text-on-surface-variant',
}

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [templates, setTemplates] = useState<TemplateCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<TemplateApi[] | { data?: TemplateApi[] }>('/api/templates')
      .then((response) => {
        if (cancelled) return
        const body = response?.data
        const rows = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: TemplateApi[] } | undefined)?.data)
            ? (body as { data: TemplateApi[] }).data
            : []
        const cards: TemplateCard[] = rows.map((row) => ({
          id: String(row.id),
          name: row.name,
          category: categoryFromKind(row.kind),
          questions: questionsCount(row.questions),
          description: row.description ?? '',
          icon: KIND_ICONS[(row.kind || '').toLowerCase()] ?? 'list_alt',
        }))
        setTemplates(cards)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setTemplates([])
        setError(err instanceof Error ? err.message : 'Could not load templates.')
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function applyTemplate(templateId: string) {
    setApplyingId(templateId)
    setError(null)
    try {
      const response = await http.post<{ id?: string }>(`/api/templates/${templateId}/apply`)
      const survey = response?.data
      if (survey?.id) {
        // Domain event: template→survey is the app's second creation funnel.
        void track({
          name: 'template.applied',
          properties: { template_id: String(templateId), survey_id: String(survey.id) },
        })
        navigate(`/surveys/${survey.id}/build`)
      } else {
        throw new Error('No survey id returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply template.')
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('p', 8), cm.maxW('7xl'), cm.mxAuto, cm.w('full'))}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary',
          )}
        >
          {t('templates.eyebrow', {}, { defaultValue: 'Get started fast' })}
        </span>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('templates.heading', {}, { defaultValue: 'Survey templates' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'templates.subheading',
            {},
            {
              defaultValue:
                'Pick a battle-tested starter — every template comes pre-tuned with sensible defaults, sample logic, and a clean mobile layout.',
            },
          )}
        </p>
        {error && (
          <p role="alert" className="text-[color:var(--color-on-error)] text-sm">
            {error}
          </p>
        )}
      </div>

      {templates === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('nav.loadingTemplates', {}, { defaultValue: 'Loading templates…' })}
        </p>
      ) : templates.length === 0 ? (
        <div
          data-testid="templates-empty"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 2 }),
            cm.sp('p', 8),
            'rounded-xl bg-surface border border-[color:var(--color-border)] text-center',
          )}
        >
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 36 }}
            aria-hidden="true"
          >
            description
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'templates.empty',
              {},
              {
                defaultValue:
                  'No templates yet — once you save your own templates, they appear here.',
              },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2 lg:grid-cols-3')}>
          {templates.map((tpl) => (
            <li key={tpl.id}>
              <article
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 4 }),
                  cm.sp('p', 6),
                  cm.h('full'),
                  'rounded-xl bg-surface border border-[color:var(--color-border)] hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 shadow-sm',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 2 }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      'rounded-md bg-gradient-to-br from-primary/15 to-secondary/15 text-primary',
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 22 }}
                      aria-hidden="true"
                    >
                      {tpl.icon}
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'py-1 inline-flex items-center text-[10px] tracking-widest uppercase',
                      CATEGORY_CLASS[tpl.category] ?? CATEGORY_CLASS.General,
                    )}
                  >
                    {tpl.category}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                  <h2
                    className={cm.cn(
                      cm.textSize('lg'),
                      'font-extrabold tracking-tight text-on-surface',
                    )}
                  >
                    {tpl.name}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {tpl.description}
                  </p>
                </div>
                <footer
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 2 }),
                    'mt-auto',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 1 }),
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 14 }}
                      aria-hidden="true"
                    >
                      list
                    </span>
                    {t(
                      'templates.questions',
                      { count: tpl.questions },
                      { defaultValue: '{{count}} questions' },
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => applyTemplate(tpl.id)}
                    disabled={applyingId === tpl.id}
                    data-testid={`use-template-${tpl.id}`}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'rounded-md bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-60',
                    )}
                  >
                    {applyingId === tpl.id
                      ? t('templates.applying', {}, { defaultValue: 'Applying…' })
                      : t('common.usename', {}, { defaultValue: 'Use template' })}
                  </button>
                </footer>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Templates
