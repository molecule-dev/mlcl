import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ActiveAgentsCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [hint, setHint] = useState<string | null>(null)
  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        cm.stack(6),
        'bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'text-on-surface',
        )}
      >
        {t('activeAgentsCard.title', {}, { defaultValue: 'Active Agents' })}
      </h3>
      {hint && (
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')} role="status">
          {hint}
        </p>
      )}
      <div className={cm.stack(5)}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }))}>
          <div className={cm.flex({ align: 'center', gap: 3 })}>
            <div className={cm.cn('relative')}>
              <img
                className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
                alt={t(
                  'activeAgentsCard.agent1AvatarAlt',
                  {},
                  {
                    defaultValue:
                      'professional headshot of a female support agent with a friendly smile in a modern office',
                  },
                )}
                src="https://picsum.photos/seed/ActiveAgentsCard-1/1200/800"
              />
              <div
                className={cm.cn(
                  cm.w(3),
                  cm.h(3),
                  cm.roundedFull,
                  'absolute bottom-0 right-0 bg-emerald-500 border-2 border-surface',
                )}
              ></div>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'min-w-0')}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-on-surface leading-tight',
                )}
              >
                {t(
                  'activeAgentsCard.agentName',
                  { name: 'Alice Wong' },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <p
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'text-[10px] text-foreground-secondary leading-tight',
                )}
              >
                {t(
                  'activeAgentsCard.ticketsHandled',
                  { count: 8 },
                  { defaultValue: '{{count}} tickets handled' },
                )}
              </p>
            </div>
          </div>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined text-foreground-tertiary cursor-pointer',
            )}
            data-icon="mail"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setHint(
                  t(
                    'demo.actionNotWired',
                    {},
                    { defaultValue: 'Not available in this demo preview.' },
                  ),
                )
              }
            }}
            onClick={() =>
              setHint(
                t(
                  'demo.actionNotWired',
                  {},
                  { defaultValue: 'Not available in this demo preview.' },
                ),
              )
            }
          >
            mail
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }))}>
          <div className={cm.flex({ align: 'center', gap: 3 })}>
            <div className={cm.cn('relative')}>
              <img
                className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
                alt={t(
                  'activeAgentsCard.agent2AvatarAlt',
                  {},
                  {
                    defaultValue:
                      'close-up of a smiling man with glasses, professional portrait for corporate profile',
                  },
                )}
                src="https://picsum.photos/seed/ActiveAgentsCard-2/1200/800"
              />
              <div
                className={cm.cn(
                  cm.w(3),
                  cm.h(3),
                  cm.roundedFull,
                  'absolute bottom-0 right-0 bg-emerald-500 border-2 border-surface',
                )}
              ></div>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'min-w-0')}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-on-surface leading-tight',
                )}
              >
                {t(
                  'activeAgentsCard.agentName',
                  { name: 'Markus Aurel' },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <p
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'text-[10px] text-foreground-secondary leading-tight',
                )}
              >
                {t(
                  'activeAgentsCard.ticketsHandled',
                  { count: 12 },
                  { defaultValue: '{{count}} tickets handled' },
                )}
              </p>
            </div>
          </div>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined text-foreground-tertiary cursor-pointer',
            )}
            data-icon="mail"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setHint(
                  t(
                    'demo.actionNotWired',
                    {},
                    { defaultValue: 'Not available in this demo preview.' },
                  ),
                )
              }
            }}
            onClick={() =>
              setHint(
                t(
                  'demo.actionNotWired',
                  {},
                  { defaultValue: 'Not available in this demo preview.' },
                ),
              )
            }
          >
            mail
          </span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 4 }))}>
          <div className={cm.flex({ align: 'center', gap: 3 })}>
            <div className={cm.cn('relative')}>
              <img
                className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
                alt={t(
                  'activeAgentsCard.agent3AvatarAlt',
                  {},
                  {
                    defaultValue:
                      'portrait of a focused young man in a casual workplace environment',
                  },
                )}
                src="https://picsum.photos/seed/ActiveAgentsCard-3/1200/800"
              />
              <div
                className={cm.cn(
                  cm.w(3),
                  cm.h(3),
                  cm.roundedFull,
                  'absolute bottom-0 right-0 bg-slate-400 border-2 border-surface',
                )}
              ></div>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 1 }), 'min-w-0')}>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-on-surface leading-tight',
                )}
              >
                {t(
                  'activeAgentsCard.agentName',
                  { name: 'Leo Stanton' },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <p
                className={cm.cn(
                  cm.fontWeight('medium'),
                  'text-[10px] text-foreground-secondary leading-tight',
                )}
              >
                {t(
                  'activeAgentsCard.awayStatus',
                  { reason: t('common.lunch', {}, { defaultValue: 'Lunch' }) },
                  { defaultValue: 'Away ({{reason}})' },
                )}
              </p>
            </div>
          </div>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'material-symbols-outlined text-foreground-tertiary cursor-pointer',
            )}
            data-icon="mail"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setHint(
                  t(
                    'demo.actionNotWired',
                    {},
                    { defaultValue: 'Not available in this demo preview.' },
                  ),
                )
              }
            }}
            onClick={() =>
              setHint(
                t(
                  'demo.actionNotWired',
                  {},
                  { defaultValue: 'Not available in this demo preview.' },
                ),
              )
            }
          >
            mail
          </span>
        </div>
      </div>
    </section>
  )
}

export default ActiveAgentsCard
export { ActiveAgentsCard }
