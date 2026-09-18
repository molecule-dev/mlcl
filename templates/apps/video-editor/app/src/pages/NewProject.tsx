import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { RushesLayout } from '../components/RushesLayout.js'

interface PresetOption {
  id: string
  label: string
  defaultLabel: string
  meta: string
  icon: string
  width: number
  height: number
  fps: number
  aspect: string
}

const PRESETS: PresetOption[] = [
  {
    id: 'cinema-4k',
    label: 'newProject.preset.cinema4k',
    defaultLabel: 'Cinema 4K · 16:9',
    meta: '3840×2160 · 24fps',
    icon: 'theaters',
    width: 3840,
    height: 2160,
    fps: 24,
    aspect: '16:9',
  },
  {
    id: 'standard-1080p',
    label: 'newProject.preset.standard1080',
    defaultLabel: 'HD · 16:9',
    meta: '1920×1080 · 30fps',
    icon: 'movie',
    width: 1920,
    height: 1080,
    fps: 30,
    aspect: '16:9',
  },
  {
    id: 'vertical-9-16',
    label: 'newProject.preset.vertical',
    defaultLabel: 'Vertical · 9:16',
    meta: '1080×1920 · 30fps',
    icon: 'smartphone',
    width: 1080,
    height: 1920,
    fps: 30,
    aspect: '9:16',
  },
  {
    id: 'square-1-1',
    label: 'newProject.preset.square',
    defaultLabel: 'Square · 1:1',
    meta: '1080×1080 · 30fps',
    icon: 'crop_square',
    width: 1080,
    height: 1080,
    fps: 30,
    aspect: '1:1',
  },
  {
    id: 'cinema-21-9',
    label: 'newProject.preset.cinema21',
    defaultLabel: 'Cinemascope · 21:9',
    meta: '2560×1080 · 24fps',
    icon: 'crop_landscape',
    width: 2560,
    height: 1080,
    fps: 24,
    aspect: '21:9',
  },
  {
    id: 'web-720p',
    label: 'newProject.preset.web',
    defaultLabel: 'Web · 720p',
    meta: '1280×720 · 60fps',
    icon: 'language',
    width: 1280,
    height: 720,
    fps: 60,
    aspect: '16:9',
  },
]

const TEMPLATES = [
  {
    id: 't-blank',
    name: 'Blank timeline',
    icon: 'add_box',
    defaultLabel: 'Blank timeline',
    defaultDesc: 'Start from an empty four-track timeline.',
  },
  {
    id: 't-vertical-promo',
    name: 'Vertical Product Promo',
    icon: 'smartphone',
    defaultLabel: 'Vertical Product Promo',
    defaultDesc: 'Pre-paced 15s social drop with title cards.',
  },
  {
    id: 't-vlog-intro',
    name: 'Vlog Intro Card',
    icon: 'live_tv',
    defaultLabel: 'Vlog Intro Card',
    defaultDesc: '6s intro with logo reveal and music bed.',
  },
]

export function NewProject() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [name, setName] = useState('Untitled Cut')
  const [presetId, setPresetId] = useState<string>('standard-1080p')
  const [templateId, setTemplateId] = useState<string>('t-blank')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preset = PRESETS.find((p) => p.id === presetId)!

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post('/api/projects', {
        name: name.trim() || 'Untitled Cut',
        width: preset.width,
        height: preset.height,
        fps: preset.fps,
        template_id: templateId === 't-blank' ? undefined : templateId,
      })
      const created = unwrapSingle<{ id?: string }>(res.data)
      if (!created?.id) throw new Error('No project id returned')
      navigate(`/editor/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <RushesLayout
      title={t('nav.newProject', {}, { defaultValue: 'New project' })}
      breadcrumb="// projects › new"
    >
      <div className={cm.cn('max-w-[860px] mx-auto', cm.stack(6))}>
        <header>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'text-[var(--video-text-primary)] tracking-tight',
            )}
          >
            {t('newProject.heading', {}, { defaultValue: 'Start a new cut' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-[var(--video-text-muted-alt)]',
            )}
          >
            {t(
              'newProject.subhead',
              {},
              {
                defaultValue:
                  'Pick a preset, name the project, and you’re in the editor in seconds.',
              },
            )}
          </p>
        </header>

        {error && (
          <p
            role="alert"
            data-mol-id="new-project-error"
            className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
          >
            {error}
          </p>
        )}

        <form onSubmit={handleCreate} className={cm.cn(cm.stack(6))} data-mol-id="new-project-form">
          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--video-text-primary)]',
              )}
            >
              {t('newProject.section.name', {}, { defaultValue: 'Project name' })}
            </h3>
            <input
              id="project-name"
              name="name"
              type="text"
              required
              data-mol-id="new-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-lg bg-[var(--video-input-bg)] text-[var(--video-text-primary)] border border-[var(--video-border-subtle)] focus:border-[var(--video-cta-from)] focus:ring-1 focus:ring-[var(--video-cta-from)]/40 focus:outline-none transition-colors',
              )}
            />
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--video-text-primary)]',
              )}
            >
              {t('newProject.section.preset', {}, { defaultValue: 'Resolution & aspect' })}
            </h3>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3')}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresetId(p.id)}
                  data-mol-id={`preset-${p.id}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.stack(2),
                    'text-left rounded-lg border transition-all',
                    presetId === p.id
                      ? 'border-[var(--video-cta-from)] bg-[var(--video-cta-from)]/10 shadow-[0_0_24px_-10px_color-mix(in_srgb,var(--video-cta-from)_70%,transparent)]'
                      : 'border-[var(--video-border-subtle)] bg-[var(--video-input-bg)] hover:border-[var(--video-cta-from)]/40',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[18px]',
                        presetId === p.id
                          ? 'text-[var(--video-link)]'
                          : 'text-[var(--video-text-muted-alt)]',
                      )}
                    >
                      {p.icon}
                    </span>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-[var(--video-text-primary)]',
                      )}
                    >
                      {t(p.label, {}, { defaultValue: p.defaultLabel })}
                    </p>
                  </div>
                  <p
                    className={cm.cn(
                      'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-muted-alt)]',
                    )}
                  >
                    {p.meta}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-[var(--video-text-primary)]',
              )}
            >
              {t('newProject.section.template', {}, { defaultValue: 'Template (optional)' })}
            </h3>
            <div className={cm.cn(cm.stack(2))}>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplateId(tpl.id)}
                  data-mol-id={`template-${tpl.id}`}
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.flex({ align: 'center', gap: 4 }),
                    'text-left rounded-lg border transition-colors',
                    templateId === tpl.id
                      ? 'border-[var(--video-cta-from)] bg-[var(--video-cta-from)]/10'
                      : 'border-[var(--video-border-subtle)] bg-[var(--video-input-bg)] hover:border-[var(--video-cta-from)]/40',
                  )}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-[24px]',
                      templateId === tpl.id
                        ? 'text-[var(--video-link)]'
                        : 'text-[var(--video-text-muted-alt)]',
                    )}
                  >
                    {tpl.icon}
                  </span>
                  <div className={cm.stack(0)}>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-[var(--video-text-primary)]',
                      )}
                    >
                      {t(
                        `newProject.template.${tpl.id}.name`,
                        {},
                        { defaultValue: tpl.defaultLabel },
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>
                      {t(
                        `newProject.template.${tpl.id}.desc`,
                        {},
                        { defaultValue: tpl.defaultDesc },
                      )}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <Link
              to="/templates"
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)] hover:text-[var(--video-link-hover)] transition-colors',
              )}
            >
              {t('newProject.browseAll', {}, { defaultValue: 'Browse all templates →' })}
            </Link>
          </section>

          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 3 }))}>
            <p
              className={cm.cn(
                'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
              )}
            >
              {t(
                'newProject.summary',
                { aspect: preset.aspect, fps: preset.fps },
                { defaultValue: '// {{aspect}} · {{fps}}fps' },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 2 }))}>
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg border border-[var(--video-border-subtle)] hover:border-[var(--video-cta-from)]/40 text-[var(--video-text-primary)] transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </Link>
              <button
                type="submit"
                data-mol-id="new-project-submit"
                disabled={creating}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                <span>
                  {creating
                    ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                    : t('newProject.create', {}, { defaultValue: 'Open editor' })}
                </span>
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </RushesLayout>
  )
}

export default NewProject
