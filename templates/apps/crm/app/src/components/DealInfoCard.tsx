import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function DealInfoCard({
  deal,
}: {
  deal: { owner_name: string | null; source: string | null; created_at: string | null } | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl architectural-shadow',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 6))}>
        <h3
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('dealInfoCard.title', {}, { defaultValue: 'Deal Information' })}
        </h3>
        <button
          type="button"
          className={cm.cn(
            cm.cursorPointer,
            'material-symbols-outlined text-outline hover:text-primary',
          )}
          onClick={() => {
            /* TODO: wire when backend endpoint exists */
          }}
          aria-label={t('dealInfoCard.moreOptions', {}, { defaultValue: 'More options' })}
        >
          more_horiz
        </button>
      </div>
      <div className={cm.cn(cm.grid({ cols: 2, gap: 'none' }), 'gap-y-6')}>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-lg bg-surface-container-low text-primary',
            )}
          >
            <span className={cm.fv5b245ffa}>person</span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline uppercase tracking-widest',
              )}
            >
              {t('dealInfoCard.ownerLabel', {}, { defaultValue: 'Owner' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {deal?.owner_name ??
                t('dealInfoCard.ownerFallback', {}, { defaultValue: 'Sarah Jenkins' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-lg bg-surface-container-low text-primary',
            )}
          >
            <span className={cm.fv5b245ffa}>share</span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline uppercase tracking-widest',
              )}
            >
              {t('dealInfoCard.sourceLabel', {}, { defaultValue: 'Source' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {deal?.source ?? t('dealInfoCard.sourceFallback', {}, { defaultValue: 'Referral' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-lg bg-surface-container-low text-primary',
            )}
          >
            <span className={cm.fv5b245ffa}>calendar_today</span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline uppercase tracking-widest',
              )}
            >
              {t('dealInfoCard.createdLabel', {}, { defaultValue: 'Created' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {deal?.created_at
                ? new Date(deal.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : t('dealInfoCard.createdFallback', {}, { defaultValue: 'Oct 1, 2024' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-lg bg-surface-container-low text-primary',
            )}
          >
            <span className={cm.fv5b245ffa}>history</span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline uppercase tracking-widest',
              )}
            >
              {t('dealInfoCard.lastActivityLabel', {}, { defaultValue: 'Last Activity' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('dealInfoCard.lastActivity', { hours: 2 }, { defaultValue: '{{hours}}h ago' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-lg bg-surface-container-low text-primary',
            )}
          >
            <span className={cm.fv5b245ffa}>category</span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline uppercase tracking-widest',
              )}
            >
              {t('form.type', {}, { defaultValue: 'Type' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('dealInfoCard.dealType', {}, { defaultValue: 'New Business' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-lg bg-surface-container-low text-primary',
            )}
          >
            <span className={cm.fv5b245ffa}>priority_high</span>
          </div>
          <div>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] text-outline uppercase tracking-widest',
              )}
            >
              {t('form.priority', {}, { defaultValue: 'Priority' })}
            </p>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('px', 2),
                cm.roundedFull,
                'py-0.5 bg-error-light text-error',
              )}
            >
              {t('dealInfoCard.priority', {}, { defaultValue: 'High' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default DealInfoCard
export { DealInfoCard }
