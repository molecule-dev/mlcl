import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface StoreSettings {
  storeName: string
  storeUrl: string
  storeDescription: string
  logoUrl: string
}
function AdminGeneralSettingsCard({
  store,
  onChange,
}: {
  store: StoreSettings
  onChange: (s: StoreSettings) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>store</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('adminGeneralSettingsCard.title', {}, { defaultValue: 'General Settings' })}
        </h2>
      </div>
      <div className={cm.stack(4)}>
        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t('adminGeneralSettingsCard.storeNameLabel', {}, { defaultValue: 'Store Name' })}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 3),
              cm.textSize('sm'),
              'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
            )}
            data-mol-id="input-store-name"
            type="text"
            value={store.storeName}
            onChange={(e) => onChange({ ...store, storeName: e.target.value })}
          />
        </div>
        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t('adminGeneralSettingsCard.urlLabel', {}, { defaultValue: 'URL' })}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 3),
              cm.textSize('sm'),
              'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
            )}
            data-mol-id="input-store-url"
            type="text"
            value={store.storeUrl}
            onChange={(e) => onChange({ ...store, storeUrl: e.target.value })}
          />
        </div>
        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t('form.description', {}, { defaultValue: 'Description' })}
          </label>
          <textarea
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 3),
              cm.textSize('sm'),
              'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
            )}
            data-mol-id="input-store-desc"
            rows={3}
            value={store.storeDescription}
            onChange={(e) => onChange({ ...store, storeDescription: e.target.value })}
          />
        </div>
        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t('adminGeneralSettingsCard.storeLogoLabel', {}, { defaultValue: 'Store Logo' })}
          </label>
          {/* The sr-only input stays focusable (Enter/Space opens the picker); the
              label triggers it natively on click — no scripted proxy needed. */}
          <input
            id="store-logo-upload"
            type="file"
            accept="image/svg+xml,image/png,image/jpeg"
            className={cm.cn('peer sr-only')}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onChange({ ...store, logoUrl: URL.createObjectURL(f) })
            }}
          />
          <label
            htmlFor="store-logo-upload"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
              cm.sp('p', 8),
              cm.cursorPointer,
              'border-2 border-dashed border-border rounded-xl bg-surface-secondary hover:bg-surface-secondary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/60',
            )}
            data-mol-id="btn-upload-logo"
          >
            <span
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 2),
                'material-symbols-outlined text-foreground-tertiary',
              )}
            >
              cloud_upload
            </span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'block text-foreground-secondary',
              )}
            >
              {t(
                'adminGeneralSettingsCard.uploadPrompt',
                {},
                { defaultValue: 'Click to upload or drag and drop' },
              )}
            </span>
            <span
              className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'block text-foreground-tertiary')}
            >
              {t(
                'adminGeneralSettingsCard.uploadFormats',
                {},
                { defaultValue: 'SVG, PNG, JPG (max. 800x400px)' },
              )}
            </span>
          </label>
        </div>
      </div>
    </section>
  )
}

export default AdminGeneralSettingsCard
export { AdminGeneralSettingsCard }
