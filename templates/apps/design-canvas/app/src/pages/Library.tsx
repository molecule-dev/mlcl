import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'

const SECTIONS = [
  { id: 'colors', label: 'Color tokens', icon: 'palette' },
  { id: 'typography', label: 'Typography', icon: 'title' },
  { id: 'components', label: 'Components', icon: 'extension' },
  { id: 'effects', label: 'Effects', icon: 'auto_fix_high' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

interface DesignToken {
  id: string
  section: SectionId | string
  name: string
  value: string
  role?: string | null
}

export function Library() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [active, setActive] = useState<SectionId>('colors')
  const [tokens, setTokens] = useState<DesignToken[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/design_tokens')
      .then((resp) => {
        if (cancelled) return
        const data = ((resp as { data?: unknown }).data ?? []) as DesignToken[]
        setTokens(data)
      })
      .catch(() => {
        if (!cancelled) setTokens([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const filtered = useMemo(() => tokens.filter((tok) => tok.section === active), [tokens, active])

  const counts = useMemo(() => {
    const c: Record<string, number> = { colors: 0, typography: 0, components: 0, effects: 0 }
    for (const t of tokens) c[t.section] = (c[t.section] ?? 0) + 1
    return c
  }, [tokens])

  return (
    <DesignCanvasLayout
      eyebrow={t(
        'library.eyebrow',
        { appName: APP_NAME },
        { defaultValue: 'Workspace · {{appName}} Design System' },
      )}
      title={t('nav.library', {}, { defaultValue: 'Library' })}
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <aside className={cm.cn('col-span-3', cm.stack(1), 'sticky top-24 self-start')}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              data-mol-id={`library-section-${s.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                active === s.id
                  ? 'bg-primary-fixed/40 text-on-primary-container border-l-4 border-primary rounded-r-lg'
                  : 'text-on-surface-variant hover:bg-surface-container/60 rounded-lg transition-colors',
              )}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {s.icon}
              </span>
              {t(`library.section.${s.id}`, {}, { defaultValue: s.label })}
            </button>
          ))}

          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.stack(2),
              cm.sp('mt', 4),
              'rounded-xl bg-surface-container-lowest border border-outline-variant/30',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('library.systemMeta', {}, { defaultValue: 'System health' })}
            </span>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}>
              {t(
                'library.systemSummary',
                {
                  tokens: counts.colors + counts.typography,
                  components: counts.components,
                  effects: counts.effects,
                },
                {
                  defaultValue:
                    '{{tokens}} tokens · {{components}} components · {{effects}} effects',
                },
              )}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'library.systemSubtext',
                {},
                { defaultValue: 'Synced from design_tokens · v3.2.0' },
              )}
            </p>
          </div>
        </aside>

        <section className={cm.cn('col-span-9', cm.stack(6))} data-mol-id="library-section-content">
          {loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('library.loading', {}, { defaultValue: 'Loading design tokens…' })}
            </p>
          ) : filtered.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('library.empty', {}, { defaultValue: 'No tokens in this section yet.' })}
            </p>
          ) : active === 'colors' ? (
            <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
              {filtered.map((token) => (
                <article
                  key={token.id}
                  data-mol-id={`library-token-${token.id}`}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.stack(3),
                    'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-md transition-all',
                  )}
                >
                  <div
                    className={cm.cn(cm.h(20), 'rounded-xl shadow-sm')}
                    style={{ backgroundColor: token.value }}
                  ></div>
                  <div className={cm.stack(1)}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'tracking-tight text-on-surface',
                      )}
                    >
                      {token.name}
                    </span>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {token.value.toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    {token.role}
                  </span>
                </article>
              ))}
            </div>
          ) : active === 'typography' ? (
            <div className={cm.cn(cm.stack(4))}>
              {filtered.map((token) => (
                <article
                  key={token.id}
                  data-mol-id={`library-token-${token.id}`}
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
                    'bg-surface-container-lowest rounded-2xl border border-outline-variant/30',
                  )}
                >
                  <div className={cm.stack(2)}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-primary',
                      )}
                    >
                      {token.name}
                    </span>
                    <span
                      className={cm.cn('font-extrabold tracking-tight text-on-surface')}
                      style={{
                        fontSize: `${Math.min(parseInt(token.value, 10), 40)}px`,
                      }}
                    >
                      {token.role ?? token.name}
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('xs'),
                      'text-on-surface-variant',
                    )}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {token.value}px
                  </span>
                </article>
              ))}
            </div>
          ) : active === 'components' ? (
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
              {filtered.map((c) => (
                <article
                  key={c.id}
                  data-mol-id={`library-token-${c.id}`}
                  className={cm.cn(
                    cm.sp('p', 5),
                    cm.flex({ align: 'center', gap: 'md' }),
                    'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:-translate-y-0.5 hover:shadow-md transition-all',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(11),
                      cm.h(11),
                      cm.roundedFull,
                      'bg-gradient-to-br from-primary to-secondary text-white shadow-md',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[20px]')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      extension
                    </span>
                  </span>
                  <div className={cm.cn(cm.flex1, cm.stack(1))}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {c.role}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'tracking-tight text-on-surface',
                      )}
                    >
                      {c.name}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'lg' }))}>
              {filtered.map((effect) => (
                <article
                  key={effect.id}
                  data-mol-id={`library-token-${effect.id}`}
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.stack(4),
                    'bg-surface-container-lowest rounded-2xl border border-outline-variant/30',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.h(16),
                      'rounded-xl bg-gradient-to-br from-primary to-secondary',
                    )}
                    style={{
                      boxShadow: effect.value.includes('rgba') ? effect.value : undefined,
                      filter: effect.value.includes('blur') ? effect.value : undefined,
                    }}
                  ></div>
                  <div className={cm.stack(1)}>
                    <span
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                    >
                      {effect.name}
                    </span>
                    <span
                      className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {effect.value}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DesignCanvasLayout>
  )
}

export default Library
