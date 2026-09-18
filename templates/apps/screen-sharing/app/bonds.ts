import { bond } from '@molecule/app-bond'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'

bond('virtual-scroll', virtualScroll)
bond('data-table', dataTable)
