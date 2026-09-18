import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('virtual-scroll', virtualScroll)
bond('data-table', dataTable)
