import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { setProvider as setGalleryProvider } from '@molecule/app-gallery'
import { provider as gallery } from '@molecule/app-gallery-photoswipe'

bond('data-table', dataTable)
setGalleryProvider(gallery)
