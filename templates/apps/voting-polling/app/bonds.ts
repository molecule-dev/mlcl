import { bond } from '@molecule/app-bond'
import { provider as charts } from '@molecule/app-charts'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('charts', charts)
bond('realtime', realtime)
bond('data-table', dataTable)
bond('command-palette', commandPalette)
bond('i18n', i18n)
