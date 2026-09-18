import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * JSON payload viewer — copies DESIGN.md "Payload Viewer" rules:
 * - 8px radius, code-block surface, border, 16px padding
 * - mono 13px / 1.6 line-height
 * - syntax highlighting: keys slate-400, strings emerald, numbers
 *   indigo, booleans amber, null slate-500
 * - top-right ghost "Copy" button
 *
 * Renders any JSON-compatible value. Intentionally regex-light so it
 * stays dependency-free and fast on small payloads (typical webhook
 * bodies are <2KB). For large payloads the viewer truncates the source
 * to MAX_LINES with a "+N more" notice.
 */

interface PayloadViewerProps {
  value: unknown
  /** Header label rendered as an uppercase mono eyebrow above the body. */
  eyebrow?: string
  /** Right-side header chip (e.g. content-type "application/json"). */
  contentType?: string
  /** Limit visible lines for very large payloads. */
  maxLines?: number
  /** Disable the copy button (read-only contexts where the surrounding
   *  layout already provides a copy action). */
  hideCopy?: boolean
}

const MAX_LINES_DEFAULT = 200

const KEY_COLOR = 'var(--mol-color-text-secondary)'
const STRING_COLOR = 'var(--mol-color-success)'
const NUMBER_COLOR = 'var(--mol-color-secondary)'
const BOOL_COLOR = 'var(--mol-color-warning)'
const NULL_COLOR = 'var(--mol-color-text-tertiary)'
const PUNCT_COLOR = 'var(--mol-color-text-tertiary)'

interface Token {
  text: string
  color: string
}

function tokenize(value: unknown, indent = 0, isKeyContext = false): Token[] {
  const out: Token[] = []
  const pad = '  '.repeat(indent)
  if (value === null) {
    out.push({ text: 'null', color: NULL_COLOR })
    return out
  }
  if (typeof value === 'boolean') {
    out.push({ text: String(value), color: BOOL_COLOR })
    return out
  }
  if (typeof value === 'number') {
    out.push({ text: String(value), color: NUMBER_COLOR })
    return out
  }
  if (typeof value === 'string') {
    out.push({
      text: JSON.stringify(value),
      color: isKeyContext ? KEY_COLOR : STRING_COLOR,
    })
    return out
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push({ text: '[]', color: PUNCT_COLOR })
      return out
    }
    out.push({ text: '[\n', color: PUNCT_COLOR })
    value.forEach((item, i) => {
      out.push({ text: pad + '  ', color: PUNCT_COLOR })
      out.push(...tokenize(item, indent + 1))
      out.push({
        text: i === value.length - 1 ? '\n' : ',\n',
        color: PUNCT_COLOR,
      })
    })
    out.push({ text: pad + ']', color: PUNCT_COLOR })
    return out
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      out.push({ text: '{}', color: PUNCT_COLOR })
      return out
    }
    out.push({ text: '{\n', color: PUNCT_COLOR })
    entries.forEach(([k, v], i) => {
      out.push({ text: pad + '  ', color: PUNCT_COLOR })
      out.push({ text: JSON.stringify(k), color: KEY_COLOR })
      out.push({ text: ': ', color: PUNCT_COLOR })
      out.push(...tokenize(v, indent + 1))
      out.push({
        text: i === entries.length - 1 ? '\n' : ',\n',
        color: PUNCT_COLOR,
      })
    })
    out.push({ text: pad + '}', color: PUNCT_COLOR })
    return out
  }
  out.push({ text: String(value), color: 'var(--mol-color-text)' })
  return out
}

export function PayloadViewer({
  value,
  eyebrow,
  contentType,
  maxLines = MAX_LINES_DEFAULT,
  hideCopy = false,
}: PayloadViewerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const tokens = tokenize(value, 0)
  const fullText = tokens.map((tok) => tok.text).join('')
  const lines = fullText.split('\n')
  const truncated = lines.length > maxLines
  const visibleText = truncated ? lines.slice(0, maxLines).join('\n') : fullText

  const handleCopy = async () => {
    try {
      const stringified = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      await navigator.clipboard.writeText(stringified)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch (_error) {
      /* clipboard not available — silent noop, no fallback needed */
    }
  }

  return (
    <div
      className={cm.cn('rounded-xl overflow-hidden')}
      style={{
        backgroundColor: 'var(--mol-color-background)',
        border: '1px solid var(--mol-color-border)',
      }}
      data-mol-id="payload-viewer"
    >
      <div
        className={cm.cn('flex items-center justify-between px-4 py-2.5')}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--mol-color-background) 60%, transparent)',
          borderBottom: '1px solid var(--mol-color-border)',
        }}
      >
        <span
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {eyebrow ?? t('payloadViewer.payload', {}, { defaultValue: '// payload' })}
        </span>
        <div className={cm.cn('flex items-center gap-3')}>
          {contentType ? (
            <span
              className={cm.cn('font-mono text-[10px]')}
              style={{ color: 'var(--mol-color-text-tertiary)' }}
            >
              {contentType}
            </span>
          ) : null}
          {!hideCopy ? (
            <button
              type="button"
              onClick={handleCopy}
              className={cm.cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase tracking-widest transition-colors hover:opacity-90',
              )}
              style={{
                backgroundColor: copied
                  ? 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)'
                  : 'color-mix(in srgb, var(--mol-color-secondary) 10%, transparent)',
                color: copied ? 'var(--mol-color-success)' : 'var(--mol-color-secondary)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied
                ? t('common.copied', {}, { defaultValue: 'Copied' })
                : t('common.copy', {}, { defaultValue: 'Copy' })}
            </button>
          ) : null}
        </div>
      </div>
      <pre
        className={cm.cn('m-0 p-4 overflow-x-auto font-mono text-[13px]')}
        style={{ color: 'var(--mol-color-text)', lineHeight: 1.6 }}
      >
        {tokens
          .reduce<{ rendered: string; out: Token[] }>(
            (acc, tok) => {
              if (truncated) {
                const newRendered = acc.rendered + tok.text
                if (newRendered.split('\n').length <= maxLines) {
                  acc.out.push(tok)
                  acc.rendered = newRendered
                }
              } else {
                acc.out.push(tok)
              }
              return acc
            },
            { rendered: '', out: [] },
          )
          .out.map((tok, i) => (
            <span key={i} style={{ color: tok.color }}>
              {tok.text}
            </span>
          ))}
        {truncated ? (
          <span
            className={cm.cn('block mt-2 text-[11px] italic')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
          >
            {t(
              'payloadViewer.truncated',
              { lines: lines.length - maxLines },
              { defaultValue: '… {{lines}} more lines truncated' },
            )}
          </span>
        ) : null}
      </pre>
      <div className={cm.cn('sr-only')}>{visibleText}</div>
    </div>
  )
}
