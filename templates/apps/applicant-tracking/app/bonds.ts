import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as kanban } from '@molecule/app-kanban'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as commandPalette } from '@molecule/app-command-palette'

bond('data-table', dataTable)
bond('kanban', kanban)
bond('file-upload', fileUpload)
bond('command-palette', commandPalette)
