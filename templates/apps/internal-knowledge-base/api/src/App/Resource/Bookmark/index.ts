/**
 * Bookmark resource wrapper.
 *
 * Re-exports the static `requestHandlerMap` from
 * `@molecule/api-resource-bookmark` so the App router can wire the
 * canonical bookmark handlers (create / list / folders / check / del)
 * against the resource defined by `@molecule/api-resource-bookmark/routes`.
 */
export { requestHandlerMap } from '@molecule/api-resource-bookmark'
