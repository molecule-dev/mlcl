import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ReportsTopPerformersCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-3xl architectural-shadow',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 6),
          'tracking-wider text-on-surface uppercase opacity-80',
        )}
      >
        {t('reportsTopPerformersCard.title', {}, { defaultValue: 'Top Performers' })}
      </h3>
      <div className={cm.stack(6)}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
            <img
              className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
              alt=""
              data-alt="professional portrait of a senior sales executive man in a grey suit"
              src="https://picsum.photos/seed/ReportsTopPerformersCard-1/1200/800"
            />
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                {t(
                  'reportsTopPerformersCard.performer1Name',
                  {},
                  { defaultValue: 'Julian Pierce' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                {t(
                  'reportsTopPerformersCard.performer1Role',
                  {},
                  { defaultValue: 'Lead Enterprise Rep' },
                )}
              </p>
            </div>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}>
            {t(
              'reportsTopPerformersCard.performer1Revenue',
              { amount: '$412K' },
              { defaultValue: '{{amount}}' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
            <img
              className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
              alt=""
              data-alt="professional portrait of a confident business woman smiling with urban background"
              src="https://picsum.photos/seed/ReportsTopPerformersCard-2/1200/800"
            />
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                {t(
                  'reportsTopPerformersCard.performer2Name',
                  {},
                  { defaultValue: 'Elena Rodriguez' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                {t(
                  'reportsTopPerformersCard.performer2Role',
                  {},
                  { defaultValue: 'SaaS Specialist' },
                )}
              </p>
            </div>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}>
            {t(
              'reportsTopPerformersCard.performer2Revenue',
              { amount: '$385K' },
              { defaultValue: '{{amount}}' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
            <img
              className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
              alt=""
              data-alt="headshot of a smiling professional man with short dark hair and a light blue shirt"
              src="https://picsum.photos/seed/ReportsTopPerformersCard-3/1200/800"
            />
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                {t('reportsTopPerformersCard.performer3Name', {}, { defaultValue: 'Marcus Chen' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                {t(
                  'reportsTopPerformersCard.performer3Role',
                  {},
                  { defaultValue: 'Strategic Accounts' },
                )}
              </p>
            </div>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}>
            {t(
              'reportsTopPerformersCard.performer3Revenue',
              { amount: '$298K' },
              { defaultValue: '{{amount}}' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
            <img
              className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
              alt=""
              data-alt="professional woman wearing glasses and a blazer in a modern office setting"
              src="https://picsum.photos/seed/ReportsTopPerformersCard-4/1200/800"
            />
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                {t(
                  'reportsTopPerformersCard.performer4Name',
                  {},
                  { defaultValue: 'Sarah Jenkins' },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                {t(
                  'reportsTopPerformersCard.performer4Role',
                  {},
                  { defaultValue: 'Account Manager' },
                )}
              </p>
            </div>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), cm.textPrimary)}>
            {t(
              'reportsTopPerformersCard.performer4Revenue',
              { amount: '$152K' },
              { defaultValue: '{{amount}}' },
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

export default ReportsTopPerformersCard
export { ReportsTopPerformersCard }
