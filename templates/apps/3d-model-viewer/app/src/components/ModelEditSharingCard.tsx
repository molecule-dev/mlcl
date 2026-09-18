import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SharingCardProps {
  isPublic: boolean
  setIsPublic: (v: boolean) => void
}

function ModelEditSharingCard({ isPublic, setIsPublic }: SharingCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl ambient-shadow ghost-border lg:p-8',
      )}
    >
      <h2
        className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 6), 'text-[1.375rem] text-on-surface')}
      >
        {t('modelEditSharingCard.title', {}, { defaultValue: 'Sharing & Permissions' })}
      </h2>
      <div className={cm.stack(6)}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-xl border border-outline-variant/10',
          )}
        >
          <div>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'modelEditSharingCard.publicVisibilityLabel',
                {},
                { defaultValue: 'Public Visibility' },
              )}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'modelEditSharingCard.publicVisibilityDescription',
                {},
                { defaultValue: 'Allow anyone with the link to view this model.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'modelEditSharingCard.publicVisibilityLabel',
                {},
                { defaultValue: 'Public Visibility' },
              )}
              checked={isPublic}
              className="sr-only peer"
              type="checkbox"
              value=""
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <div
              className={cm.cn(
                cm.w(11),
                cm.h(6),
                "bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </label>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface-container-low rounded-xl border border-outline-variant/10 opacity-60',
          )}
        >
          <div>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t(
                'modelEditSharingCard.passwordProtectionLabel',
                {},
                { defaultValue: 'Password Protection' },
              )}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {t(
                'modelEditSharingCard.passwordProtectionDescription',
                {},
                { defaultValue: 'Require a password to access the viewer link.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'modelEditSharingCard.passwordProtectionLabel',
                {},
                { defaultValue: 'Password Protection' },
              )}
              className="sr-only peer"
              disabled={true}
              type="checkbox"
              value=""
            />
            <div
              className={cm.cn(
                cm.w(11),
                cm.h(6),
                "bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </label>
        </div>
      </div>
    </div>
  )
}

export default ModelEditSharingCard
export { ModelEditSharingCard }
