import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as treeView } from '@molecule/app-tree-view'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as fileUpload } from '@molecule/app-file-upload'

bond('data-table', dataTable)
bond('calendar', calendar)
bond('tree-view', treeView)
bond('command-palette', commandPalette)
bond('file-upload', fileUpload)
