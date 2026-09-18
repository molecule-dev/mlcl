import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BotDeployShareLinkCardProps {
  shareUrl?: string
  botId?: string
}

function BotDeployShareLinkCard({ shareUrl, botId }: BotDeployShareLinkCardProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [urlCopied, setUrlCopied] = useState(false)
  const [passwordProtect, setPasswordProtect] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const url =
    shareUrl ??
    (botId ? `${origin}/test-chat?bot=${encodeURIComponent(botId)}` : `${origin}/test-chat`)

  function handleCopyUrl() {
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    })
  }

  function handleDownloadQr(format: 'png' | 'svg') {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#ffffff"/>
  <text x="128" y="128" font-family="monospace" font-size="14" text-anchor="middle">${url}</text>
</svg>`
    if (format === 'svg') {
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      triggerDownload(blob, 'bot-share-qr.svg')
      return
    }
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, 'bot-share-qr.png')
      }, 'image/png')
    }
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }

  function triggerDownload(blob: Blob, filename: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <>
      {/* Section 2: Share Link */}
      <section
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('p', 8),
          cm.h('full'),
          'bg-surface-container-lowest rounded-[2rem] ambient-shadow',
        )}
      >
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 10))}>
          <div>
            <h2
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'font-headline',
              )}
            >
              {t('botDeployShareLinkCard.title', {}, { defaultValue: 'Share Link' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant/60')}>
              {t(
                'botDeployShareLinkCard.subtitle',
                {},
                { defaultValue: "Direct URL to your bot's dedicated page." },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(12),
              cm.h(12),
              cm.textPrimary,
              'bg-surface-container-high rounded-2xl',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              link
            </span>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'center', align: 'center' }),
            cm.flex1,
            cm.sp('mb', 8),
            'gap-8',
          )}
        >
          <button
            type="button"
            data-mol-id="qr-download-quick"
            aria-label={t(
              'botDeployShareLinkCard.qrDownloadAria',
              {},
              { defaultValue: 'Download share QR code' },
            )}
            className={cm.cn(
              cm.sp('p', 6),
              cm.cursorPointer,
              'bg-surface-container-high rounded-[2.5rem] relative group',
            )}
            onClick={() => handleDownloadQr('png')}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.sp('p', 4),
                cm.w(48),
                cm.h(48),
                'bg-surface rounded-[2rem] shadow-sm',
              )}
            >
              {/* Mock QR Code */}
              <div
                className={cm.cn(
                  cm.grid({ cols: 8, gap: 1 }),
                  cm.w('full'),
                  cm.h('full'),
                  'grid-rows-8 opacity-80 group-hover:opacity-100 transition-opacity',
                )}
                aria-hidden="true"
              >
                {Array.from({ length: 64 }).map((_, i) => {
                  const row = Math.floor(i / 8)
                  const col = i % 8
                  const inFinder =
                    (row < 3 && col < 3) || (row < 3 && col > 4) || (row > 4 && col < 3)
                  const finderFilled =
                    inFinder &&
                    (row === 0 ||
                      row === 2 ||
                      col === 0 ||
                      col === 2 ||
                      row === 7 ||
                      col === 7 ||
                      (row === 1 && col === 1) ||
                      (row === 6 && col === 1) ||
                      (row === 1 && col === 6))
                  const filled = inFinder ? finderFilled : (row * 13 + col * 7 + 3) % 5 < 2
                  return (
                    <div
                      key={i}
                      className={filled ? 'bg-on-surface rounded-[1px]' : 'bg-transparent'}
                    />
                  )
                })}
              </div>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(12),
                cm.h(12),
                cm.roundedFull,
                'absolute -top-3 -right-3 bg-tertiary text-white shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform',
              )}
            >
              <span className={cm.cn('material-symbols-outlined')}>qr_code_2</span>
            </div>
          </button>
          <div className={cm.textCenter}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-on-surface-variant/50 uppercase tracking-widest',
              )}
            >
              {t(
                'botDeployShareLinkCard.downloadQrLabel',
                {},
                { defaultValue: 'Download QR for print' },
              )}
            </p>
            <div className={cm.cn(cm.flex(), 'gap-4')}>
              <button
                type="button"
                data-mol-id="qr-download-png"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.textPrimary,
                  'hover:underline',
                )}
                onClick={() => handleDownloadQr('png')}
              >
                PNG
              </button>
              <button
                type="button"
                data-mol-id="qr-download-svg"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.textPrimary,
                  'hover:underline',
                )}
                onClick={() => handleDownloadQr('svg')}
              >
                SVG
              </button>
            </div>
          </div>
        </div>
        <div className={cm.stack(6)}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('p', 4),
              'gap-3 bg-surface-container-high rounded-2xl',
            )}
          >
            <span
              data-mol-id="bot-share-url"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.flex1,
                'text-on-surface truncate',
              )}
            >
              {url}
            </span>
            <button
              type="button"
              data-mol-id="bot-share-copy"
              aria-label={t(
                'botDeployShareLinkCard.copyAria',
                {},
                { defaultValue: 'Copy share URL' },
              )}
              className={cm.cn(
                cm.sp('p', 2),
                cm.textPrimary,
                'bg-surface rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm',
              )}
              onClick={handleCopyUrl}
            >
              <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                {urlCopied ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('p', 4),
              'bg-surface-container-high rounded-2xl',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
              <span className={cm.cn('material-symbols-outlined text-on-surface-variant/60')}>
                lock
              </span>
              <div>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-on-surface leading-none',
                  )}
                >
                  {t(
                    'botDeployShareLinkCard.passwordProtectLabel',
                    {},
                    { defaultValue: 'Password Protect' },
                  )}
                </p>
                <p
                  className={cm.cn(
                    cm.sp('mt', 1),
                    'text-[10px] text-on-surface-variant/60 uppercase tracking-tight',
                  )}
                >
                  {t(
                    'botDeployShareLinkCard.passwordProtectHint',
                    {},
                    { defaultValue: 'Require access key to chat' },
                  )}
                </p>
              </div>
            </div>
            <button
              className={cm.cn(
                cm.w(12),
                cm.h(6),
                cm.roundedFull,
                cm.sp('p', 1),
                'relative transition-colors',
                passwordProtect ? 'bg-tertiary' : 'bg-surface-container-highest',
              )}
              onClick={() => setPasswordProtect((p) => !p)}
              aria-pressed={passwordProtect}
            >
              <div
                className={cm.cn(
                  cm.w(4),
                  cm.h(4),
                  cm.roundedFull,
                  'bg-surface shadow-sm transition-transform',
                  passwordProtect ? 'ml-auto' : '',
                )}
              ></div>
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
export default BotDeployShareLinkCard
export { BotDeployShareLinkCard }
