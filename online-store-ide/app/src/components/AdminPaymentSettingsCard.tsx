import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'
interface PaymentSettings {
  stripeEnabled: boolean
  paypalEnabled: boolean
  applePayEnabled: boolean
}
function AdminPaymentSettingsCard({
  payment,
  onChange,
}: {
  payment: PaymentSettings
  onChange: (p: PaymentSettings) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>payments</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('adminPaymentSettingsCard.title', {}, { defaultValue: 'Payment Settings' })}
        </h2>
      </div>
      <div className={cm.stack(4)}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'bg-indigo-600 rounded text-white',
              )}
            >
              {t('adminPaymentSettingsCard.stripeInitial', {}, { defaultValue: 'S' })}
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t('adminPaymentSettingsCard.stripeName', {}, { defaultValue: 'Stripe' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                {t(
                  'adminPaymentSettingsCard.stripeDescription',
                  {},
                  { defaultValue: 'Accept credit cards and digital wallets' },
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={payment.stripeEnabled}
            onChange={(e) =>
              onChange({ ...payment, stripeEnabled: (e.target as HTMLInputElement).checked })
            }
            size="md"
            color="success"
            data-mol-id="toggle-stripe"
            aria-label={t('adminPaymentSettingsCard.stripeName', {}, { defaultValue: 'Stripe' })}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'bg-blue-600 rounded text-white',
              )}
            >
              {t('adminPaymentSettingsCard.paypalInitial', {}, { defaultValue: 'P' })}
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t('adminPaymentSettingsCard.paypalName', {}, { defaultValue: 'PayPal' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                {t(
                  'adminPaymentSettingsCard.paypalDescription',
                  {},
                  { defaultValue: 'Accept PayPal payments globally' },
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={payment.paypalEnabled}
            onChange={(e) =>
              onChange({ ...payment, paypalEnabled: (e.target as HTMLInputElement).checked })
            }
            size="md"
            color="success"
            data-mol-id="toggle-paypal"
            aria-label={t('adminPaymentSettingsCard.paypalName', {}, { defaultValue: 'PayPal' })}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'bg-foreground rounded text-white',
              )}
            >
              {t('adminPaymentSettingsCard.applePayInitial', {}, { defaultValue: 'A' })}
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t('adminPaymentSettingsCard.applePayName', {}, { defaultValue: 'Apple Pay' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
                {t(
                  'adminPaymentSettingsCard.applePayDescription',
                  {},
                  { defaultValue: 'Native iOS checkout experience' },
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={payment.applePayEnabled}
            onChange={(e) =>
              onChange({ ...payment, applePayEnabled: (e.target as HTMLInputElement).checked })
            }
            size="md"
            color="success"
            data-mol-id="toggle-apple-pay"
            aria-label={t(
              'adminPaymentSettingsCard.applePayName',
              {},
              { defaultValue: 'Apple Pay' },
            )}
          />
        </div>
      </div>
    </section>
  )
}

export default AdminPaymentSettingsCard
export { AdminPaymentSettingsCard }
