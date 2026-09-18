import { bond } from '@molecule/app-bond'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('virtual-scroll', virtualScroll)
bond('i18n', i18n)
