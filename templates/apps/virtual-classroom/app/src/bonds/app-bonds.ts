import { bond } from '@molecule/app-bond'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('realtime', realtime)
bond('file-upload', fileUpload)
bond('data-table', dataTable)
bond('command-palette', commandPalette)
