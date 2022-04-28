/**
 * User type definitions.
 * 
 * @module
 */

import * as resourceTypes from '../types.js'
import { PlanKey } from '../payment/types.js'

// Internal reference for easier default type arguments within this module.
type UserProps = Props

/**
 * The user's properties returned by the API.
 */
export interface Props extends resourceTypes.Props {
  /**
   * An alphanumeric username.
   */
  username: string
  /**
   * The user's given name.
   */
  name?: string
  /**
   * The user's email address.
   */
  email?: string
  /**
   * The user's phone number.
   */
  phone?: string
  /**
   * True when 2FA is enabled.
   */
  twoFactorEnabled?: boolean
  /**
   * The OAuth server used to authenticate the user.
   */
  oauthServer?: OAuthServer
  /**
   * Unique identifier for the user retrieved from the OAuth server.
   */
  oauthId?: string
  /**
   * User data retrieved from the OAuth server.
   * 
   * Varies depending on the server.
   */
  oauthData?: JSONObject
  /**
   * The user's current plan (key).
   */
  planKey?: PlanKey
  /**
   * When the plan expires.
   * 
   * Usually an ISO 8061 timestamp.
   */
  planExpiresAt?: string
  /**
   * True if the plan will automatically renew.
   */
  planAutoRenews?: boolean
}

/**
 * The available OAuth servers.
 */
export type OAuthServer = undefined
  | `github`
  | `gitlab`
  | `google`
  | `twitter`

/**
 * The properties when logging in via the CLI.
 */
export interface LogInCLIProps {
  token?: string
  deviceIds?: string[]
  deviceName?: string
}

/**
 * The successful user resource response returning either a token when initiating or user props when logged in.
 */
export type LogInCLIResponse<Props = UserProps> = {
  /**
   * HTTP status code.
   */
  statusCode: 200 | 201
  /**
   * The response body.
   */
  data: {
    /**
     * Response data will contain a `token` when initiating.
     */
    token?: string
    /**
     * Response data will contain `props` when logged in.
     */
    props?: Props
  }
}

/**
 * The successful user resource response.
 */
export type SuccessResponse<Props = UserProps> = resourceTypes.SuccessResponse<Props>

/**
 * The successful user resource response returning partial props.
 */
export type SuccessPartialResponse<Props = UserProps> = resourceTypes.SuccessPartialResponse<Props>

/**
 * Generic response with an optional body.
 */
export type GenericResponse = resourceTypes.GenericResponse

/**
 * The response containing a message.
 */
export type MessageResponse = resourceTypes.MessageResponse

/**
 * The response when an error has occurred when handling a user resource request.
 */
export type ErrorResponse = resourceTypes.ErrorResponse
