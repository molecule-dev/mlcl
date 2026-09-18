import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

// interactive={false} renders a plain card for use inside a wrapping <Link>
// (nested interactive elements are an accessibility violation).
function DealCard({ interactive = true }: { interactive?: boolean }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const cm = getClassMap()
  const cardClass = cm.cn(
    cm.sp('p', 6),
    cm.cursorPointer,
    'bg-surface-container-lowest rounded-3xl shadow-sm border border-border hover:shadow-md transition-shadow group',
    interactive && 'w-full text-left',
  )
  const content = (
    <>
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between' }), cm.sp('mb', 2))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textPrimary,
            cm.sp('px', 2),
            'text-[11px] bg-primary/5 py-0.5 rounded',
          )}
        >
          TechCorp
        </span>
        <span className={cm.cn(cm.textSize('xs'), 'font-black text-on-surface')}>$45,000</span>
      </div>
      <span
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'block text-on-surface group-hover:text-primary',
        )}
      >
        Cloud Infrastructure Upgrade
      </span>
      <div className={cm.cn(cm.sp('mt', 4), cm.flex({ justify: 'between', align: 'center' }))}>
        <div className={cm.cn(cm.flex({}), '-space-x-2')}>
          <img
            className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'border-2 border-surface')}
            alt=""
            data-alt="headshot of a young professional man, soft studio lighting, focused gaze"
            src="https://picsum.photos/seed/DealCard-1/1200/800"
          />
        </div>
        <span className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-on-surface-variant')}>
          {t('dealCard.daysInStage', { count: 3 }, { defaultValue: '{{count}} days in stage' })}
        </span>
      </div>
    </>
  )
  if (!interactive) {
    return <div className={cardClass}>{content}</div>
  }
  return (
    <button type="button" className={cardClass} onClick={() => navigate('/deals/1')}>
      {content}
    </button>
  )
}
export default DealCard
export { DealCard }
