import { useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MessageComposerProps {
  value?: string
  onChange?: (v: string) => void
  onSend?: () => void
  sending?: boolean
}
export default function MessageComposer({
  value = '',
  onChange,
  onSend,
  sending = false,
}: MessageComposerProps) {
  const cm = getClassMap()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()
  const [fileNotice, setFileNotice] = useState<string | null>(null)

  const insertFormat = (open: string, close: string = open) => {
    const el = textareaRef.current
    if (!el || !onChange) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const selected = value.substring(start, end)
    const newValue = value.slice(0, start) + open + selected + close + value.slice(end)
    onChange(newValue)
    setTimeout(() => {
      el.focus()
      const cursorPos = start + open.length + selected.length
      el.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  return (
    <>
      {/* Message Input Area */}
      <div className={cm.cn(cm.sp('px', 6), cm.sp('pb', 6))}>
        {fileNotice && (
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 3),
              cm.sp('px', 3),
              cm.sp('py', 2),
              'rounded-md bg-warning-light text-amber-950',
            )}
          >
            {fileNotice}
          </p>
        )}
        <div
          className={cm.cn(
            cm.card(),
            'overflow-hidden transition-all focus-within:border-primary/40 focus-within:shadow-md',
          )}
        >
          {/* Toolbar */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('p', 2),
              'border-b border-border bg-surface-secondary/50',
            )}
          >
            <button
              className={cm.cn(
                'p-1.5 rounded hover:bg-border/70 text-on-surface-variant transition-colors',
              )}
              onClick={() => insertFormat('**')}
              title={t('messageComposer.bold', {}, { defaultValue: 'Bold' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>format_bold</span>
            </button>
            <button
              className={cm.cn(
                'p-1.5 rounded hover:bg-border/70 text-on-surface-variant transition-colors',
              )}
              onClick={() => insertFormat('*')}
              title={t('messageComposer.italic', {}, { defaultValue: 'Italic' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>format_italic</span>
            </button>
            <button
              className={cm.cn(
                'p-1.5 rounded hover:bg-border/70 text-on-surface-variant transition-colors',
              )}
              onClick={() => insertFormat('`')}
              title={t('messageComposer.code', {}, { defaultValue: 'Code' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>code</span>
            </button>
            <div className={cm.cn('w-px', cm.h(4), cm.sp('mx', 1), 'bg-border')}></div>
            <button
              className={cm.cn(
                'p-1.5 rounded hover:bg-border/70 text-on-surface-variant transition-colors',
              )}
              onClick={() =>
                insertFormat(
                  '[',
                  '](' + t('messageComposer.urlPlaceholder', {}, { defaultValue: 'url' }) + ')',
                )
              }
              title={t('messageComposer.link', {}, { defaultValue: 'Link' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>link</span>
            </button>
            <button
              className={cm.cn(
                'p-1.5 rounded hover:bg-border/70 text-on-surface-variant transition-colors',
              )}
              onClick={() => insertFormat(':')}
              title={t('messageComposer.emoji', {}, { defaultValue: 'Emoji' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                sentiment_satisfied
              </span>
            </button>
            <button
              className={cm.cn(
                'p-1.5 rounded hover:bg-border/70 text-on-surface-variant transition-colors',
              )}
              onClick={() => insertFormat('@')}
              title={t('messageComposer.mention', {}, { defaultValue: 'Mention' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                alternate_email
              </span>
            </button>
            <button
              type="button"
              className={cm.cn(
                'ml-auto rounded p-1.5 text-on-surface-variant transition-colors hover:bg-border/70',
              )}
              onClick={() => fileInputRef.current?.click()}
              title={t('messageComposer.attachFile', {}, { defaultValue: 'Attach file' })}
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>attach_file</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className={cm.cn('hidden')}
              onChange={(e) => {
                const files = e.target.files
                if (files?.length) {
                  const names = Array.from(files)
                    .map((f) => f.name)
                    .join(', ')
                  setFileNotice(
                    t(
                      'messageComposer.fileAttachDemo',
                      { count: files.length, names },
                      { defaultValue: 'This demo does not upload files. Selected: {{names}}' },
                    ),
                  )
                  window.setTimeout(() => setFileNotice(null), 5000)
                }
                e.target.value = ''
              }}
            />
          </div>
          {/* Input */}
          <div className={cm.sp('p', 3)}>
            <textarea
              ref={textareaRef}
              className={cm.cn(
                cm.w('full'),
                cm.h(24),
                'border-none focus:ring-0 text-[0.875rem] leading-relaxed resize-none placeholder:text-foreground-tertiary',
              )}
              placeholder={t(
                'messageComposer.placeholder',
                { channel: '#general' },
                { defaultValue: 'Message {{channel}}' },
              )}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !sending) {
                  e.preventDefault()
                  onSend?.()
                }
              }}
            />
          </div>
          {/* Send Button */}
          <div className={cm.cn(cm.flex({ justify: 'end' }), cm.sp('p', 2), cm.sp('pr', 3))}>
            <button
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('p', 2),
                cm.sp('px', 5),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all',
              )}
              onClick={onSend}
              disabled={sending}
            >
              <span>
                {sending
                  ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                  : t('common.send', {}, { defaultValue: 'Send' })}
              </span>
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>send</span>
            </button>
          </div>
        </div>
        <p
          className={cm.cn(
            cm.textCenter,
            cm.sp('mt', 3),
            cm.fontWeight('medium'),
            'text-[10px] text-on-surface-variant tracking-tight',
          )}
        >
          <span className={cm.fontWeight('bold')}>
            {t('common.keyboard.return', {}, { defaultValue: 'Return' })}
          </span>
          to send •
          <span className={cm.fontWeight('bold')}>
            {t('common.keyboard.shiftReturn', {}, { defaultValue: 'Shift + Return' })}
          </span>
          for new line
        </p>
      </div>
    </>
  )
}
export { MessageComposer }
