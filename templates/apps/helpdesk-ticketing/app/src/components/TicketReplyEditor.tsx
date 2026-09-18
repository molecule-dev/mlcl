import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TicketReplyEditorProps {
  replyBody: string
  setReplyBody: (v: string) => void
  isInternal: boolean
  setIsInternal: (v: boolean) => void
  submitting: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

function TicketReplyEditor({
  replyBody,
  setReplyBody,
  isInternal,
  setIsInternal,
  submitting,
  onSubmit,
}: TicketReplyEditorProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cannedOpen, setCannedOpen] = useState(false)
  const cannedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cannedOpen) return
    function handleOutside(e: MouseEvent) {
      if (cannedRef.current && !cannedRef.current.contains(e.target as Node)) {
        setCannedOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [cannedOpen])

  function applyFormat(prefix: string, suffix: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = replyBody.slice(start, end)
    const next = replyBody.slice(0, start) + prefix + selected + suffix + replyBody.slice(end)
    setReplyBody(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + prefix.length, end + prefix.length)
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cm.cn(
        'bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden border border-outline-variant/10',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'border-b border-surface-container-high',
        )}
      >
        <div className={cm.cn(cm.flex(), 'gap-2')}>
          <button
            type="button"
            className={cm.cn(
              cm.sp('p', 2),
              'hover:bg-surface-container text-outline transition-all',
            )}
            data-mol-id="editor-bold"
            onClick={() => applyFormat('**', '**')}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="format_bold">
              format_bold
            </span>
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('p', 2),
              'hover:bg-surface-container text-outline transition-all',
            )}
            data-mol-id="editor-italic"
            onClick={() => applyFormat('*', '*')}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="format_italic">
              format_italic
            </span>
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('p', 2),
              'hover:bg-surface-container text-outline transition-all',
            )}
            data-mol-id="editor-link"
            onClick={() => applyFormat('[', '](url)')}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="link">
              link
            </span>
          </button>
          <div
            className={cm.cn(cm.sp('mx', 1), 'w-[1px] h-6 bg-surface-container-high self-center')}
          ></div>
          <div className={cm.cn('relative inline-block')} ref={cannedRef}>
            <button
              type="button"
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'gap-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-all',
              )}
              data-mol-id="dropdown-canned"
              onClick={() => setCannedOpen((o) => !o)}
            >
              {t('ticketReplyEditor.cannedResponses', {}, { defaultValue: 'Canned responses' })}
              <span
                className={cm.cn('material-symbols-outlined text-[16px]')}
                data-icon="keyboard_arrow_down"
              >
                keyboard_arrow_down
              </span>
            </button>
            {cannedOpen && (
              <div
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.sp('py', 1),
                  'absolute top-full left-0 w-56 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/20 z-10',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('xs'),
                    'text-outline',
                  )}
                >
                  {t('ticketReplyEditor.cannedEmpty', {}, { defaultValue: 'No templates yet' })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
          <label className={cm.cn(cm.flex({ align: 'center' }), cm.cursorPointer, 'gap-2 group')}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'text-outline group-hover:text-tertiary transition-colors',
              )}
            >
              {t('ticketReplyEditor.internalNote', {}, { defaultValue: 'Internal note' })}
            </span>
            <div className={cm.cn('relative inline-flex items-center')}>
              <input
                className={cm.cn('sr-only peer')}
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              <div
                className={cm.cn(
                  cm.w(8),
                  cm.h(4),
                  'bg-surface-container-highest rounded-full peer peer-checked:bg-tertiary transition-all',
                )}
              ></div>
              <div
                className={cm.cn(
                  cm.w(3),
                  cm.h(3),
                  'absolute left-0.5 bg-surface rounded-full peer-checked:translate-x-4 transition-all',
                )}
              ></div>
            </div>
          </label>
        </div>
      </div>
      <textarea
        className={cm.cn(
          cm.sp('p', 6),
          cm.textSize('sm'),
          'w-full bg-transparent border-none focus:ring-0 min-h-[160px] resize-none text-on-surface-variant placeholder:text-outline/50',
        )}
        data-mol-id="reply-textarea"
        ref={textareaRef}
        placeholder={t(
          'ticketReplyEditor.replyPlaceholder',
          {},
          { defaultValue: 'Type your reply here...' },
        )}
        value={replyBody}
        onChange={(e) => setReplyBody(e.target.value)}
      ></textarea>
      <div
        className={cm.cn(
          cm.flex({ justify: 'end' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'bg-surface-container-low/30',
        )}
      >
        <button
          type="submit"
          className={cm.cn(
            cm.sp('px', 6),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center' }),
            'py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:shadow-lg active:scale-95 transition-all gap-2 disabled:opacity-50',
          )}
          data-mol-id="btn-send"
          disabled={submitting}
        >
          {submitting
            ? t('common.sending', {}, { defaultValue: 'Sending...' })
            : t('ticketReplyEditor.sendReply', {}, { defaultValue: 'Send Reply' })}

          <span className={cm.cn('material-symbols-outlined text-[18px]')} data-icon="send">
            send
          </span>
        </button>
      </div>
    </form>
  )
}

export default TicketReplyEditor
export { TicketReplyEditor }
