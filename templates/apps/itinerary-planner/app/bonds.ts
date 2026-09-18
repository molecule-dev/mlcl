import { bond } from '@molecule/app-bond'
import { provider as maps } from '@molecule/app-maps'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as dragDrop } from '@molecule/app-drag-drop'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as gallery } from '@molecule/app-gallery'

bond('maps', maps)
bond('calendar', calendar)
bond('dragDrop', dragDrop)
bond('realtime', realtime)
bond('gallery', gallery)
