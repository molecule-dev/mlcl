import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as dragDrop } from '@molecule/app-drag-drop'

bond('data-table', dataTable)
bond('file-upload', fileUpload)
bond('drag-drop', dragDrop)
