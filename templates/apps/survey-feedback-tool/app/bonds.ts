import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as dragDrop } from '@molecule/app-drag-drop'
import { provider as commandPalette } from '@molecule/app-command-palette'

bond('data-table', dataTable)
bond('drag-drop', dragDrop)
bond('command-palette', commandPalette)
