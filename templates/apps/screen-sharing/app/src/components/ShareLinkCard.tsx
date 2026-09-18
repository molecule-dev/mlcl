/**
 * Editorial share-link card — mono URL field with copy-to-clipboard + access
 * controls + expiry chip. Per DESIGN.md "Share Link Card": rounded-xl border,
 * mono URL, accent copy button.
 *
 * Translated from team-chat's FileCard pattern (icon tile + meta + action
 * button) but recolored cyan for the cross-cutting "share/distribute" cue.
 */
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ShareLinkCardProps {
  url: string
  visibility: 'public' | 'team' | 'private'
  expiresAt?: string | null
  passwordProtected?: boolean
  onChangeVisibility?: (next: 'public' | 'team' | 'private') => void
}

const visibilityCopy: Record<string, { title: string; subtitle: string; icon: string }> = {
  public: {
    title: 'Anyone with the link',
    subtitle: 'Public — no sign-in required',
    icon: 'public',
  },
  team: { title: 'Workspace members', subtitle: 'Restricted — must sign in', icon: 'group' },
  private: { title: 'Only you', subtitle: 'Private — no shareable link', icon: 'lock' },
}

export function ShareLinkCard({
  url,
  visibility,
  expiresAt,
  passwordProtected,
  onChangeVisibility,
}: ShareLinkCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const meta = visibilityCopy[visibility] ?? visibilityCopy.private

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (_error) {
      // clipboard write failure is recoverable — UI already shows unchecked state
      setCopied(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.stack(4),
        'rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            'rounded-xl bg-cyan-50 text-cyan-600',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-xl')}>{meta.icon}</span>
        </div>
        <div className={cm.flex1}>
          <div className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}>
            {t(`shareLink.title.${visibility}`, {}, { defaultValue: meta.title })}
          </div>
          <div
            className={cm.cn(
              'text-[11px] uppercase tracking-widest text-on-surface-variant font-semibold',
            )}
          >
            {t(`shareLink.subtitle.${visibility}`, {}, { defaultValue: meta.subtitle })}
          </div>
        </div>
        {onChangeVisibility && (
          <select
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.sp('px', 3),
              cm.sp('py', 1),
              'rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface',
            )}
            value={visibility}
            onChange={(e) =>
              onChangeVisibility(e.currentTarget.value as 'public' | 'team' | 'private')
            }
          >
            <option value="public">
              {t('shareLink.option.public', {}, { defaultValue: 'Public' })}
            </option>
            <option value="team">{t('nav.workspace', {}, { defaultValue: 'Workspace' })}</option>
            <option value="private">
              {t('shareLink.option.private', {}, { defaultValue: 'Private' })}
            </option>
          </select>
        )}
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 2 }),
          cm.sp('p', 2),
          'rounded-xl border border-outline-variant bg-surface-container/40',
        )}
      >
        <code
          className={cm.cn(
            cm.flex1,
            cm.textSize('xs'),
            cm.sp('px', 2),
            'truncate font-mono text-on-surface-variant',
          )}
        >
          {url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            cm.sp('px', 3),
            cm.sp('py', 2),
            'rounded-lg bg-gradient-to-r from-[var(--color-brand-gradient-from)] to-[var(--color-brand-gradient-to)] text-white shadow-sm hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied
            ? t('common.copied', {}, { defaultValue: 'Copied' })
            : t('shareLink.copy', {}, { defaultValue: 'Copy link' })}
        </button>
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 4 }),
          cm.textSize('xs'),
          'text-on-surface-variant',
        )}
      >
        <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
          <span className={cm.cn('material-symbols-outlined text-[14px]')}>schedule</span>
          {expiresAt
            ? t(
                'shareLink.expiresAt',
                { date: new Date(expiresAt).toLocaleDateString() },
                { defaultValue: 'Expires {{date}}' },
              )
            : t('shareLink.noExpiry', {}, { defaultValue: 'Never expires' })}
        </span>
        <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
          <span className={cm.cn('material-symbols-outlined text-[14px]')}>
            {passwordProtected ? 'key' : 'lock_open'}
          </span>
          {passwordProtected
            ? t('shareLink.passwordOn', {}, { defaultValue: 'Password protected' })
            : t('shareLink.passwordOff', {}, { defaultValue: 'No password' })}
        </span>
      </div>
    </div>
  )
}
