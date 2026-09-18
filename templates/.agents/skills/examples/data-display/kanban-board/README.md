---
name: kanban-board
intent: |
  - "Kanban board"
  - "Task board with drag and drop"
  - "Trello-style columns"
  - "Move cards between columns"
  - "Project / issue board"
keywords:
  [
    kanban,
    board,
    task,
    tasks,
    drag,
    drop,
    trello,
    column,
    columns,
    card,
    cards,
    backlog,
    workflow,
    project,
    issue,
    swimlane,
  ]
---

# Kanban board (drag-and-drop columns)

**When to copy this example:** the user wants a board of columns with
draggable cards — a task board, Trello-style project view, issue board.

**Works out of the box — no provider to bond.** `<KanbanBoard>` is a
self-contained React component using native HTML5 drag-and-drop.

## What you'll install

```bash
cd /workspace
# The ready-made board component (uses <Card> from app-ui-react under the hood).
npm install @molecule/app-kanban-board-react --workspace=app
```

## Files in this example

| Path                           | What it does                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/TaskBoard.tsx` | Holds the `columns` state and renders the shared `<KanbanBoard>`. Handles `onCardMove` by moving the card between columns in state (the required step — see anti-patterns). Passes card clicks up via `onOpenCard`. |

Usage — you own the data; each column has `cards`:

```tsx
<TaskBoard
  initialColumns={[
    { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'Research API' }] },
    {
      id: 'doing',
      title: 'In Progress',
      accent: 'primary',
      cards: [{ id: 'c2', title: 'Build UI' }],
    },
    { id: 'done', title: 'Done', accent: 'success', cards: [] },
  ]}
  onOpenCard={(card) => navigate(`/tasks/${card.id}`)}
/>
```

## Anti-patterns

- Do not rebuild a board/column/card component from scratch. Use
  `<KanbanBoard>` (and `<KanbanColumn>` / `<KanbanCard>`) from
  `@molecule/app-kanban-board-react` — they already handle DnD, styling via
  `getClassMap()`, and `data-mol-id`.
- Do not ignore `onCardMove`. `<KanbanBoard>` is CONTROLLED — it renders your
  `columns` and does not mutate them. If you don't move the card in your own
  state, the drop visually snaps back on the next render.
- Do not expect same-column reordering or an insertion index. `onCardMove`
  fires only when a card lands on a DIFFERENT column and appends to it — there
  is no "reorder within a column" or drop-position. Model status changes, not
  fine-grained ordering.
- Do not rely on drag-and-drop alone on mobile. Native HTML5 DnD does not fire
  on touch devices — provide an alternate affordance (a "move to…" menu via
  `renderHeaderActions`) for touch users.
- Do not forget to persist the move. The local state update keeps the UI in
  sync; also PATCH the card's column server-side (e.g. `PATCH /api/tasks/:id
{ columnId }`) so it survives a reload.
- Do not use `accent` for logic. It is cosmetic column metadata only
  (`primary | success | warning | error | info | neutral`).

## Verify

Three columns render with cards → dragging a card to another column moves it
there and it stays after re-render → clicking a card fires `onOpenCard`.
