import { track } from '@molecule/app-analytics'
import { useHttpClient, useOptimisticValue, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface Visibility {
  is_public: boolean
  public_slug: string | null
}

/** A loaded board's visibility control. Mount with a key for the board id. */
export function BoardVisibilityButton({
  board,
  onConfirmed,
  onError,
}: {
  board: { id: string; is_public?: boolean; public_slug?: string | null }
  onConfirmed: (visibility: Visibility) => void
  onError: (message: string) => void
}): ReactElement {
  const http = useHttpClient()
  const { t } = useTranslation()
  const cm = getClassMap()
  const visibility = useOptimisticValue({
    value: Boolean(board.is_public),
    commit: async (desired) => {
      const response = await http.put<Visibility>(`/api/boards/${board.id}`, {
        is_public: desired,
        public_slug: desired ? `b-${board.id.slice(0, 8)}` : null,
      })
      if (!response.data)
        throw new Error(
          t('boardCanvas.visibilityFailed', {}, { defaultValue: 'Could not save visibility.' })!,
        )
      onConfirmed(response.data)
      track({
        name: 'board.visibility_changed',
        properties: { board_id: board.id, is_public: response.data.is_public },
      })
      return response.data.is_public
    },
    onError: (error) => onError(error instanceof Error ? error.message : String(error)),
  })

  return (
    <button
      type="button"
      data-mol-id="board-toggle-public"
      aria-pressed={visibility.value}
      onClick={() => visibility.update((current) => !current)}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.fontWeight('semibold'),
        cm.textSize('xs'),
        'rounded-lg bg-surface-container-low hover:bg-surface-container',
      )}
    >
      <span>
        {visibility.value
          ? t('boardCanvas.public', {}, { defaultValue: 'Public — anyone with link can view' })
          : t('boardCanvas.private', {}, { defaultValue: 'Private — invite only' })}
      </span>
      <span className={cm.cn('material-symbols-outlined text-[16px]')}>
        {visibility.value ? 'visibility' : 'lock'}
      </span>
    </button>
  )
}
import type { ReactElement } from 'react'
