import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

const FEATURES = [
  {
    key: 'transcribe',
    icon: 'mic',
    accent: 'var(--color-speaker-1)',
    defaultTitle: 'Live transcription with speaker labels',
    defaultBody:
      'Drop in mid-meeting and pick up the thread. {{appName}} tags every voice with a color so the transcript reads like a script.',
  },
  {
    key: 'summarize',
    icon: 'auto_awesome',
    accent: 'var(--color-secondary)',
    defaultTitle: 'AI summaries in seconds',
    defaultBody:
      'TL;DR, decisions, and follow-ups extracted the moment the call ends — ready to share before the next standup.',
  },
  {
    key: 'actions',
    icon: 'task_alt',
    accent: 'var(--color-speaker-3)',
    defaultTitle: 'Action items, owned',
    defaultBody:
      'Each action item gets an owner and a due date. They roll up across meetings so nothing slips between the cracks.',
  },
  {
    key: 'search',
    icon: 'search',
    accent: 'var(--color-speaker-4)',
    defaultTitle: 'Search every word',
    defaultBody:
      'Full-text search across transcripts, decisions, and follow-ups. Jump straight to the quote with one click.',
  },
] as const

const STATS = [
  { key: 'minutes', defaultValue: '12k', defaultLabel: 'meeting hours captured' },
  { key: 'teams', defaultValue: '900+', defaultLabel: 'teams use {{appName}}' },
  { key: 'rating', defaultValue: '4.9★', defaultLabel: 'avg. customer rating' },
] as const

const SAMPLE_TRANSCRIPT = [
  {
    ts: '00:01',
    speaker: 'Sasha',
    accent: 'var(--color-speaker-1)',
    text: 'Quick recap from yesterday — we agreed to push launch to May 12.',
  },
  {
    ts: '00:08',
    speaker: 'Mira',
    accent: 'var(--color-speaker-2)',
    text: 'Right. Open question was whether to bundle the dashboard redesign.',
  },
  {
    ts: '00:18',
    speaker: 'Devon',
    accent: 'var(--color-speaker-3)',
    text: "I'd say split. The dashboard isn't code-complete and bundling adds risk.",
  },
  {
    ts: '00:24',
    speaker: 'Sasha',
    accent: 'var(--color-speaker-1)',
    text: 'Agreed. Ship the launch on May 12 and target the dashboard for May 26.',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingTopNavBar />

      <main>
        {/* Hero — Stitch centers the copy over a radial gradient wash */}
        <section
          className={cm.cn(
            'relative overflow-hidden bg-gradient-hero',
            cm.sp('pt', 16),
            cm.sp('pb', 24),
            cm.sp('px', 6),
          )}
        >
          <div
            className={cm.cn(
              'relative z-10 flex flex-col items-center text-center',
              cm.maxW('5xl'),
              cm.mxAuto,
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'self-center uppercase tracking-widest rounded-full bg-primary/10 text-primary border border-primary/20',
              )}
            >
              <span aria-hidden="true" className={cm.cn('h-2 w-2 bg-primary', cm.roundedFull)} />
              {t('landing.eyebrow', {}, { defaultValue: 'AI meeting intelligence' })}
            </span>
            <h1
              className={cm.cn(
                cm.sp('mt', 6),
                cm.textSize('5xl'),
                'md:text-7xl',
                cm.fontWeight('extrabold'),
                'tracking-tight leading-tight text-primary',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Every word, distilled' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'md:text-2xl text-on-surface-variant max-w-3xl mx-auto leading-relaxed',
                cm.sp('mt', 6),
              )}
            >
              {t(
                'landing.heroSubtitle',
                { tagline: APP_TAGLINE, appName: APP_NAME },
                {
                  defaultValue:
                    '{{tagline}}. {{appName}} joins your calls, transcribes every word with speaker labels, and ships AI summaries plus owned action items the moment the meeting ends.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 4, wrap: 'wrap' }),
                cm.sp('mt', 10),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'rounded-lg btn-primary-gradient text-on-primary hover:opacity-90 transition-opacity ambient-shadow',
                )}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 18 }}
                >
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-dim transition-colors',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined')}
                  style={{ fontSize: 18 }}
                >
                  play_circle
                </span>
                {t('landing.heroSecondary', {}, { defaultValue: 'Watch 90-second tour' })}
              </Link>
            </div>
            <ul
              className={cm.cn(
                cm.flex({ gap: 'lg', wrap: 'wrap', justify: 'center' }),
                cm.sp('pt', 8),
              )}
            >
              {STATS.map((s) => (
                <li key={s.key} className={cm.cn(cm.stack(1))}>
                  <span
                    className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.textPrimary)}
                  >
                    {t(`landing.stat.${s.key}.value`, {}, { defaultValue: s.defaultValue })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant uppercase tracking-wider',
                    )}
                  >
                    {t(
                      `landing.stat.${s.key}.label`,
                      { appName: APP_NAME },
                      { defaultValue: s.defaultLabel },
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className={cm.cn('w-full', cm.sp('mt', 16))}>
              <SampleTranscriptCard transcript={SAMPLE_TRANSCRIPT} t={t} />
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div
            className={cm.cn(
              cm.textCenter,
              cm.maxW('2xl'),
              cm.mxAuto,
              cm.sp('mb', 12),
              cm.stack(3),
            )}
          >
            <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Everything your team needs after the meeting ends' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'landing.featuresSubheading',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'No more "wait, who owns this?" {{appName}} ships the recap before the call disconnects.',
                },
              )}
            </p>
          </div>

          <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 6),
                  cm.stack(3),
                  'border-l-4 hover:-translate-y-0.5 transition-transform',
                )}
                style={{ borderLeftColor: f.accent }}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    'h-11 w-11',
                  )}
                  style={{ backgroundColor: `color-mix(in srgb, ${f.accent} 18%, transparent)` }}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontSize: 22, color: f.accent, fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.feature.${f.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div
            className={cm.cn(
              'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-xl',
              cm.sp('px', 8),
              cm.sp('py', 12),
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.textCenter,
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn(
                'absolute -right-20 -bottom-20 h-72 w-72 bg-surface/15 blur-3xl pointer-events-none',
                cm.roundedFull,
              )}
            />
            <span
              aria-hidden="true"
              className={cm.cn(
                'absolute -left-16 -top-16 h-56 w-56 bg-surface/10 blur-3xl pointer-events-none',
                cm.roundedFull,
              )}
            />
            <h2
              className={cm.cn(
                'relative z-10',
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tracking-tight',
              )}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Stop taking notes. Start making decisions.' },
              )}
            </h2>
            <p className={cm.cn('relative z-10', cm.textSize('base'), 'opacity-90 max-w-xl')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free for the first 5 meetings every month. No credit card. Connect Google Calendar in under a minute.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'relative z-10',
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.textSize('base'),
                cm.fontWeight('semibold'),
                'rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container-low transition-colors shadow-lg',
              )}
            >
              {t('landing.ctaButton', {}, { defaultValue: 'Get started — it’s free' })}
              <span
                aria-hidden="true"
                className={cm.cn('material-symbols-outlined')}
                style={{ fontSize: 18 }}
              >
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}

interface TranscriptLine {
  ts: string
  speaker: string
  accent: string
  text: string
}

function SampleTranscriptCard({
  transcript,
  t,
}: {
  transcript: readonly TranscriptLine[]
  t: ReturnType<typeof useTranslation>['t']
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        'relative bg-surface-container-lowest ambient-shadow rounded-2xl overflow-hidden border border-outline-variant/30',
        cm.sp('p', 6),
        cm.stack(4),
      )}
    >
      <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            aria-hidden="true"
            className={cm.cn('h-2.5 w-2.5 bg-error', cm.roundedFull, 'animate-pulse')}
          />
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-error',
            )}
          >
            {t('landing.demo.recording', {}, { defaultValue: 'Recording · live' })}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.textSize('xs'),
            'text-on-surface-variant font-mono tabular-nums',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 14 }}
          >
            schedule
          </span>
          02:48
        </span>
      </header>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))} aria-hidden="true">
        {Array.from({ length: 28 }).map((_, i) => {
          const h = 6 + Math.abs(Math.sin(i * 0.55) * 22)
          return (
            <span
              key={i}
              className={cm.cn(
                'inline-block bg-primary rounded-sm',
                i % 4 === 0 ? 'opacity-90' : 'opacity-60',
              )}
              style={{ width: 3, height: h }}
            />
          )
        })}
      </div>

      <ol className={cm.cn(cm.stack(3), 'font-verbatim')}>
        {transcript.map((line) => (
          <li
            key={line.ts}
            className={cm.cn(cm.flex({ gap: 'md' }), cm.sp('pl', 3))}
            style={{ borderLeft: `2px solid ${line.accent}` }}
          >
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-mono tabular-nums w-12 shrink-0 text-on-surface-variant',
                cm.sp('pt', 1),
              )}
            >
              {line.ts}
            </span>
            <div className={cm.cn('min-w-0', cm.stack(1))}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wide',
                )}
                style={{ color: line.accent }}
              >
                {line.speaker}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>{line.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.stack(2),
          'rounded-xl bg-secondary-container/30 border-l-4 border-secondary',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-secondary')}
            style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('landing.demo.aiLabel', {}, { defaultValue: 'AI summary, drafted live' })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>
          {t(
            'landing.demo.aiBody',
            {},
            {
              defaultValue:
                'Launch pushed from May 5 → May 12 to give ops staffing room. Dashboard redesign split off to May 26.',
            },
          )}
        </p>
      </div>
    </div>
  )
}
