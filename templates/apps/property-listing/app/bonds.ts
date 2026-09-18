import { bond } from '@molecule/app-bond'
import { provider as maps } from '@molecule/app-maps'
import { provider as gallery } from '@molecule/app-gallery'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'

bond('maps', maps)
bond('gallery', gallery)
bond('virtualScroll', virtualScroll)
bond('dataTable', dataTable)
bond('dateRangePicker', dateRangePicker)
