import { getClassMap } from '@molecule/app-ui'

import type { LetterFeedback } from './PuzzleBoard.js'

interface PuzzleKeyboardProps {
  /** Best-known state per letter, derived from submitted guesses. */
  letterStates: Record<string, LetterFeedback>
  onKey: (key: 'enter' | 'backspace' | string) => void
  disabled?: boolean
}

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
] as const

const KEY_BASE =
  'h-14 rounded-lg font-bold uppercase text-sm flex items-center justify-center select-none transition-transform active:scale-95 disabled:opacity-50'
const KEY_WIDE = 'px-4 text-xs'
const KEY_LETTER = 'flex-1'

const KEY_CORRECT = 'bg-primary text-on-primary'
const KEY_PRESENT = 'bg-secondary text-on-secondary'
const KEY_ABSENT = 'bg-[var(--puzzle-tile-absent)] text-white opacity-80'
const KEY_UNGRADED = 'bg-[var(--puzzle-key-bg)] text-[var(--puzzle-key-fg)]'

const STATE_RANK: Record<LetterFeedback, number> = { absent: 1, present: 2, correct: 3 }

function keyClass(state: LetterFeedback | undefined): string {
  if (!state) return KEY_UNGRADED
  if (state === 'correct') return KEY_CORRECT
  if (state === 'present') return KEY_PRESENT
  return KEY_ABSENT
}

/**
 * On-screen keyboard. Physical keyboards are handled by PuzzleGame — this
 * component only reports taps, so both input paths share one handler.
 * Letter keys show the best feedback the letter has earned (green > amber >
 * gray), exactly like the tiles.
 */
export function PuzzleKeyboard({ letterStates, onKey, disabled = false }: PuzzleKeyboardProps) {
  const cm = getClassMap()

  const press = (key: string) => () => {
    if (!disabled) onKey(key)
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', gap: 1.5 }),
        'w-full max-w-md mx-auto',
      )}
      data-mol-id="puzzle-keyboard"
    >
      {ROWS.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={cm.cn(cm.flex({ align: 'stretch', justify: 'center', gap: 1.5 }), 'w-full')}
        >
          {rowIdx === 2 && (
            <button
              type="button"
              className={cm.cn(KEY_BASE, KEY_WIDE, 'px-3')}
              onClick={press('enter')}
              disabled={disabled}
              data-mol-id="key-enter"
            >
              Enter
            </button>
          )}
          {row.map((letter) => (
            <button
              type="button"
              key={letter}
              className={cm.cn(KEY_BASE, KEY_LETTER, keyClass(letterStates[letter]))}
              onClick={press(letter)}
              disabled={disabled}
              data-mol-id={`key-${letter}`}
            >
              {letter}
            </button>
          ))}
          {rowIdx === 2 && (
            <button
              type="button"
              className={cm.cn(KEY_BASE, KEY_WIDE, 'px-3')}
              onClick={press('backspace')}
              disabled={disabled}
              data-mol-id="key-backspace"
              aria-label="Backspace"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default PuzzleKeyboard

/** Merge a new guess's feedback into the running best-known letter states. */
export function deriveLetterStates(
  guesses: Array<{ word: string; feedback: LetterFeedback[] }>,
): Record<string, LetterFeedback> {
  const best: Record<string, LetterFeedback> = {}
  for (const guess of guesses) {
    guess.word.split('').forEach((letter, i) => {
      const state = guess.feedback[i]
      if (!state) return
      const current = best[letter]
      if (!current || STATE_RANK[state] > STATE_RANK[current]) best[letter] = state
    })
  }
  return best
}
