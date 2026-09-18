import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
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
          <button
            role="switch"
            aria-checked={payment.stripeEnabled}
            className={cm.cn(
              cm.w(10),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              cm.sp('px', 1),
              'relative',
            )}
            data-mol-id="toggle-stripe"
            style={{
              backgroundColor: payment.stripeEnabled
                ? 'var(--color-in-stock)'
                : 'var(--color-toggle-off)',
            }}
            onClick={() => onChange({ ...payment, stripeEnabled: !payment.stripeEnabled })}
          >
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-surface')}
              style={{ marginLeft: payment.stripeEnabled ? 'auto' : '0' }}
            ></div>
          </button>
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
          <button
            role="switch"
            aria-checked={payment.paypalEnabled}
            className={cm.cn(
              cm.w(10),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              cm.sp('px', 1),
              'relative',
            )}
            data-mol-id="toggle-paypal"
            style={{
              backgroundColor: payment.paypalEnabled
                ? 'var(--color-in-stock)'
                : 'var(--color-toggle-off)',
            }}
            onClick={() => onChange({ ...payment, paypalEnabled: !payment.paypalEnabled })}
          >
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-surface')}
              style={{ marginLeft: payment.paypalEnabled ? 'auto' : '0' }}
            ></div>
          </button>
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
          <button
            role="switch"
            aria-checked={payment.applePayEnabled}
            className={cm.cn(
              cm.w(10),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              cm.sp('px', 1),
              'relative',
            )}
            data-mol-id="toggle-apple-pay"
            style={{
              backgroundColor: payment.applePayEnabled
                ? 'var(--color-in-stock)'
                : 'var(--color-toggle-off)',
            }}
            onClick={() => onChange({ ...payment, applePayEnabled: !payment.applePayEnabled })}
          >
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-surface')}
              style={{ marginLeft: payment.applePayEnabled ? 'auto' : '0' }}
            ></div>
          </button>
        </div>
      </div>
    </section>
  )
}

export default AdminPaymentSettingsCard
export { AdminPaymentSettingsCard }
