// Phase 1 baseline — verbatim JSX of design-online-store-admin-settings.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AdminGeneralSettingsCard from '../components/AdminGeneralSettingsCard.js'
import AdminNotificationsSettingsCard from '../components/AdminNotificationsSettingsCard.js'
import AdminPaymentSettingsCard from '../components/AdminPaymentSettingsCard.js'
import AdminSettingsPageHeader from '../components/AdminSettingsPageHeader.js'
import AdminSettingsSaveBar from '../components/AdminSettingsSaveBar.js'
import AdminSettingsTopNavBar from '../components/AdminSettingsTopNavBar.js'
import AdminShippingSettingsCard from '../components/AdminShippingSettingsCard.js'
import AdminSideNav from '../components/AdminSideNav.js'
import AdminTaxSettingsCard from '../components/AdminTaxSettingsCard.js'
function AdminSettingsPage() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [store, setStore] = useState({
    storeName: 'Bazaar',
    storeUrl: 'bazaar.com',
    storeDescription: 'Curating the finest digital experiences for the modern world.',
    logoUrl: '',
  })
  const [shipping, setShipping] = useState({
    freeShippingThreshold: 75,
    standardRate: 5.99,
    expressRate: 14.99,
    estimatedDelivery: '3-5 days',
  })
  const [payment, setPayment] = useState({
    stripeEnabled: true,
    paypalEnabled: true,
    applePayEnabled: false,
  })
  const [tax, setTax] = useState({ automaticTax: true, taxRate: 8.25, taxRegion: 'US' })
  const [notifications, setNotifications] = useState({
    orderConfirmation: true,
    shippingUpdates: true,
    marketingEmails: false,
    reviewRequests: true,
  })
  useEffect(() => {
    http
      .get('/api/admin')
      .then((res: unknown) => {
        const d = ((res as { data?: unknown } | null)?.data ?? res) as {
          store?: typeof store
          shipping?: typeof shipping
          payment?: typeof payment
          tax?: typeof tax
          notifications?: typeof notifications
        } | null
        if (d?.store) setStore(d.store)
        if (d?.shipping) setShipping(d.shipping)
        if (d?.payment) setPayment(d.payment)
        if (d?.tax) setTax(d.tax)
        if (d?.notifications) setNotifications(d.notifications)
      })
      // Settings fetch is best-effort — on failure the form keeps its
      // sensible defaults and a save will simply write them back.
      .catch(() => {})
  }, [http])
  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])
  const saveAll = async () => {
    setSaving(true)
    try {
      await http.put('/api/admin', { store, shipping, payment, tax, notifications })
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className={cm.cn('bg-surface-secondary text-foreground')}>
      {/* TopNavBar Shell */}
      <AdminSettingsTopNavBar />
      <div className={cm.cn(cm.flex(), cm.minH('screen'), cm.maxW('[1440px]'), cm.mxAuto)}>
        <AdminSideNav />
        {/* Main Content Canvas */}
        <main
          aria-label={t('admin.settings.regionLabel', {}, { defaultValue: 'Admin settings' })}
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 8),
            cm.minH('full'),
            'ml-[260px] bg-surface-secondary pb-24',
          )}
        >
          <div className={cm.stack(8)}>
            <AdminSettingsPageHeader />
            <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-2')}>
              {/* General Settings Card */}
              <AdminGeneralSettingsCard store={store} onChange={setStore} />
              <AdminPaymentSettingsCard payment={payment} onChange={setPayment} />
              <AdminShippingSettingsCard shipping={shipping} onChange={setShipping} />
              {/* Notifications & Tax Section Container */}
              <div className={cm.stack(8)}>
                {/* Email Notifications Card */}
                <AdminNotificationsSettingsCard
                  notifications={notifications}
                  onChange={setNotifications}
                />
                <AdminTaxSettingsCard tax={tax} onChange={setTax} />
              </div>
            </div>
            {/* Save Changes Footer */}
            <AdminSettingsSaveBar onSave={saveAll} saving={saving} savedAt={savedAt} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminSettingsPage
export { AdminSettingsPage, AdminSettingsPage as AdminSettingsPagePage }
