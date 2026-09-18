import { bond } from '@molecule/app-bond'
import { provider as charts } from '@molecule/app-charts'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('charts', charts)
bond('data-table', dataTable)
bond('date-range-picker', dateRangePicker)
bond('virtual-scroll', virtualScroll)
bond('command-palette', commandPalette)
bond('i18n', i18n)
