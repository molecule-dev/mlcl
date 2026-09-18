import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface Deal {
  id: string
  title: string
  value: number
  stage: string
}
interface ContactDealsCardProps {
  deals: Deal[]
}
function ContactDealsCard({ deals }: ContactDealsCardProps) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <>
      {/* Deals Card */}
      <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-3xl shadow-sm')}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-[0.15em] text-on-surface-variant',
            )}
          >
            {t('contactDealsCard.activeDeals', {}, { defaultValue: 'Active Deals' })}
          </h2>
          <Link
            to="/deals"
            className={cm.cn(cm.textSize('xs'), cm.textPrimary, cm.fontWeight('bold'))}
          >
            {t('contactDealsCard.viewPipeline', {}, { defaultValue: 'View Pipeline' })}
          </Link>
        </div>
        <div className={cm.stack(2)}>
          {deals.map((deal) => (
            <button
              type="button"
              key={deal.id}
              className={cm.cn(
                cm.sp('p', 4),
                cm.cursorPointer,
                'w-full text-left bg-surface-container-low rounded group hover:bg-surface-container transition-colors',
              )}
              onClick={() => navigate(`/deals/${deal.id}`)}
            >
              <div
                className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 1))}
              >
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {deal.title}
                </span>
                <span className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'font-black')}>
                  {t(
                    'contactDealsCard.dealValue',
                    { value: deal.value?.toLocaleString() },
                    { defaultValue: '${{value}}' },
                  )}
                </span>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {deal.stage}
                </span>
                <div
                  className={cm.cn(
                    cm.flex1,
                    cm.roundedFull,
                    cm.h(1),
                    'bg-surface-container-high overflow-hidden',
                  )}
                >
                  <div className={cm.cn(cm.h('full'), cm.w('1/4'), 'bg-primary')}></div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
export default ContactDealsCard
export { ContactDealsCard }
