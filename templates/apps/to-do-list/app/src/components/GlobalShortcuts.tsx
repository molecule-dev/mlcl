import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

/**
 * Wires the keyboard shortcuts advertised in Settings → Shortcuts.
 *
 * - `g` then `t` → /today
 * - `g` then `i` → /inbox
 * - `g` then `u` → /upcoming
 * - `g` then `p` → /projects
 * - `q` → focus the inbox quick-add (navigate to /inbox first)
 * - `⌘K` / `Ctrl+K` → focus the search box on /search
 *
 * Intentionally implemented as a real keydown listener instead of relying on
 * the @molecule/app-keyboard-shortcuts provider, which is a pure registry
 * with no global key listener attached. Using the provider would let the
 * Settings page render the shortcut list but no keystroke would actually
 * trigger anything.
 *
 * Shortcuts are suppressed when the user is typing in an input/textarea or
 * any element with `contenteditable` so they don't interfere with normal
 * typing. The Cmd/Ctrl+K combo is allowed everywhere because that is the
 * universal "open search" idiom and would feel broken if it didn't fire
 * inside the search box itself.
 */
export function GlobalShortcuts() {
  const navigate = useNavigate()
  const lastG = useRef<number>(0)

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      return false
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey
      // Cmd/Ctrl+K opens search regardless of focus context.
      if (cmd && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        navigate('/search')
        return
      }
      // All other shortcuts only fire when the user isn't typing.
      if (isTypingTarget(e.target) || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return

      const key = e.key.toLowerCase()

      // 'g' starts a navigation chord; remember it for ~1.5s so the second
      // key in 'g t' / 'g i' / 'g u' / 'g p' resolves correctly.
      if (key === 'g') {
        lastG.current = Date.now()
        return
      }
      if (Date.now() - lastG.current < 1500) {
        const target =
          key === 't'
            ? '/today'
            : key === 'i'
              ? '/inbox'
              : key === 'u'
                ? '/upcoming'
                : key === 'p'
                  ? '/projects'
                  : null
        if (target) {
          e.preventDefault()
          lastG.current = 0
          navigate(target)
          return
        }
      }

      if (key === 'q') {
        e.preventDefault()
        navigate('/inbox')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return null
}
