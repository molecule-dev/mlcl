/**
 * TemplateDetail — full template preview with mini canvas, description,
 * required connections, and install button.
 *
 * Data source: GET /api/templates/:id returns the blueprint. Install
 * POSTs /api/templates/:id/install which creates a new disabled workflow
 * pre-populated with the blueprint's steps.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'
import { WorkflowNode } from '../components/WorkflowNode.js'

interface TemplateConnection {
  name: string
  icon: string
  required: boolean
}

interface TemplateBlueprint {
  id: string
  name: string
  category: string
  installs: number
  rating: number
  description: string
  highlights: string[]
  connections: TemplateConnection[]
  nodes: Array<{
    kind: 'trigger' | 'condition' | 'action'
    icon: string
    title: string
    subtitle?: string
  }>
}

export function TemplateDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const id = params.id ?? ''
  const [tpl, setTpl] = useState<TemplateBlueprint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installMessage, setInstallMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setTpl(null)
    setError(null)
    http
      .get<TemplateBlueprint>(`/api/templates/${id}`)
      .then((res) => {
        if (cancelled) return
        if (res.data) setTpl(res.data)
        else setError(t('templateDetail.notFound', {}, { defaultValue: 'Template not found.' }))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('templateDetail.error', {}, { defaultValue: 'Could not load template.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const handleInstall = useCallback(async () => {
    if (!tpl) return
    setInstalling(true)
    setInstallMessage(null)
    try {
      const res = await http.post<{ workflow_id?: string }>(`/api/templates/${tpl.id}/install`, {})
      const wfId = res.data?.workflow_id
      if (wfId) {
        navigate(`/workflows/${wfId}`)
      } else {
        setInstallMessage(
          t('templateDetail.installed', {}, { defaultValue: 'Template installed.' }),
        )
      }
    } catch (e) {
      setInstallMessage(
        e instanceof Error
          ? e.message
          : t('templateDetail.installFailed', {}, { defaultValue: 'Install failed.' }),
      )
    } finally {
      setInstalling(false)
    }
  }, [tpl, http, navigate, t])

  if (error && !tpl) {
    return (
      <WorkflowAppShell
        pageId="template-detail"
        title={t('templateDetail.title', {}, { defaultValue: 'Template' })}
      >
        <div
          role="alert"
          data-mol-id="templatedetail-error"
          className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
        <Link
          to="/templates"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'inline-block',
          )}
          style={{ color: 'var(--color-accent-violet)' }}
        >
          {t('templateDetail.back', {}, { defaultValue: 'Back to templates' })}
        </Link>
      </WorkflowAppShell>
    )
  }

  if (!tpl) {
    return (
      <WorkflowAppShell
        pageId="template-detail"
        title={t('templateDetail.title', {}, { defaultValue: 'Template' })}
      >
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="templatedetail-loading"
        >
          {t('templateDetail.loading', {}, { defaultValue: 'Loading template…' })}
        </div>
      </WorkflowAppShell>
    )
  }

  return (
    <WorkflowAppShell
      pageId="template-detail"
      eyebrow={t(
        'templateDetail.eyebrow',
        { cat: tpl.category },
        { defaultValue: 'Template · {{cat}}' },
      )}
      title={tpl.name}
      description={tpl.description}
      actions={
        <button
          onClick={() => void handleInstall()}
          disabled={installing}
          type="button"
          data-mol-id="templatedetail-install"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full text-white shadow-md transition-all hover:-translate-y-0.5',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
            opacity: installing ? 0.7 : 1,
          }}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
            cloud_download
          </span>
          {installing
            ? t('templateDetail.installing', {}, { defaultValue: 'Installing…' })
            : t('templateDetail.install', {}, { defaultValue: 'Install template' })}
        </button>
      }
    >
      {installMessage && (
        <div
          role="status"
          data-mol-id="templatedetail-install-message"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-surface-hover)',
            color: 'var(--color-feedback-success-text)',
          }}
        >
          {installMessage}
        </div>
      )}

      <div className={'grid gap-6 grid-cols-1 lg:grid-cols-[2fr_1fr]'}>
        {/* Mini canvas */}
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface shadow-sm relative overflow-hidden',
          )}
          style={{ border: '1px solid var(--color-border)', minHeight: 480 }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(var(--color-canvas-dot) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.5,
            }}
            aria-hidden
          />
          <div className={'relative z-10 flex flex-wrap gap-6 items-start'}>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
              {tpl.nodes.map((n, i) => (
                <div key={i} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <WorkflowNode kind={n.kind} icon={n.icon} title={n.title} subtitle={n.subtitle} />
                  {i < tpl.nodes.length - 1 && (
                    <span
                      className={cm.cn('material-symbols-outlined text-2xl')}
                      style={{ color: 'var(--color-accent-violet-light)' }}
                    >
                      arrow_downward
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <div
            className={cm.cn(cm.sp('p', 5), 'rounded-xl bg-surface shadow-sm')}
            style={{ border: '1px solid var(--color-border)' }}
          >
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest',
                )}
                style={{ color: 'var(--color-node-condition)' }}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </span>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                )}
              >
                <span
                  className={'material-symbols-outlined text-base'}
                  style={{ color: 'var(--color-primary)' }}
                >
                  star
                </span>
                {tpl.rating}
              </span>
            </div>
            <dl className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
              <div className={cm.flex({ justify: 'between' })}>
                <dt className={cm.textMuted}>
                  {t('templateDetail.installs', {}, { defaultValue: 'Installs' })}
                </dt>
                <dd className={cm.fontWeight('semibold')}>{tpl.installs.toLocaleString()}</dd>
              </div>
              <div className={cm.flex({ justify: 'between' })}>
                <dt className={cm.textMuted}>
                  {t('form.category', {}, { defaultValue: 'Category' })}
                </dt>
                <dd className={cm.fontWeight('semibold')}>{tpl.category}</dd>
              </div>
            </dl>
          </div>

          <div
            className={cm.cn(cm.sp('p', 5), 'rounded-xl bg-surface shadow-sm')}
            style={{ border: '1px solid var(--color-border)' }}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-widest',
              )}
              style={{ color: 'var(--color-node-condition)' }}
            >
              {t('templateDetail.connections', {}, { defaultValue: 'Required connections' })}
            </h3>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {tpl.connections.map((c) => (
                <li
                  key={c.name}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn('material-symbols-outlined text-lg')}
                      style={{ color: 'var(--color-accent-violet)' }}
                    >
                      {c.icon}
                    </span>
                    <span className={cm.fontWeight('semibold')}>{c.name}</span>
                  </span>
                  {c.required && (
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest rounded-full',
                      )}
                      style={{
                        background: 'var(--color-primary-light)',
                        color: 'var(--color-run-queued-fg)',
                        padding: '3px 10px',
                      }}
                    >
                      {t('templateDetail.required', {}, { defaultValue: 'Required' })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              to="/connections"
              className={cm.cn(
                cm.sp('mt', 4),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'inline-block',
              )}
              style={{ color: 'var(--color-accent-violet)' }}
            >
              {t('templateDetail.manageConnections', {}, { defaultValue: 'Manage connections →' })}
            </Link>
          </div>

          <div
            className={cm.cn(cm.sp('p', 5), 'rounded-xl bg-surface shadow-sm')}
            style={{ border: '1px solid var(--color-border)' }}
          >
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-widest',
              )}
              style={{ color: 'var(--color-node-condition)' }}
            >
              {t('templateDetail.highlights', {}, { defaultValue: 'What it does' })}
            </h3>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textSize('sm'))}>
              {tpl.highlights.map((h) => (
                <li key={h} className={cm.flex({ align: 'start', gap: 'sm' })}>
                  <span
                    className={cm.cn('material-symbols-outlined text-lg shrink-0')}
                    style={{ color: 'var(--color-node-action)' }}
                  >
                    check_circle
                  </span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </WorkflowAppShell>
  )
}

export default TemplateDetail
