import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FooterProps {
  onSaveDraft: () => void
  onPublish: () => void
  saving: boolean
}
export function ListingEditorFooter({ onSaveDraft, onPublish, saving }: FooterProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 12),
        cm.h(24),
        'fixed bottom-0 left-64 right-0 bg-surface/95 backdrop-blur-xl z-20',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <span className={cm.cn('material-symbols-outlined text-success')}>check_circle</span>
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-foreground-secondary')}
        >
          {t(
            'listingEditorFooter.draftSavedAt',
            { time: '10:42 AM' },
            { defaultValue: 'Draft last saved at {{time}}' },
          )}
        </span>
      </div>
      <div className={cm.flex({ gap: 'md' })}>
        <button
          onClick={onSaveDraft}
          disabled={saving}
          className={cm.cn(
            cm.sp('px', 8),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'py-3.5 rounded-xl uppercase tracking-widest hover:bg-surface-container-low transition-colors border border-outline-variant/15 disabled:opacity-50',
          )}
        >
          {t('listingEditorFooter.saveAsDraft', {}, { defaultValue: 'Save as Draft' })}
        </button>
        <button
          onClick={onPublish}
          disabled={saving}
          className={cm.cn(
            'primary-gradient',
            cm.sp('px', 12),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'md' }),
            'py-3.5 rounded-xl uppercase tracking-widest text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50',
          )}
        >
          {t('listingEditorFooter.publishListing', {}, { defaultValue: 'Publish Listing' })}

          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>send</span>
        </button>
      </div>
    </div>
  )
}

export default ListingEditorFooter
