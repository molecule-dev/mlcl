declare namespace NodeJS {
  export interface ProcessEnv {
    /**
     * The current environment.
     */
    NODE_ENV?: `development` | `production` | `test`

    /**
     * A unique identifier for the app.
     * 
     * @default mlcl
     */
    APP_ID?: string

    /**
     * The name of the app, typically as specified within `package.json`.
     *
     * @default $npm_package_name
     */
    APP_NAME?: string

    /**
     * The version number of the app, typically as specified within `package.json`.
     *
     * @default $npm_package_version
     */
    APP_VERSION?: string

    /**
     * The available app platforms.
     */
    APP_PLATFORM?: undefined
      | `android`
      | `ios`
      | `windows`
      | `mac`
      | `linux`
      | `cli`

    /**
     * The API's origin.
     *
     * @example https://api.molecule.dev
     * @example http://localhost:4000
     */
    API_ORIGIN?: string

    /**
     * The web app's origin.
     *
     * @example https://app.molecule.dev
     * @example http://localhost:3000
     */
    WEB_ORIGIN?: string
  }
}
