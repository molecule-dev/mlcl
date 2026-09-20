import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Read-only team summary card.
 *
 * Honest role summary for a resident account: reporters keep the
 * default resident role; city staff accounts (ADMIN_EMAILS allow-list
 * or the seeded 311 operations desk) see staff powers on the issue
 * workflow. There is no team-management route in this template, so the
 * card summarizes the role instead of linking to a dead page.
 */
function SettingsTeamSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      data-mol-id="settings-team"
      className={cm.cn(
        cm.sp('p', 8),
        'bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-2px_rgba(19,27,46,0.04),0_12px_40px_-8px_rgba(19,27,46,0.08)]',
      )}
    >
      <h3
        className={cm.cn(
          cm.textSize('xl'),
          cm.fontWeight('bold'),
          cm.sp('mb', 8),
          'tracking-tight',
        )}
      >
        {t('settingsTeamSection.title', {}, { defaultValue: 'Team & Permissions' })}
      </h3>
      <div className={cm.cn(cm.sp('p', 6), 'bg-primary-fixed rounded-2xl')}>
        <span
          className={cm.cn(
            cm.sp('mb', 2),
            'text-[10px] font-black text-on-primary-fixed uppercase tracking-widest block',
          )}
        >
          {t('settingsTeamSection.currentRoleLabel', {}, { defaultValue: 'Your Current Role' })}
        </span>
        <h4 className={cm.cn(cm.textSize('2xl'), 'font-black text-on-primary-fixed leading-tight')}>
          {t('settingsTeamSection.roleName', {}, { defaultValue: 'Resident' })}
        </h4>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-primary-fixed/80')}>
          {t(
            'settingsTeamSection.roleDescription',
            {},
            {
              defaultValue:
                'Report issues, confirm your neighbors\u2019 reports, and save watch areas. City staff accounts additionally advance the status workflow and post official response notes.',
            },
          )}
        </p>
      </div>
    </section>
  )
}

export default SettingsTeamSection
export { SettingsTeamSection }
