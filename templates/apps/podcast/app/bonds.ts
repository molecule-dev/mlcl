import { bond } from '@molecule/app-bond'
import { provider as audio } from '@molecule/app-audio-howler'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('audio', audio)
bond('virtual-scroll', virtualScroll)
bond('i18n', i18n)
