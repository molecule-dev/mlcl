import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface KnowledgeBasePageHeaderProps {
  /** Opens the page's inline "add document" form. */
  onAddSource?: () => void
}

function KnowledgeBasePageHeader({ onAddSource }: KnowledgeBasePageHeaderProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
      <div className={cm.stack(2)}>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            'font-headline font-extrabold text-on-surface tracking-tight',
          )}
        >
          {t('knowledgeBasePageHeader.title', {}, { defaultValue: 'Knowledge Base' })}
        </h1>
        <p className={cm.cn(cm.maxW('md'), 'text-on-surface-variant')}>
          {t(
            'knowledgeBasePageHeader.description',
            {},
            {
              defaultValue:
                'Manage the technical documentation and data sources used to train your AI architect models.',
            },
          )}
        </p>
      </div>
      <button
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'gap-2 bg-primary text-on-primary rounded-xl hover:opacity-95 transition-all shadow-lg shadow-primary/10',
        )}
        onClick={() => onAddSource?.()}
      >
        <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')} data-icon="add">
          add
        </span>
        <span>{t('knowledgeBasePageHeader.addSource', {}, { defaultValue: 'Add Source' })}</span>
      </button>
    </div>
  )
}

export default KnowledgeBasePageHeader
export { KnowledgeBasePageHeader }
