import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as charts } from '@molecule/app-charts'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('data-table', dataTable)
bond('charts', charts)
bond('virtual-scroll', virtualScroll)
bond('command-palette', commandPalette)
bond('realtime', realtime)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('i18n', i18n)
