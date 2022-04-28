/**
 * Device type definitions.
 * 
 * @module
 */

import * as resourceTypes from '../types.js'

// Internal reference for easier default type arguments within this module.
type DeviceProps = Props

/**
 * The device's properties returned by the API.
 */
export interface Props extends resourceTypes.Props {
  /**
   * The device owner's `userId`.
   */
  userId: string
  /**
   * The name of the device.
   * 
   * Usually determined using `navigator.userAgent`, `navigator.appVersion`, and `navigator.appName`, but user editable.
   */
  name?: string
  /**
   * An optional SSH key the device can use to access `git.molecule.dev`.
   */
  sshKey?: string
  /**
   * The platform when pushing notifications.
   * 
   * No platform means the push subscription was set up via a service worker registration's `PushManager`, either via web browser or Electron app.
   */
  pushPlatform?: `fcm` | `apn`
  /**
   * True when the user has push notifications enabled for the device.
   */
  hasPushSubscription?: boolean
}

/**
 * The properties when updating a device. 
 */
export interface UpdateProps {
  name?: Props['name']
  sshKey?: Props['sshKey']
}

/**
 * The successful device resource response.
 */
export type SuccessResponse<Props = DeviceProps> = resourceTypes.SuccessResponse<Props>

/**
 * The successful device resource response returning partial props.
 */
export type SuccessPartialResponse<Props = DeviceProps> = resourceTypes.SuccessPartialResponse<Props>

/**
 * The response when querying devices.
 * 
 * An extra `isCurrent` property is set to `true` when the device in the list matches the `session.deviceId`.
 */
export type QueryResponse<Props = DeviceProps> = resourceTypes.QueryResponse<Props & { isCurrent?: boolean }>

/**
 * Generic response with an optional body.
 */
export type GenericResponse = resourceTypes.GenericResponse

/**
 * The response containing a message.
 */
export type MessageResponse = resourceTypes.MessageResponse

/**
 * The response when an error has occurred when handling a device resource request.
 */
export type ErrorResponse = resourceTypes.ErrorResponse
