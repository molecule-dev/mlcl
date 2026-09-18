import { bond } from '@molecule/app-bond'
import { provider as maps } from '@molecule/app-maps'
import { provider as gallery } from '@molecule/app-gallery'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'

bond('maps', maps)
bond('gallery', gallery)
bond('calendar', calendar)
bond('dateRangePicker', dateRangePicker)
bond('virtualScroll', virtualScroll)
