import { bond } from '@molecule/app-bond'
import { provider as markdown } from '@molecule/app-markdown-react-markdown'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'

bond('markdown', markdown)
bond('virtual-scroll', virtualScroll)
bond('data-table', dataTable)
