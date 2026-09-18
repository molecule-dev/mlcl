import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as gallery } from '@molecule/app-gallery-photoswipe'
import { provider as http } from '@molecule/app-http-axios'
import { provider as state } from '@molecule/app-state-zustand'
import { provider as stepper } from '@molecule/app-stepper-default'

bond('http', http)
bond('state', state)
bond('data-table', dataTable)
bond('gallery', gallery)
bond('stepper', stepper)
