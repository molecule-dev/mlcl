/**
 * Certificate badge — gold-bordered card with the Lectura wordmark,
 * decorative seal, recipient name + course title, and completion date.
 * Mirrors the printable-certificate look from DESIGN.md.
 *
 * Translated from the abstract certificate visual baked into Landing's
 * Stitch design HTML, refactored as a standalone reusable component.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export type CertificateBadgeProps = {
  recipient: string
  courseTitle: string
  completedAt: string
  certificateId: string
  instructor: string
}

export function CertificateBadge(props: CertificateBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 12),
        'relative bg-surface-container-lowest rounded-[2rem] overflow-hidden border-2 border-[var(--color-lectura-gold)] shadow-[0px_12px_32px_rgba(75,8,201,0.12)] aspect-[1.4]',
      )}
      style={{
        background:
          'linear-gradient(135deg, var(--color-lectura-gold-bg) 0%, var(--color-surface-container-lowest) 60%)',
      }}
      data-mol-id="certificate-badge"
    >
      <div
        className={cm.cn(
          'absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none',
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-lectura-gold) 10%, transparent)',
        }}
      ></div>
      <div
        className={cm.cn(
          'absolute -bottom-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none',
        )}
      ></div>
      <div className={cm.cn('relative z-10 flex flex-col h-full')}>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }))}>
          <span className={cm.cn('text-3xl font-black tracking-tighter text-primary')}>
            {APP_NAME}
          </span>
          <div
            className={cm.cn(
              'w-16 h-16 rounded-full border-4 border-[var(--color-lectura-gold)] flex items-center justify-center bg-surface',
            )}
          >
            <span
              className={cm.cn(
                'material-symbols-outlined text-[var(--color-lectura-gold)] text-[28px]',
              )}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              workspace_premium
            </span>
          </div>
        </div>
        <div className={cm.cn('flex-1 flex flex-col justify-center text-center my-8')}>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
            )}
          >
            {t('certificateBadge.eyebrow', {}, { defaultValue: 'Certificate of completion' })}
          </p>
          <p className={cm.cn('text-sm text-on-surface-variant mb-2')}>
            {t('certificateBadge.presentedTo', {}, { defaultValue: 'Presented to' })}
          </p>
          <h2
            className={cm.cn(
              'text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-4 leading-tight',
            )}
          >
            {props.recipient}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant mb-2')}>
            {t(
              'certificateBadge.forCompleting',
              {},
              { defaultValue: 'for successfully completing' },
            )}
          </p>
          <p className={cm.cn('text-xl md:text-2xl font-bold text-primary tracking-tight')}>
            {props.courseTitle}
          </p>
        </div>
        <div
          className={cm.cn(cm.flex({ justify: 'between', align: 'end' }), 'pt-6 border-t')}
          style={{ borderColor: 'color-mix(in srgb, var(--color-lectura-gold) 30%, transparent)' }}
        >
          <div className={cm.cn('text-left')}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('common.completed', {}, { defaultValue: 'Completed' })}
            </p>
            <p className={cm.cn('text-sm font-bold text-on-surface mt-1')}>{props.completedAt}</p>
          </div>
          <div className={cm.cn('text-center')}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('certificateBadge.instructor', {}, { defaultValue: 'Instructor' })}
            </p>
            <p className={cm.cn('text-sm font-bold text-on-surface mt-1')}>{props.instructor}</p>
          </div>
          <div className={cm.cn('text-right')}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('certificateBadge.id', {}, { defaultValue: 'Certificate ID' })}
            </p>
            <p
              className={cm.cn('text-sm font-bold text-on-surface mt-1')}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {props.certificateId}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CertificateBadge
