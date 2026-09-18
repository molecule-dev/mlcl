import { bond } from '@molecule/app-bond'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as video } from '@molecule/app-video'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'

bond('calendar', calendar)
bond('data-table', dataTable)
bond('file-upload', fileUpload)
bond('realtime', realtime)
bond('video', video)
bond('command-palette', commandPalette)
