import { bond } from '@molecule/app-bond'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as imageCrop } from '@molecule/app-image-crop-cropperjs'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('virtual-scroll', virtualScroll)
bond('file-upload', fileUpload)
bond('image-crop', imageCrop)
bond('realtime', realtime)
