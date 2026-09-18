/**
 * Landing-page hero chat preview — gradient teal card with three demo
 * bubbles inside a glass panel, mimicking what a logged-in agent sees.
 * Decorative blurred orbs in two corners; rounded-[2rem] frame.
 *
 * Pattern source: personal-finance NetWorthCard hero gradient + a chat
 * bubble stack adapted from team-chat ChatBody, both translated for
 * Rapport's warm-teal palette.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

function LandingHeroChat() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-[color:var(--color-primary-container)] to-[var(--color-hero-bot-bg)] text-on-primary shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)]',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          cm.roundedFull,
          'absolute -top-20 -right-20 w-72 h-72 bg-surface/15 blur-3xl pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          cm.roundedFull,
          'absolute -bottom-24 -left-16 w-80 h-80 bg-secondary-container/25 blur-3xl pointer-events-none',
        )}
      />

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 6 }), 'relative z-10')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'bg-surface/20 backdrop-blur-md text-[10px] tracking-widest uppercase',
            )}
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
              support_agent
            </span>
            {t('landingHeroChat.eyebrow', {}, { defaultValue: 'Live demo' })}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-white/70')}>
            {t(
              'landingHeroChat.subhead',
              { appName: APP_NAME },
              { defaultValue: 'A conversation {{appName}} just resolved' },
            )}
          </span>
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 3 }),
            cm.sp('p', 5),
            'rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20',
          )}
        >
          {/* Customer */}
          <div className={cm.cn(cm.flex({ justify: 'end' }))}>
            <div
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.maxW('[80%]'),
                'rounded-[16px_4px_16px_16px] bg-surface text-on-surface leading-relaxed shadow-sm',
              )}
            >
              {t(
                'landingHeroChat.customerMessage',
                {},
                {
                  defaultValue:
                    'Hi! My delivery shows out for delivery yesterday but never arrived.',
                },
              )}
            </div>
          </div>
          {/* Bot */}
          <div className={cm.cn(cm.flex())}>
            <div
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.maxW('[85%]'),
                'rounded-[4px_16px_16px_16px] bg-[color-mix(in_srgb,var(--color-hero-bot-bg)_80%,transparent)] backdrop-blur-sm border border-surface/15 text-white leading-relaxed',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('mb', 1),
                  cm.fontWeight('bold'),
                  'text-[10px] tracking-widest uppercase text-white/80',
                )}
              >
                <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
                  smart_toy
                </span>
                {t(
                  'landingHeroChat.botName',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} AI' },
                )}
              </div>
              {t(
                'landingHeroChat.botMessage',
                {},
                {
                  defaultValue:
                    "I'm so sorry — I can see order #4187 was marked delivered to your back porch at 4:12 PM. I'll loop in a senior agent to investigate and refund the shipping immediately.",
                },
              )}
            </div>
          </div>
          {/* Agent */}
          <div className={cm.cn(cm.flex())}>
            <div
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.maxW('[85%]'),
                'rounded-[4px_16px_16px_16px] bg-background text-primary-hover leading-relaxed border-l-[3px] border-info',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 2 }),
                  cm.sp('mb', 1),
                  cm.fontWeight('bold'),
                  'text-[10px] tracking-widest uppercase text-primary-hover',
                )}
              >
                <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>badge</span>
                {t(
                  'landingHeroChat.agentLabel',
                  { name: 'Sarah J.' },
                  { defaultValue: '{{name}} · Senior Agent' },
                )}
              </div>
              {t(
                'landingHeroChat.agentMessage',
                {},
                {
                  defaultValue:
                    'Got it — I just refunded $14.50 in shipping and dispatched a replacement via priority overnight. You should have a tracking email within 5 minutes.',
                },
              )}
            </div>
          </div>
        </div>

        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.textSize('xs'),
            'text-white/85',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>timer</span>
            {t(
              'landingHeroChat.metaResolved',
              { seconds: 47 },
              { defaultValue: 'Resolved in {{seconds}} seconds' },
            )}
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <span
              className={cm.cn(
                'material-symbols-outlined',
                cm.textSize('base'),
                'text-[var(--color-star-accent)]',
              )}
            >
              star
            </span>
            {t(
              'landingHeroChat.metaCsat',
              { score: '4.9 / 5.0' },
              { defaultValue: 'CSAT {{score}}' },
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingHeroChat
export { LandingHeroChat }
