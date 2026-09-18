import { bond } from '@molecule/app-bond'
import { provider as imageCrop } from '@molecule/app-image-crop-cropperjs'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('image-crop', imageCrop)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('realtime', realtime)
