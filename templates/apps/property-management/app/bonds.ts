import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as commandPalette } from '@molecule/app-command-palette'

bond('dataTable', dataTable)
bond('calendar', calendar)
bond('dateRangePicker', dateRangePicker)
bond('fileUpload', fileUpload)
bond('commandPalette', commandPalette)
