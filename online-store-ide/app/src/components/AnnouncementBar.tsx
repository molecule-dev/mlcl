/**
 * Thin shim around @molecule/app-storefront-chrome-react's
 * StorefrontAnnouncementBar. Provides the per-app promo copy + CTA;
 * shared package owns the slim-bar rendering.
 */
import { useTranslation } from '@molecule/app-react'
import { StorefrontAnnouncementBar } from '@molecule/app-storefront-chrome-react'

export function AnnouncementBar() {
  const { t } = useTranslation()
  return (
    <StorefrontAnnouncementBar
      message={t(
        'announcementBar.promoMessage',
        { threshold: '$75' },
        { defaultValue: 'Free shipping on orders over {{threshold}} — ' },
      )}
      cta={{ to: '/', label: t('announcementBar.cta', {}, { defaultValue: 'Shop now' }) }}
    />
  )
}

export default AnnouncementBar
