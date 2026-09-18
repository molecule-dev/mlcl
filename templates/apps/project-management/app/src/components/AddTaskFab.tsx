import { useNavigate, useParams } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

export type AddTaskFabProps = { onClick?: () => void }

function AddTaskFab({ onClick }: AddTaskFabProps = {}) {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const handleClick = () => {
    if (onClick) onClick()
    else navigate(projectId ? `/projects/${projectId}/board` : '/')
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        cm.w(14),
        cm.h(14),
        'fixed bottom-8 right-8 bg-primary shadow-2xl text-on-primary hover:scale-110 active:scale-90 transition-all z-50',
      )}
      data-mol-id="fab-add-task"
    >
      <span className={cm.cn('material-symbols-outlined')} data-icon="add">
        add
      </span>
    </button>
  )
}

export default AddTaskFab
export { AddTaskFab }
