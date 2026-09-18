import { bond } from '@molecule/app-bond'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('calendar', calendar)
bond('realtime', realtime)
