import { createRequestHandler } from '@molecule/api-resource'
import { createRequestHandlerMap } from '@molecule/api-resource-status-page'

export const requestHandlerMap = createRequestHandlerMap(createRequestHandler)
