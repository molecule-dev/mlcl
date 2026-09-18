import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ActivityRow from './ActivityRow.js'

function DashboardRecentActivity() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(6), 'lg:col-span-8')}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 2))}>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('2xl'),
            'font-manrope tracking-tight',
          )}
        >
          {t('dashboardRecentActivity.sectionTitle', {}, { defaultValue: 'Recent Activity' })}
        </h3>
        <Link
          className={cm.cn(
            'text-primary text-xs font-bold uppercase tracking-widest hover:underline',
          )}
          to="/transactions"
        >
          {t('common.viewAll', {}, { defaultValue: 'View All' })}
        </Link>
      </div>
      <div className={cm.stack(1)}>
        {/* Transaction Row */}
        <Link
          to="/transactions/demo-1"
          className={cm.cn('contents')}
          onClick={(e) => e.stopPropagation()}
        >
          <ActivityRow />
        </Link>
        <Link
          to="/transactions/demo-2"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface/50 hover:bg-surface-container-lowest rounded-2xl transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container overflow-hidden',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-foreground-tertiary')}>
                payments
              </span>
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t(
                  'dashboardRecentActivity.merchantName',
                  {
                    name: t(
                      'dashboardRecentActivity.demo.salaryDeposit',
                      {},
                      { defaultValue: 'Salary Deposit' },
                    ),
                  },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 mt-0.5')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 bg-success-light text-success uppercase tracking-tighter',
                  )}
                >
                  {t(
                    'dashboardRecentActivity.categoryLabel',
                    { category: t('common.category.income', {}, { defaultValue: 'Income' }) },
                    { defaultValue: '{{category}}' },
                  )}
                </span>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-foreground-tertiary')}
                >
                  {t('common.yesterday', {}, { defaultValue: 'Yesterday' })}
                </span>
              </div>
            </div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), cm.textPrimary, 'font-manrope')}>
            {t(
              'dashboardRecentActivity.transactionAmount',
              { amount: '+$4,200.00' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </Link>
        <Link
          to="/transactions/demo-3"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface/50 hover:bg-surface-container-lowest rounded-2xl transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container overflow-hidden',
              )}
            >
              <img
                className={cm.cn(cm.w(8), cm.h(8), 'object-contain')}
                alt=""
                data-alt={t(
                  'dashboardRecentActivity.demo.netflixIconAlt',
                  {},
                  {
                    defaultValue:
                      'simple red letter N on black background for streaming service icon',
                  },
                )}
                src="https://picsum.photos/seed/DashboardRecentActivity-1/1200/800"
              />
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t(
                  'dashboardRecentActivity.merchantName',
                  {
                    name: t(
                      'dashboardRecentActivity.demo.netflix',
                      {},
                      { defaultValue: 'Netflix' },
                    ),
                  },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 mt-0.5')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 bg-surface-secondary text-foreground-secondary uppercase tracking-tighter',
                  )}
                >
                  {t(
                    'dashboardRecentActivity.categoryLabel',
                    {
                      category: t(
                        'common.category.entertainment',
                        {},
                        { defaultValue: 'Entertainment' },
                      ),
                    },
                    { defaultValue: '{{category}}' },
                  )}
                </span>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-foreground-tertiary')}
                >
                  {t(
                    'dashboardRecentActivity.transactionDate',
                    { date: 'Mar 12, 2024' },
                    { defaultValue: '{{date}}' },
                  )}
                </span>
              </div>
            </div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'font-manrope text-on-surface')}>
            {t(
              'dashboardRecentActivity.transactionAmount',
              { amount: '-$15.99' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </Link>
        <Link
          to="/transactions/demo-4"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface/50 hover:bg-surface-container-lowest rounded-2xl transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-foreground-tertiary')}>
                restaurant
              </span>
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t(
                  'dashboardRecentActivity.merchantName',
                  {
                    name: t(
                      'dashboardRecentActivity.demo.blueBottleCoffee',
                      {},
                      { defaultValue: 'Blue Bottle Coffee' },
                    ),
                  },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 mt-0.5')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 bg-surface-secondary text-foreground-secondary uppercase tracking-tighter',
                  )}
                >
                  {t(
                    'dashboardRecentActivity.categoryLabel',
                    {
                      category: t('common.category.diningOut', {}, { defaultValue: 'Dining Out' }),
                    },
                    { defaultValue: '{{category}}' },
                  )}
                </span>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-foreground-tertiary')}
                >
                  {t(
                    'dashboardRecentActivity.transactionDate',
                    { date: 'Mar 11, 2024' },
                    { defaultValue: '{{date}}' },
                  )}
                </span>
              </div>
            </div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'font-manrope text-on-surface')}>
            {t(
              'dashboardRecentActivity.transactionAmount',
              { amount: '-$6.50' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </Link>
        <Link
          to="/transactions/demo-5"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface/50 hover:bg-surface-container-lowest rounded-2xl transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-foreground-tertiary')}>
                commute
              </span>
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t(
                  'dashboardRecentActivity.merchantName',
                  { name: t('dashboardRecentActivity.demo.uber', {}, { defaultValue: 'Uber' }) },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 mt-0.5')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 bg-surface-secondary text-foreground-secondary uppercase tracking-tighter',
                  )}
                >
                  {t(
                    'dashboardRecentActivity.categoryLabel',
                    { category: t('common.category.transport', {}, { defaultValue: 'Transport' }) },
                    { defaultValue: '{{category}}' },
                  )}
                </span>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-foreground-tertiary')}
                >
                  {t(
                    'dashboardRecentActivity.transactionDate',
                    { date: 'Mar 10, 2024' },
                    { defaultValue: '{{date}}' },
                  )}
                </span>
              </div>
            </div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'font-manrope text-on-surface')}>
            {t(
              'dashboardRecentActivity.transactionAmount',
              { amount: '-$22.40' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </Link>
        <Link
          to="/transactions/demo-6"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface/50 hover:bg-surface-container-lowest rounded-2xl transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container overflow-hidden',
              )}
            >
              <img
                className={cm.cn(cm.w(6), cm.h(6), 'object-contain')}
                alt=""
                data-alt={t(
                  'dashboardRecentActivity.demo.amazonIconAlt',
                  {},
                  {
                    defaultValue: 'minimalist white letter A with arrow smile on black background',
                  },
                )}
                src="https://picsum.photos/seed/DashboardRecentActivity-2/1200/800"
              />
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t(
                  'dashboardRecentActivity.merchantName',
                  {
                    name: t('dashboardRecentActivity.demo.amazon', {}, { defaultValue: 'Amazon' }),
                  },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 mt-0.5')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 bg-surface-secondary text-foreground-secondary uppercase tracking-tighter',
                  )}
                >
                  {t(
                    'dashboardRecentActivity.categoryLabel',
                    { category: t('common.category.shopping', {}, { defaultValue: 'Shopping' }) },
                    { defaultValue: '{{category}}' },
                  )}
                </span>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-foreground-tertiary')}
                >
                  {t(
                    'dashboardRecentActivity.transactionDate',
                    { date: 'Mar 09, 2024' },
                    { defaultValue: '{{date}}' },
                  )}
                </span>
              </div>
            </div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'font-manrope text-on-surface')}>
            {t(
              'dashboardRecentActivity.transactionAmount',
              { amount: '-$142.10' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </Link>
        <Link
          to="/transactions/demo-7"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface/50 hover:bg-surface-container-lowest rounded-2xl transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-foreground-tertiary')}>
                home
              </span>
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t(
                  'dashboardRecentActivity.merchantName',
                  {
                    name: t(
                      'dashboardRecentActivity.demo.landlordPayment',
                      {},
                      { defaultValue: 'Landlord Payment' },
                    ),
                  },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 mt-0.5')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 bg-surface-secondary text-foreground-secondary uppercase tracking-tighter',
                  )}
                >
                  {t(
                    'dashboardRecentActivity.categoryLabel',
                    { category: t('common.category.rent', {}, { defaultValue: 'Rent' }) },
                    { defaultValue: '{{category}}' },
                  )}
                </span>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-foreground-tertiary')}
                >
                  {t(
                    'dashboardRecentActivity.transactionDate',
                    { date: 'Mar 01, 2024' },
                    { defaultValue: '{{date}}' },
                  )}
                </span>
              </div>
            </div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'font-manrope text-on-surface')}>
            {t(
              'dashboardRecentActivity.transactionAmount',
              { amount: '-$2,100.00' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </Link>
        <Link
          to="/transactions/demo-8"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface/50 hover:bg-surface-container-lowest rounded-2xl transition-all group',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <div
              className={cm.cn(
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface-container',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-foreground-tertiary')}>
                fitness_center
              </span>
            </div>
            <div>
              <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                {t(
                  'dashboardRecentActivity.merchantName',
                  { name: 'Equinox Gym' },
                  { defaultValue: '{{name}}' },
                )}
              </p>
              <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 mt-0.5')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] py-0.5 bg-surface-secondary text-foreground-secondary uppercase tracking-tighter',
                  )}
                >
                  {t('dashboardRecentActivity.categoryHealth', {}, { defaultValue: 'Health' })}
                </span>
                <span
                  className={cm.cn(cm.fontWeight('medium'), 'text-[10px] text-foreground-tertiary')}
                >
                  {t(
                    'dashboardRecentActivity.transactionDate',
                    { date: 'Feb 28, 2024' },
                    { defaultValue: '{{date}}' },
                  )}
                </span>
              </div>
            </div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'font-manrope text-on-surface')}>
            {t(
              'dashboardRecentActivity.transactionAmount',
              { amount: '-$180.00' },
              { defaultValue: '{{amount}}' },
            )}
          </span>
        </Link>
      </div>
    </div>
  )
}

export default DashboardRecentActivity
export { DashboardRecentActivity }
