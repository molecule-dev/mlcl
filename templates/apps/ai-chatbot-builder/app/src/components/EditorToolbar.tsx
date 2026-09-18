import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface EditorToolbarProps {
  botName: string
  version: string
  onTest: () => void
  onDeploy: () => void
}

export default function EditorToolbar({ botName, version, onTest, onDeploy }: EditorToolbarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <header
      data-mol-id="editor-toolbar"
      className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
      style={{
        position: 'fixed',
        inset: 'calc(60 * 0.25rem)',
        height: 'calc(16 * 0.25rem)',
        backgroundColor: 'rgba(${tailwindScaleToRgb($1,$2)}, ${3/100})',
        backdropFilter: 'blur(var(--blur-xl, 12px))',
        paddingLeft: 'calc(8 * 0.25rem)',
        paddingRight: 'calc(8 * 0.25rem)',
        width: '100%',
        borderTopWidth: '1px',
        borderColor: 'var(--color-panel-border-faint)',
        zIndex: '40',
        fontFamily: "'Inter', sans-serif",
        fontSize: '${textSizeToRem($1)}',
        lineHeight: '${textSizeToLineHeight($1)}',
        letterSpacing: "${1 === 'wider' ? '0.05em' : '0.025em'}",
      }}
    >
      <div
        data-mol-id="editor-toolbar-title"
        className={cm.flex({ align: 'center' })}
        style={{ gap: 'calc(4 * 0.25rem)' }}
      >
        <h1
          className={cm.fontWeight('bold')}
          style={{
            color: 'var(--md-sys-color-on-surface)',
            fontSize: '${textSizeToRem($1)}',
            lineHeight: '${textSizeToLineHeight($1)}',
          }}
        >
          {botName}
        </h1>
        <span
          style={{
            paddingLeft: 'calc(2 * 0.25rem)',
            paddingRight: 'calc(2 * 0.25rem)',
            padding: 'calc(0.5 * 0.25rem)',
            backgroundColor: 'var(--md-sys-color-surface-container-highest)',
            color: 'var(--md-sys-color-on-surface-variant)',
            borderRadius: '0.25rem',
            fontSize: '10px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            letterSpacing: "${1 === 'tighter' ? '-0.05em' : '-0.025em'}",
          }}
        >
          {version}
        </span>
      </div>
      <div
        data-mol-id="editor-toolbar-actions"
        className={cm.flex({ align: 'center' })}
        style={{ gap: 'calc(6 * 0.25rem)' }}
      >
        <div
          data-mol-id="editor-toolbar-primary-actions"
          className={cm.flex({ align: 'center' })}
          style={{ gap: 'calc(4 * 0.25rem)' }}
        >
          <button
            data-mol-id="editor-toolbar-test"
            onClick={onTest}
            className={cm.cn(
              cm.flex({ align: 'center' }),
              'dark:text-outline-variant hover:text-indigo-300 dark:hover:text-[var(--mol-color-primary-light)]',
            )}
            style={{
              color: '${tailwindScaleToHex($1,$2)}',
              transitionProperty: 'all',
              transitionDuration: '150ms',
              gap: 'calc(2 * 0.25rem)',
            }}
          >
            <span
              style={{
                fontFamily: 'Material Symbols outlined',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
              }}
              data-icon="play_circle"
            >
              play_circle
            </span>
            {t('editor-toolbar.test', {}, { defaultValue: 'Test' })}
          </button>
          <button
            data-mol-id="editor-toolbar-deploy"
            onClick={onDeploy}
            className={cm.cn(cm.fontWeight('semibold'), 'hover:opacity-90 active:opacity-80')}
            style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              paddingLeft: 'calc(5 * 0.25rem)',
              paddingRight: 'calc(5 * 0.25rem)',
              padding: 'calc(1.5 * 0.25rem)',
              borderRadius: '0.5rem',
              color: 'var(--md-sys-color-on-primary)',
              transitionProperty: 'all',
              transitionDuration: '150ms',
            }}
          >
            {t('editor-toolbar.deploy', {}, { defaultValue: 'Deploy' })}
          </button>
        </div>
        <div
          className={cm.sp('mx', 2)}
          style={{
            height: 'calc(4 * 0.25rem)',
            width: '1px',
            backgroundColor: 'color-mix(in srgb, var(--md-sys-color-white) 10%, transparent)',
          }}
        ></div>
        <div
          data-mol-id="editor-toolbar-secondary-actions"
          className={cm.cn(cm.flex({ align: 'center' }), 'dark:text-outline-variant')}
          style={{ gap: 'calc(4 * 0.25rem)', color: '${tailwindScaleToHex($1,$2)}' }}
        >
          <span
            className={cm.cn(cm.cursorPointer, 'hover:text-indigo-300')}
            style={{
              fontFamily: 'Material Symbols outlined',
              transitionProperty:
                'color, background-color, border-color, text-decoration-color, fill, stroke',
              transitionDuration: '150ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            data-icon="dark_mode"
          >
            dark_mode
          </span>
          <span
            className={cm.cn(cm.cursorPointer, 'hover:text-indigo-300')}
            style={{
              fontFamily: 'Material Symbols outlined',
              transitionProperty:
                'color, background-color, border-color, text-decoration-color, fill, stroke',
              transitionDuration: '150ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            data-icon="settings"
          >
            settings
          </span>
        </div>
      </div>
    </header>
  )
}

export { EditorToolbar }
