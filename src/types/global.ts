/**
 * Global type definitions.
 * 
 * @module
 */

declare global {
  /**
   * Useful when specifying that some type is a JSON value. 
   */
  export type JSONValue = string | number | boolean | JSONObject | JSONArray | null | undefined

  /**
   * Useful when specifying that some type is a JSON object. 
   */
  export interface JSONObject {
    [key: string]: JSONValue
  }

  /**
   * Useful when specifying that some type is a JSON array. 
   */
  export type JSONArray = Array<JSONValue>
}

export {}
