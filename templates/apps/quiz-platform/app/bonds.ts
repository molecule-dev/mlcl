import { bond } from '@molecule/app-bond'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'

bond('realtime', realtime)
bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
bond('command-palette', commandPalette)
