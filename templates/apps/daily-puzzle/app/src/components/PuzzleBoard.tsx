import { useEffect, useRef, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Per-letter feedback — mirrors the API's guesses.feedback JSONB array. */
export type LetterFeedback = 'correct' | 'present' | 'absent'

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

export interface BoardGuess {
  word: string
  feedback: LetterFeedback[]
}

interface PuzzleBoardProps {
  guesses: BoardGuess[]
  /** Letters typed into the active row (not yet submitted). */
  currentInput?: string
  /** True briefly after an invalid-word rejection — shakes the active row. */
  shake?: boolean
  wordLength?: number
  maxGuesses?: number
  /** Disable flip-in animation (static boards: HowToPlay, Landing). */
  animate?: boolean
}

const TILE_BASE = [
  'w-[3rem] h-[3rem]',
  'rounded-lg',
  'text-2xl font-bold uppercase',
  'flex items-center justify-center',
  'select-none',
].join(' ')

const TILE_EMPTY = 'border-2 border-outline/40 text-on-surface'
const TILE_FILLED = 'border-2 border-outline text-on-surface'
const TILE_CORRECT = 'bg-primary text-on-primary border-primary'
const TILE_PRESENT = 'bg-secondary text-on-secondary border-secondary'
const TILE_ABSENT = 'bg-[var(--puzzle-tile-absent)] text-white border-transparent'

function tileClass(state: LetterFeedback): string {
  if (state === 'correct') return TILE_CORRECT
  if (state === 'present') return TILE_PRESENT
  return TILE_ABSENT
}

/**
 * The 6x5 guess grid. Submitted rows flip in letter-by-letter (staggered
 * rotateX transition); the flip is skipped when animate={false} so static
 * boards on marketing pages render fully colored immediately.
 */
export function PuzzleBoard({
  guesses,
  currentInput = '',
  shake = false,
  wordLength = WORD_LENGTH,
  maxGuesses = MAX_GUESSES,
  animate = true,
}: PuzzleBoardProps) {
  const cm = getClassMap()
  // Rows whose flip has completed. The newest submitted row starts un-flipped
  // (neutral border, letter visible) and crosses to its feedback colors once
  // the row is counted — the transition between the two class sets IS the flip.
  const [flippedRows, setFlippedRows] = useState(guesses.length)
  const prevCount = useRef(guesses.length)

  useEffect(() => {
    if (!animate) {
      setFlippedRows(guesses.length)
      return
    }
    if (guesses.length > prevCount.current) {
      // Long enough for the stagger (5 letters x 120ms) + the flip itself.
      const timer = setTimeout(() => setFlippedRows(guesses.length), 5 * 120 + 420)
      prevCount.current = guesses.length
      return () => clearTimeout(timer)
    }
    prevCount.current = guesses.length
    setFlippedRows(guesses.length)
  }, [guesses.length, animate])

  // Invalid-word shake — Web Animations API: a per-frame transform no static
  // class can express, and it cleans itself up (no class juggling).
  const shakeRowRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!shake || !shakeRowRef.current) return
    shakeRowRef.current.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 420, easing: 'ease-in-out' },
    )
  }, [shake])

  const rows = Array.from({ length: maxGuesses }, (_, row) => {
    const guess = guesses[row]
    const isActive = !guess && row === guesses.length
    return (
      <div
        key={row}
        ref={isActive ? shakeRowRef : undefined}
        className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 1.5 }))}
        data-mol-id={isActive ? 'board-active-row' : undefined}
      >
        {Array.from({ length: wordLength }, (_, col) => {
          if (guess) {
            const letter = guess.word[col] ?? ''
            const revealed = !animate || row < flippedRows
            return (
              <div
                key={col}
                className={cm.cn(
                  TILE_BASE,
                  'transition-transform duration-500 transform-3d',
                  revealed ? tileClass(guess.feedback[col]) : TILE_FILLED,
                  revealed ? '' : 'rotate-x-90',
                )}
                style={revealed ? undefined : { transitionDelay: `${col * 120}ms` }}
              >
                {revealed ? letter : ''}
              </div>
            )
          }
          const typed = isActive ? currentInput[col] : undefined
          return (
            <div
              key={col}
              className={cm.cn(TILE_BASE, typed ? TILE_FILLED : TILE_EMPTY)}
              data-mol-id={isActive ? `board-tile-${col}` : undefined}
            >
              {typed ?? ''}
            </div>
          )
        })}
      </div>
    )
  })

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 1.5 }))}>{rows}</div>
  )
}

export default PuzzleBoard
