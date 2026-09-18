import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AdminSettingsSaveBar({
  onSave,
  saving,
  savedAt,
}: {
  onSave: () => void
  saving: boolean
  savedAt: number | null
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        'fixed bottom-0 right-0 left-[260px] bg-surface/80 backdrop-blur-md border-t border-border z-40',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ justify: 'end', align: 'center', gap: 4 }),
          cm.maxW('[1176px]'),
          cm.mxAuto,
        )}
      >
        {savedAt && (
          <span style={{ color: 'var(--color-in-stock)', fontSize: '14px' }}>
            {t('common.saved', {}, { defaultValue: 'Saved' })}
          </span>
        )}
        <button
          className={cm.cn(
            cm.button(),
            cm.sp('py', 3),
            cm.sp('px', 8),
            cm.fontWeight('bold'),
            'bg-primary hover:opacity-90 text-on-primary rounded-lg shadow-lg transition-all active:scale-95',
          )}
          data-mol-id="btn-save-settings"
          onClick={onSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
        </button>
      </div>
    </div>
  )
}

export default AdminSettingsSaveBar
export { AdminSettingsSaveBar }
