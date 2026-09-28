import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, CITY_NAME } from '../branding.js'

/**
 * Municipal footer (Stitch design): branding + department address, hotline and
 * operator-hours chips, a links row, and the emergency-services legal line.
 * Shared by every signed-out page.
 */
export function Footer() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const links = [
    {
      to: '/about',
      label: t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' }),
    },
    { to: '/explore', label: t('footer.map', {}, { defaultValue: 'Live City Map' }) },
    { to: '/pricing', label: t('footer.pricing', {}, { defaultValue: 'Departments & Plans' }) },
    {
      to: '/privacy',
      label: t('footer.privacy', {}, { defaultValue: 'Privacy & Public Records' }),
    },
    { to: '/terms', label: t('footer.terms', {}, { defaultValue: 'Terms of Service' }) },
  ]

  return (
    <footer
      data-mol-id="public-footer"
      className={cm.cn('bg-surface-container border-t border-outline-variant w-full mt-12')}
    >
      <div className={cm.cn('w-full max-w-7xl mx-auto px-8 py-12 flex flex-col gap-8')}>
        {/* Top tier — branding + hotlines */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            'md:flex-row items-start md:items-center gap-6 pb-6 border-b border-outline-variant/50',
          )}
        >
          <div>
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {APP_NAME} {CITY_NAME} 311
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-secondary mt-1')}>
              {t(
                'footer.address',
                { city: CITY_NAME },
                {
                  defaultValue:
                    'Department of Citizen Services & Urban Operations • City Hall, 100 Civic Plaza, {{city}}',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'flex-wrap gap-6')}>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
              <span
                className={cm.cn('material-symbols-outlined text-primary', 'text-[20px]')}
                aria-hidden
              >
                phone_in_talk
              </span>
              <div>
                <div
                  className={cm.cn('font-mono text-secondary uppercase tracking-wider')}
                  style={{ fontSize: '11px' }}
                >
                  {t('footer.hotlineLabel', {}, { defaultValue: 'Direct Municipal Hotline' })}
                </div>
                <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                  311{' '}
                  <span className={cm.cn(cm.fontWeight('normal'), 'text-secondary')}>
                    {t('footer.hotlineNumber', {}, { defaultValue: 'or 555-RIV-3110' })}
                  </span>
                </div>
              </div>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
              <span
                className={cm.cn('material-symbols-outlined text-primary', 'text-[20px]')}
                aria-hidden
              >
                schedule
              </span>
              <div>
                <div
                  className={cm.cn('font-mono text-secondary uppercase tracking-wider')}
                  style={{ fontSize: '11px' }}
                >
                  {t('footer.hoursLabel', {}, { defaultValue: 'Operator Hours' })}
                </div>
                <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
                  {t('footer.hours', {}, { defaultValue: 'Mon–Fri: 7 AM – 9 PM' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mid tier — links */}
        <div className={cm.cn(cm.flex({ align: 'center' }), 'flex-wrap gap-x-6 gap-y-3')}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cm.cn(
                cm.textSize('sm'),
                'text-secondary underline hover:text-primary transition-colors',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Bottom tier — legal */}
        <div className={cm.cn(cm.textSize('sm'), 'text-secondary pt-2')}>
          <p>
            {t(
              'footer.legal',
              { appName: APP_NAME, city: CITY_NAME, year: new Date().getFullYear() },
              {
                defaultValue:
                  '© {{year}} City of {{city}} Municipal Government. All rights reserved. {{appName}} 311 is an official public accountability system. For immediate life safety threats or emergencies, call 911 immediately.',
              },
            )}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
