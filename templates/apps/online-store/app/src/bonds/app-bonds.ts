import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { setProvider as setGalleryProvider } from '@molecule/app-gallery'
import { provider as gallery } from '@molecule/app-gallery-photoswipe'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
setGalleryProvider(gallery)
