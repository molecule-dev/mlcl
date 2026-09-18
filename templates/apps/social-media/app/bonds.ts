import { bond } from '@molecule/app-bond'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as gallery } from '@molecule/app-gallery'
import { provider as imageCrop } from '@molecule/app-image-crop'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('virtual-scroll', virtualScroll)
bond('gallery', gallery)
bond('image-crop', imageCrop)
bond('realtime', realtime)
bond('i18n', i18n)
