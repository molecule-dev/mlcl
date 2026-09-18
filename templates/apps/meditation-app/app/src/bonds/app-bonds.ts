import { provider as audio } from '@molecule/app-audio-howler'
import { bond } from '@molecule/app-bond'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'

bond('audio', audio)
bond('calendar', calendar)
bond('command-palette', commandPalette)
