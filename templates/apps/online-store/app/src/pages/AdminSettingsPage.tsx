/** Loaded form fields use the bonded form controller: edit setters mark dirty; fill setters preserve edits. */
// Phase 1 baseline — verbatim JSX of design-online-store-admin-settings.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'

import { useForm, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AdminGeneralSettingsCard from '../components/AdminGeneralSettingsCard.js'
import { AdminLayout } from '../components/AdminLayout.js'
import AdminNotificationsSettingsCard from '../components/AdminNotificationsSettingsCard.js'
import AdminPaymentSettingsCard from '../components/AdminPaymentSettingsCard.js'
import AdminSettingsPageHeader from '../components/AdminSettingsPageHeader.js'
import AdminSettingsSaveBar from '../components/AdminSettingsSaveBar.js'
import AdminSettingsTopNavBar from '../components/AdminSettingsTopNavBar.js'
import AdminShippingSettingsCard from '../components/AdminShippingSettingsCard.js'
import AdminTaxSettingsCard from '../components/AdminTaxSettingsCard.js'
function AdminSettingsPage() {
  const { t } = useTranslation()
  const cm = getClassMap()
  const http = useHttpClient()
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [store, setStore, fillStore] = useForm({
    defaultValues: {
      storeName: 'Bazaar',
      storeUrl: 'bazaar.com',
      storeDescription: 'Curating the finest digital experiences for the modern world.',
      logoUrl: '',
    },
    resetOptions: { keepDirtyValues: true },
  }).asState()
  const [shipping, setShipping, fillShipping] = useForm({
    defaultValues: {
      freeShippingThreshold: 75,
      standardRate: 5.99,
      expressRate: 14.99,
      estimatedDelivery: '3-5 days',
    },
    resetOptions: { keepDirtyValues: true },
  }).asState()
  const [payment, setPayment, fillPayment] = useForm({
    defaultValues: {
      stripeEnabled: true,
      paypalEnabled: true,
      applePayEnabled: false,
    },
    resetOptions: { keepDirtyValues: true },
  }).asState()
  const [tax, setTax, fillTax] = useForm({
    defaultValues: { automaticTax: true, taxRate: 8.25, taxRegion: 'US' },
    resetOptions: { keepDirtyValues: true },
  }).asState()
  const [notifications, setNotifications, fillNotifications] = useForm({
    defaultValues: {
      orderConfirmation: true,
      shippingUpdates: true,
      marketingEmails: false,
      reviewRequests: true,
    },
    resetOptions: { keepDirtyValues: true },
  }).asState()
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
        if (d?.store) fillStore(d.store)
        if (d?.shipping) fillShipping(d.shipping)
        if (d?.payment) fillPayment(d.payment)
        if (d?.tax) fillTax(d.tax)
        if (d?.notifications) fillNotifications(d.notifications)
      })
      // Settings fetch is best-effort — on failure the form keeps its
      // sensible defaults and a save will simply write them back.
      .catch(() => {})
  }, [http, fillStore, fillShipping, fillPayment, fillTax, fillNotifications])
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
    <AdminLayout>
      <div className={cm.cn('bg-surface-secondary text-foreground')}>
        {/* Page header bar (chrome — the nav shell lives in AdminLayout) */}
        <AdminSettingsTopNavBar />
        {/* Main Content Canvas */}
        <section
          aria-label={t('admin.settings.regionLabel', {}, { defaultValue: 'Admin settings' })}
          className={cm.cn(cm.flex1, cm.sp('p', 8), cm.minH('full'), 'bg-surface-secondary pb-24')}
          data-mol-id="main-content"
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
        </section>
      </div>
    </AdminLayout>
  )
}

export default AdminSettingsPage
export { AdminSettingsPage, AdminSettingsPage as AdminSettingsPagePage }
