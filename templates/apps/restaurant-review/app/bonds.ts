import { bond } from '@molecule/app-bond'
import { provider as maps } from '@molecule/app-maps'
import { provider as gallery } from '@molecule/app-gallery'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'

bond('maps', maps)
bond('gallery', gallery)
bond('virtualScroll', virtualScroll)
