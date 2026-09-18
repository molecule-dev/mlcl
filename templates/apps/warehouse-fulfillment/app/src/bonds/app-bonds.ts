import { bond } from '@molecule/app-bond'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('realtime', realtime)
bond('i18n', i18n)

// Abstract packages (data-table, charts, virtual-scroll, command-palette,
// keyboard-shortcuts) ship without a default provider — bond their
// implementation packages here once a concrete provider is selected.
