import { bond } from '@molecule/app-bond'
import { provider as audio } from '@molecule/app-audio-howler'
import { provider as dragDrop } from '@molecule/app-drag-drop'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as timeline } from '@molecule/app-timeline'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('audio', audio)
bond('drag-drop', dragDrop)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('file-upload', fileUpload)
bond('timeline', timeline)
bond('realtime', realtime)
