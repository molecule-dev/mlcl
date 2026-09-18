import { bond } from '@molecule/app-bond'
import { provider as aiCopilot } from '@molecule/app-ai-copilot-default'
import { provider as aiImageGenerator } from '@molecule/app-ai-image-generator-default'
import { provider as gallery } from '@molecule/app-gallery-photoswipe'
import { provider as imageCrop } from '@molecule/app-image-crop-cropperjs'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('ai-copilot', aiCopilot)
bond('ai-image-generator', aiImageGenerator)
bond('gallery', gallery)
bond('image-crop', imageCrop)
bond('virtual-scroll', virtualScroll)
