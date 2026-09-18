import { bond } from '@molecule/app-bond'
import { provider as maps } from '@molecule/app-maps'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as gallery } from '@molecule/app-gallery'

bond('maps', maps)
bond('dataTable', dataTable)
bond('calendar', calendar)
bond('dateRangePicker', dateRangePicker)
bond('virtualScroll', virtualScroll)
bond('gallery', gallery)
