import { useState } from 'react'

import {
  KanbanBoard,
  type KanbanCardData,
  type KanbanColumnData,
} from '@molecule/app-kanban-board-react'

/**
 * A task board (e.g. To Do / In Progress / Done) built on the shared
 * `<KanbanBoard>` from `@molecule/app-kanban-board-react` — do NOT rebuild a
 * board from scratch.
 *
 * `<KanbanBoard>` is CONTROLLED: it renders whatever `columns` you pass and
 * calls `onCardMove` when a card is dropped on a DIFFERENT column. You MUST move
 * the card in your own state there, or the board snaps back on the next render.
 * Drag-drop is native HTML5 DnD (no touch support — offer a menu affordance for
 * mobile), fires only across columns, and appends (no same-column reorder / no
 * insertion index).
 */
export function TaskBoard({
  initialColumns,
  onOpenCard,
}: {
  initialColumns: KanbanColumnData[]
  onOpenCard?: (card: KanbanCardData) => void
}) {
  const [columns, setColumns] = useState<KanbanColumnData[]>(initialColumns)

  const moveCard = (cardId: string, fromColumnId: string, toColumnId: string): void => {
    setColumns((prev) => {
      const card = prev.find((col) => col.id === fromColumnId)?.cards.find((c) => c.id === cardId)
      if (!card) {
        return prev
      }
      // Persist the move too — e.g. PATCH /api/tasks/:id { columnId: toColumnId } —
      // so it survives a reload; this local update just keeps the UI in sync.
      return prev.map((col) => {
        if (col.id === fromColumnId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
        }
        if (col.id === toColumnId) {
          return { ...col, cards: [...col.cards, card] }
        }
        return col
      })
    })
  }

  return (
    <KanbanBoard
      columns={columns}
      onCardMove={moveCard}
      onCardClick={onOpenCard ? (card) => onOpenCard(card) : undefined}
    />
  )
}

export default TaskBoard
