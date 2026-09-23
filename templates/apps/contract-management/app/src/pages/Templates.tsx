import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Template {
  id: string
  name: string
  category: 'msa' | 'sow' | 'nda' | 'order' | 'employment' | 'other'
  description: string
  version: string
  updated_at: string
  used_count: number
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const CATEGORY_LABEL: Record<Template['category'], string> = {
  msa: 'Master Service Agreement',
  sow: 'Statement of Work',
  nda: 'Non-Disclosure Agreement',
  order: 'Order Form',
  employment: 'Employment',
  other: 'Other',
}

const CATEGORY_ICON: Record<Template['category'], string> = {
  msa: 'gavel',
  sow: 'description',
  nda: 'shield_lock',
  order: 'shopping_cart',
  employment: 'badge',
  other: 'article',
}

export function Templates() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/templates')
      .then((res) => {
        if (!cancelled) setTemplates(unwrapList<Template>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('templates.loadError', {}, { defaultValue: 'Failed to load templates.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }))}
      >
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'templates.subheading',
              {},
              { defaultValue: 'Pre-approved contract templates ready to spin up new agreements.' },
            )}
          </p>
        </div>
        <button
          type="button"
          id="new-template"
          onClick={() => navigate('/templates/new')}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          {t('templates.newCta', {}, { defaultValue: 'New template' })}
        </button>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('templates.loading', {}, { defaultValue: 'Loading\u2026' })}
        </p>
      ) : templates.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t(
            'templates.empty',
            {},
            { defaultValue: 'No templates yet. Create one to standardize your agreements.' },
          )}
        </p>
      ) : (
        <ul className={cm.grid({ cols: 3, gap: 'md' })} data-testid="templates-grid">
          {templates.map((tmpl) => (
            <li
              key={tmpl.id}
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
              data-testid={`template-${tmpl.id}`}
            >
              <header className={cm.flex({ align: 'center', justify: 'between' })}>
                <span
                  className={'material-symbols-outlined text-2xl text-primary'}
                  aria-hidden="true"
                >
                  {CATEGORY_ICON[tmpl.category]}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                    'uppercase tracking-wide font-mono',
                  )}
                >
                  v{tmpl.version}
                </span>
              </header>
              <div>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{tmpl.name}</h2>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 1),
                    'text-on-surface-variant',
                    'uppercase tracking-wide',
                  )}
                >
                  {CATEGORY_LABEL[tmpl.category]}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 2),
                    'text-on-surface-variant',
                    'line-clamp-2',
                  )}
                >
                  {tmpl.description}
                </p>
              </div>
              <footer
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'border-t border-outline-variant pt-3',
                )}
              >
                <span>
                  {t(
                    'templates.usedCount',
                    { count: tmpl.used_count },
                    { defaultValue: 'Used {{count}}\u00d7' },
                  )}
                </span>
                <span>
                  {t(
                    'templates.updated',
                    { when: fmtDate(tmpl.updated_at) },
                    { defaultValue: 'Updated {{when}}' },
                  )}
                </span>
              </footer>
              <div className={cm.flex({ gap: 'sm' })}>
                <Link
                  to={`/contracts/new?template=${tmpl.id}`}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'flex-1 text-center bg-primary text-on-primary rounded-md',
                  )}
                >
                  {t('templates.useCta', {}, { defaultValue: 'Use' })}
                </Link>
                <Link
                  to={`/templates/${tmpl.id}`}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'border border-outline rounded-md hover:bg-surface-container',
                  )}
                >
                  {t('common.edit', {}, { defaultValue: 'Edit' })}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
