import { bond } from '@molecule/app-bond'
import { provider as charts } from '@molecule/app-charts'
import { provider as audio } from '@molecule/app-audio-howler'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'

bond('charts', charts)
bond('audio', audio)
bond('calendar', calendar)
bond('command-palette', commandPalette)
