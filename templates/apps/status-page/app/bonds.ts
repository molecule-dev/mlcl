import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as charts } from '@molecule/app-charts'
import { provider as timeline } from '@molecule/app-timeline-default'
import { provider as badge } from '@molecule/app-badge'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('data-table', dataTable)
bond('charts', charts)
bond('timeline', timeline)
bond('badge', badge)
bond('virtual-scroll', virtualScroll)
