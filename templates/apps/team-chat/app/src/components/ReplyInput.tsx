import React, { useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ReplyInputProps {
  value?: string
  onChange?: (v: string) => void
  onSend?: () => void
  sending?: boolean
  disabled?: boolean
}

export function ReplyInput({ value = '', onChange, onSend, sending, disabled }: ReplyInputProps) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertMarkdown = (before: string, after: string = '') => {
    const el = textareaRef.current
    if (!el || !onChange) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.substring(start, end)
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end)
    onChange(newValue)
    requestAnimationFrame(() => {
      el.focus()
      const cursorPos = selected
        ? start + before.length + selected.length + after.length
        : start + before.length
      el.setSelectionRange(cursorPos, cursorPos)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend?.()
    }
  }
  return (
    <footer className={cm.cn(cm.sp('px', 12), cm.sp('pb', 10), cm.sp('pt', 4), 'bg-surface')}>
      <div className={cm.cn(cm.mxAuto, 'max-w-4xl')}>
        <div
          className={cm.cn(
            'bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl shadow-primary/5 focus-within:ring-2 focus-within:ring-primary/20 transition-all',
          )}
        >
          <div className={cm.sp('p', 4)}>
            <textarea
              data-mol-id="thread-reply-input"
              ref={textareaRef}
              className={cm.cn(
                cm.w('full'),
                cm.h(24),
                'bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/60 resize-none no-scrollbar',
              )}
              placeholder={t('replyInput.prompt', {}, { defaultValue: 'Reply in thread...' })}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'border-t border-outline-variant/10',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 1 })}>
              <button
                onClick={() => insertMarkdown('**', '**')}
                className={cm.cn(
                  'p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  data-icon="format_bold"
                >
                  format_bold
                </span>
              </button>
              <button
                onClick={() => insertMarkdown('*', '*')}
                className={cm.cn(
                  'p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  data-icon="format_italic"
                >
                  format_italic
                </span>
              </button>
              <button
                onClick={() => insertMarkdown('`', '`')}
                className={cm.cn(
                  'p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  data-icon="code"
                >
                  code
                </span>
              </button>
              <button
                onClick={() =>
                  insertMarkdown(
                    '[',
                    `](${t('replyInput.linkPlaceholder', {}, { defaultValue: 'url' })})`,
                  )
                }
                className={cm.cn(
                  'p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  data-icon="link"
                >
                  link
                </span>
              </button>
              <div className={cm.cn(cm.h(4), cm.sp('mx', 1), 'w-px bg-outline-variant/30')}></div>
              <button
                onClick={() => insertMarkdown(':')}
                className={cm.cn(
                  'p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  data-icon="sentiment_satisfied"
                >
                  sentiment_satisfied
                </span>
              </button>
              <button
                onClick={() => insertMarkdown('@')}
                className={cm.cn(
                  'p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors',
                )}
              >
                <span
                  className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
                  data-icon="alternate_email"
                >
                  alternate_email
                </span>
              </button>
            </div>
            <button
              data-mol-id="thread-reply-send"
              onClick={onSend}
              disabled={sending || disabled}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 4),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'bg-gradient-to-br from-primary to-primary-container text-on-primary py-1.5 rounded-lg shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <span>{t('common.send', {}, { defaultValue: 'Send' })}</span>
              <span
                className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                data-icon="send"
              >
                send
              </span>
            </button>
          </div>
        </div>
        <div className={cm.cn(cm.sp('mt', 3), cm.flex({ justify: 'center' }))}>
          <p
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'label-sm text-on-surface-variant/40 gap-1.5',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 1),
                'border border-current rounded scale-75',
              )}
            >
              {t('common.keyEnter', {}, { defaultValue: 'Enter' })}
            </span>{' '}
            {t('replyInput.sendHint', {}, { defaultValue: 'to send,' })}{' '}
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('px', 1),
                'border border-current rounded scale-75',
              )}
            >
              {t('common.keyShiftEnter', {}, { defaultValue: 'Shift + Enter' })}
            </span>{' '}
            {t('replyInput.newLineHint', {}, { defaultValue: 'for new line' })}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default ReplyInput
