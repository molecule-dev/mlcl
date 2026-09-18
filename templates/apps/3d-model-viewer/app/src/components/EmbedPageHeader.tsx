import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function EmbedPageHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('mb', 8), cm.flex({ justify: 'between', align: 'end' }))}>
      <div>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'font-headline text-[2.5rem] tracking-tight text-on-surface leading-none',
          )}
        >
          {t('embedPageHeader.title', {}, { defaultValue: 'Embed Configuration' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.maxW('2xl'), 'text-on-surface-variant')}>
          {t(
            'embedPageHeader.description',
            {},
            {
              defaultValue:
                'Configure and preview how this 3D model will appear when embedded on external sites.',
            },
          )}
        </p>
      </div>
    </div>
  )
}

export default EmbedPageHeader
export { EmbedPageHeader }
