import { bond } from '@molecule/app-bond'

import { provider as http } from '@molecule/app-http-axios'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'
import { provider as routing } from '@molecule/app-routing-react-router'
import { provider as state } from '@molecule/app-state-zustand'
import { provider as ui } from '@molecule/app-ui-react'
import { provider as styling } from '@molecule/app-ui-tailwind'
import { provider as storage } from '@molecule/app-storage-localstorage'
import { provider as theme } from '@molecule/app-theme-css-variables'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as gallery } from '@molecule/app-gallery-photoswipe'

bond('http', http)
bond('i18n', i18n)
bond('routing', routing)
bond('state', state)
bond('ui', ui)
bond('styling', styling)
bond('storage', storage)
bond('theme', theme)
bond('data-table', dataTable)
bond('gallery', gallery)
