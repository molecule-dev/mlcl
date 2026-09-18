import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { PresetTile } from '../components/PresetTile.js'
import { PublicFooter } from '../components/PublicFooter.js'
import { PublicNav } from '../components/PublicNav.js'
import { SAMPLE_PRESETS } from '../lib/sample-photos.js'

interface FeatureBlock {
  icon: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

const FEATURES: FeatureBlock[] = [
  {
    icon: 'tune',
    titleKey: 'landing.feature1Title',
    defaultTitle: 'Adjust with intent',
    bodyKey: 'landing.feature1Body',
    defaultBody:
      'Per-channel curves, parametric HSL, and tonal contrast — every slider is keyboard-bindable and shows its exact numeric value in JetBrains Mono.',
  },
  {
    icon: 'layers',
    titleKey: 'landing.feature2Title',
    defaultTitle: 'Non-destructive layers',
    bodyKey: 'landing.feature2Body',
    defaultBody:
      'Stack adjustments, masks, and presets without touching the original frame. Walk back any edit, any session, any year.',
  },
  {
    icon: 'palette',
    titleKey: 'landing.feature3Title',
    defaultTitle: 'A library of looks',
    bodyKey: 'landing.feature3Body',
    defaultBody:
      'Hand-tuned LUTs across mood, cinema, studio, and street. Or roll your own — {{appName}} exports preset packs ready for clients.',
  },
]

const STATS = [
  {
    value: '0.4ms',
    labelKey: 'landing.stat1Label',
    defaultLabel: 'Per-pixel adjust',
    accent: '#a78bfa',
  },
  {
    value: '32-bit',
    labelKey: 'landing.stat2Label',
    defaultLabel: 'Float pipeline',
    accent: '#f472b6',
  },
  {
    value: '400+',
    labelKey: 'landing.stat3Label',
    defaultLabel: 'Curated presets',
    accent: '#22d3ee',
  },
  { value: '∞', labelKey: 'landing.stat4Label', defaultLabel: 'Undo history', accent: '#10b981' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const featuredPresets = SAMPLE_PRESETS.slice(0, 4)

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-[var(--photo-background)] text-[var(--photo-text)] font-body',
      )}
    >
      <PublicNav />

      <main>
        <section className={cm.cn(cm.sp('py', 20), cm.sp('px', 6), 'relative overflow-hidden')}>
          <div aria-hidden="true" className={cm.cn('absolute inset-0 pointer-events-none')}>
            <div
              className={cm.cn(
                'absolute -top-40 right-1/4 w-[600px] h-[600px] rounded-full bg-[var(--photo-accent)]/25 blur-[140px]',
              )}
            />
            <div
              className={cm.cn(
                'absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[var(--photo-danger)]/20 blur-[140px]',
              )}
            />
            <div
              className={cm.cn(
                'absolute -bottom-20 right-10 w-[420px] h-[420px] rounded-full bg-[var(--photo-secondary)]/15 blur-[120px]',
              )}
            />
          </div>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              'max-w-[1100px] mx-auto relative z-10',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 5),
                'font-mono uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: '// the precision photo editor' })}
            </p>
            <h1
              className={cm.cn(
                cm.textCenter,
                'font-extrabold tracking-tight text-5xl md:text-6xl lg:text-7xl leading-[0.95] max-w-[920px]',
              )}
            >
              <span className={cm.cn('text-[var(--photo-text)]')}>
                {t('landing.headline.start', {}, { defaultValue: 'Light bends to' })}
              </span>{' '}
              <span
                className={cm.cn(
                  'bg-clip-text text-transparent bg-gradient-to-r from-[var(--photo-accent)] via-[var(--photo-panel-text-highlight)] to-[var(--photo-danger)]',
                )}
              >
                {t('landing.headline.brand', { brand: APP_NAME }, { defaultValue: 'your will.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 6),
                cm.textCenter,
                'text-[var(--photo-text-muted)] max-w-[640px] leading-relaxed',
              )}
            >
              {t(
                'landing.subhead',
                {},
                {
                  defaultValue:
                    'A keyboard-first photo editor for creators who care about the third decimal — adjustments, masks, and LUTs in a dark chrome that never color-casts the canvas.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 8))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'rounded-lg bg-gradient-to-r from-[var(--photo-accent)] to-[var(--photo-danger)] text-white hover:opacity-90 transition-opacity shadow-lg',
                )}
              >
                <span>{t('landing.ctaPrimary', {}, { defaultValue: 'Start editing free' })}</span>
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'rounded-lg border border-[var(--photo-border)] hover:border-[var(--photo-accent)]/50 text-[var(--photo-text)] transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 6),
                'font-mono uppercase tracking-widest text-[var(--photo-text-muted)]',
              )}
            >
              {APP_TAGLINE}
            </p>
          </div>
        </section>

        {/* Sample editor card mirroring the auth'd hero */}
        <section className={cm.cn(cm.sp('px', 6), cm.sp('pb', 20), 'max-w-[1100px] mx-auto')}>
          <div
            className={cm.cn(
              'relative overflow-hidden rounded-[2rem] shadow-2xl shadow-black/40 border border-[var(--photo-border)]',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--photo-panel-bg) 0%, var(--photo-surface-elevated) 50%, var(--color-secondary-container) 130%)',
            }}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-[var(--photo-accent)]/25 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute -left-10 -top-10 w-48 h-48 rounded-full bg-[var(--photo-danger)]/20 blur-3xl',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 lg:p-12 items-center',
              )}
            >
              <div className={cm.cn('lg:col-span-7')}>
                <span
                  className={cm.cn(
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-surface/15 backdrop-blur-md text-white/95',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    aperture
                  </span>
                  {t('landing.sample.eyebrow', {}, { defaultValue: 'Inside the editor' })}
                </span>
                <h2
                  className={cm.cn(
                    'text-4xl md:text-5xl font-extrabold tracking-tighter mt-5 leading-[1.02] text-white',
                  )}
                >
                  {t(
                    'landing.sample.headline',
                    {},
                    { defaultValue: 'Velvet Dusk on Blue Hour over Reykjavík' },
                  )}
                </h2>
                <p
                  className={cm.cn(
                    'text-base md:text-lg text-white/80 leading-relaxed mt-4 max-w-xl',
                  )}
                >
                  {t(
                    'landing.sample.body',
                    {},
                    {
                      defaultValue:
                        'A two-second roundtrip from RAW to delivery — one preset, three sliders, zero color cast on the canvas. Every keystroke is undoable, every adjustment is reversible.',
                    },
                  )}
                </p>
                <div className={cm.cn('grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7')}>
                  {STATS.map((s) => (
                    <div
                      key={s.value}
                      className={cm.cn(
                        'rounded-xl bg-surface/5 backdrop-blur border border-surface/10 p-4 hover:-translate-y-0.5 transition-transform',
                      )}
                    >
                      <p
                        className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight')}
                        style={{ color: s.accent }}
                      >
                        {s.value}
                      </p>
                      <p
                        className={cm.cn(
                          'text-[10px] font-mono font-bold uppercase tracking-widest text-white/70 mt-1',
                        )}
                      >
                        {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className={cm.cn('lg:col-span-5 flex justify-center lg:justify-end')}>
                <div className={cm.cn('relative')}>
                  <div
                    className={cm.cn(
                      'w-56 h-56 lg:w-72 lg:h-72 rounded-3xl shadow-2xl shadow-black/40 flex items-center justify-center overflow-hidden',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--photo-hero-from) 0%, var(--photo-hero-via) 50%, var(--photo-hero-to) 100%)',
                    }}
                    aria-hidden="true"
                  >
                    <div
                      className={cm.cn(
                        'absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.18)_1px,transparent_0)] [background-size:18px_18px] opacity-50',
                      )}
                    />
                    <span className={cm.cn('material-symbols-outlined text-[140px] text-white/85')}>
                      photo_camera
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-surface shadow-xl flex items-center justify-center',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'material-symbols-outlined text-[32px] text-[var(--photo-accent)]',
                      )}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      auto_fix_high
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('py', 16),
            cm.sp('px', 6),
            'bg-[var(--photo-panel-bg)] border-y border-[var(--photo-border)]',
          )}
        >
          <div className={cm.cn('max-w-[1100px] mx-auto')}>
            <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mb', 3),
                  'font-mono uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
                )}
              >
                {t('landing.featuresEyebrow', {}, { defaultValue: '// what makes it sing' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-[var(--photo-text)]',
                )}
              >
                {t('landing.featuresTitle', {}, { defaultValue: 'A power tool, in the browser' })}
              </h2>
            </div>
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-4')}>
              {FEATURES.map((f) => (
                <article
                  key={f.titleKey}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-xl border border-[var(--photo-border)] bg-[var(--photo-surface)] hover:border-[var(--photo-accent)]/50 hover:-translate-y-0.5 transition-all',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.sp('mb', 4),
                      'rounded-lg bg-gradient-to-br from-[var(--photo-accent)]/25 to-[var(--photo-danger)]/25 text-[var(--photo-panel-text-accent)]',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                      {f.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.textSize('lg'),
                      cm.sp('mb', 2),
                      'text-[var(--photo-text)]',
                    )}
                  >
                    {t(f.titleKey, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-[var(--photo-text-muted)] leading-relaxed',
                    )}
                  >
                    {t(f.bodyKey, { appName: APP_NAME }, { defaultValue: f.defaultBody })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('py', 16), cm.sp('px', 6))}>
          <div className={cm.cn('max-w-[1100px] mx-auto')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'end', justify: 'between', gap: 'md' }),
                cm.sp('mb', 8),
              )}
            >
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mb', 2),
                    'font-mono uppercase tracking-widest text-[var(--photo-panel-text-accent)]',
                  )}
                >
                  {t('landing.presetsEyebrow', {}, { defaultValue: '// from the preset library' })}
                </p>
                <h2
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-[var(--photo-text)]',
                  )}
                >
                  {t(
                    'landing.presetsTitle',
                    {},
                    { defaultValue: 'Looks ready for tonight\u2019s shoot' },
                  )}
                </h2>
              </div>
              <Link
                to="/presets"
                className={cm.cn(
                  'font-mono text-[11px] uppercase tracking-widest text-[var(--photo-panel-text-accent)] hover:text-[var(--photo-danger)] transition-colors',
                )}
              >
                {t('landing.viewAll', {}, { defaultValue: 'See more →' })}
              </Link>
            </div>
            <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4')}>
              {featuredPresets.map((p) => (
                <PresetTile key={p.id} preset={p} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

export default Landing
