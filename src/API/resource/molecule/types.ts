/**
 * Molecule type definitions.
 * 
 * @module
 */

import { Commit } from '../../../types/index.js'
import { PlanKey } from '../payment/types.js'
import * as resourceTypes from '../types.js'

// Internal reference for easier default type arguments within this module.
type MoleculeProps = Props

/**
 * The molecule's properties returned by the API.
 */
export interface Props extends resourceTypes.Props {
  /**
   * The name of the molecule, chosen by the user.
   */
  name?: string
  /**
   * The customer's user ID.
   */
  userId: string
  /**
   * The object hash of the selected options relevant to the frontend app.
   * 
   * Set only when the selection is valid and implemented.
   */
  appSelectionHash?: string
  /**
   * The object hash of the selected options relevant to the backend API.
   * 
   * Set only when the selection is valid and implemented.
   */
  apiSelectionHash?: string
  /**
   * The selected options.
   */
  selection: {
    appLanguage?: `TypeScript`
      | `JavaScript`
      | `Dart`
      | `Other`
    appPackageManager?: `NPM`
      | `Yarn`
      | `Other`
    appRenderer?: `React`
      | `Vue`
      | `Angular`
      | `Flutter`
      | `Other`
    appDocs?: `TypeDoc`
      | `JSDoc`
      | `Other`
    appTesting?: `Jest`
      | `Mocha`
      | `Other`
    appLogging?: `Console`
      | `Loglevel`
      | `Other`
    appPlatformSupport?: `Capacitor`
      | `Cordova`
      | `React Native`
      | `Flutter`
      | `Other`
    appPlatforms?: Array<
      `Web`
      | `Android`
      | `iOS`
      | `macOS`
      | `Windows`
      | `Linux`
    >
    appUi?: `Styled Components`
      | `Ionic`
      | `Tailwind`
      | `Other`
    appThemes?: Array<
      `Light`
      | `Dark`
      | `Other`
    >
    userAuthentication?: Array<
      `Typical`
      | `OAuth`
      | `WebAuthn`
      | `Other`
    >
    oauthServers?: Array<
      `Google`
      | `Twitter`
      | `GitHub`
      | `GitLab`
      | `Other`
    >
    pushNotifications?: `Enabled`
      | `Disabled`
    paymentPlatforms?: Array<
      `Stripe`
      | `Apple Pay`
      | `Google Pay`
      | `PayPal`
      | `Other`
    >
    appDeployment?: `Netlify`
      | `Render`
      | `Digital Ocean`
      | `Vercel`
      | `Cloudflare`
      | `AWS`
      | `Other`
    apiLanguage?: `TypeScript`
      | `JavaScript`
      | `Python`
      | `Go`
      | `Other`
    apiPackageManager?: `NPM`
      | `Yarn`
      | `Other`
    apiDocs?: `TypeDoc`
      | `JSDoc`
      | `Other`
    apiTesting?: `Jest`
      | `Mocha`
      | `Other`
    apiLogging?: `Console`
      | `Loglevel`
      | `Winston`
      | `Other`
    apiDatabase?: `PostgreSQL`
      | `SQLite`
      | `Firebase`
      | `MongoDB`
      | `Other`
    apiEmails?: `Sendmail`
      | `Mailgun`
      | `SendGrid`
      | `SES`
      | `Other`
    apiUploads?: `S3`
      | `File System`
      | `Other`
    apiDeployment?: `Heroku`
      | `Render`
      | `Digital Ocean`
      | `AWS`
      | `Other`
  }
  /**
   * Other custom options requested by the customer.
   */
  other: {
    appLanguage?: string
    appPackageManager?: string
    appRenderer?: string
    appDocs?: string
    appTesting?: string
    appLogging?: string
    appPlatformSupport?: string
    appPlatforms?: string
    appUi?: string
    appThemes?: string
    userAuthentication?: string
    oauthServers?: string
    pushNotifications?: string
    paymentPlatforms?: string
    appDeployment?: string
    apiLanguage?: string
    apiPackageManager?: string
    apiDocs?: string
    apiTesting?: string
    apiLogging?: string
    apiDatabase?: string
    apiEmails?: string
    apiUploads?: string
    apiDeployment?: string
    additionalInfo?: string
    questions?: string
    discountCode?: string
  }
  /**
   * The plan the user has selected for the molecule.
   */
  plan?: `Free Trial`
    | `Subscription`
    | `Single Use`
    | `Unlimited Use`
    | `Business`
  /**
   * The molecule's current plan as a key of the `plans` object.
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
  /**
   * The checkout URL through which the user can subscribe or buy a license.
   */
  checkoutUrl?: string
  /**
   * The number of emails sent through the molecule within the last 24 hours.
   */
  emailCount?: number
  /**
   * The time at which the email count was last reset to 0.
   */
  emailCountResetAt?: string
}

/**
 * The properties when creating a molecule. 
 */
export interface CreateProps {
  selection: Props['selection']
  other: Props['other']
  plan: Props['plan']
  quantity?: number | string
  name?: string
}

/**
 * The properties when updating a molecule.
 */
export type UpdateProps = Pick<Props,
  `name`
>

/**
 * The properties when updating the molecule's plan.
 */
 export interface UpdatePlanProps {
  planKey: PlanKey
  receipt?: string
  quantity?: number
}

/**
 * The successful molecule resource response returning either partial props or a checkout URL.
 */
export type UpdatePlanResponse<Props = MoleculeProps> = {
  /**
   * HTTP status code.
   */
  statusCode: 200 | 201
  /**
   * The response body.
   */
  data: {
    /**
     * Response data will contain updated `props` if the molecule's plan was updated. 
     */
    props?: Partial<Props>
    /**
     * Response data will contain a `checkoutUrl` if the user should be redirected to a URL to complete checkout.
     */
    checkoutUrl?: string
  }
}

/**
 * A response containing the necessary information to clone the Molecule.
 */
export type CloneResponse = {
  /**
   * HTTP status code.
   */
  statusCode: 200
  /**
   * The response body.
   */
  data: {
    /**
     * The Molecule's props.
     */
    props: Props
    /**
     * Response data will contain `apiRepoUrl` if the selection is relevant to the Molecule's API.
     */
    apiRepoUrl?: string
    /**
     * Response data will contain an array of commit hashes if the Molecule's API selection does not yet exist in our repositories.
     */
    apiCommits?: Array<Commit>
    /**
     * Response data will contain `appRepoUrl` if the selection is relevant to the Molecule's API.
     */
    appRepoUrl?: string
    /**
     * Response data will contain an array of commit hashes if the Molecule's API selection does not yet exist in our repositories.
     */
    appCommits?: Array<Commit>
  }
}

/**
 * The successful molecule resource response.
 */
export type SuccessResponse<Props = MoleculeProps> = resourceTypes.SuccessResponse<Props>

/**
 * The successful molecule resource response returning partial props.
 */
export type SuccessPartialResponse<Props = MoleculeProps> = resourceTypes.SuccessPartialResponse<Props>

/**
 * The response when querying molecules.
 */
export type QueryResponse<Props = MoleculeProps> = resourceTypes.QueryResponse<Props>

/**
 * Generic response with an optional body.
 */
export type GenericResponse = resourceTypes.GenericResponse

/**
 * The response containing a molecule.
 */
export type MessageResponse = resourceTypes.MessageResponse

/**
 * The response when an error has occurred when handling a molecule resource request.
 */
export type ErrorResponse = resourceTypes.ErrorResponse
