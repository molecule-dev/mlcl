/**
 * Registry dependency pins that do not follow the version molecule's packages and the template
 * fleet pin, each with the reason.
 *
 * A key is `<source> <dependency>`, where the source is the registry section the pin sits in
 * (`appFrameworks.react-native.dependencies`, `toolchain.app`). `sync-registry` keeps each listed
 * pin instead of moving it to molecule's version, and `toolchain.test.ts` accepts it where the
 * template fleet pins another version and fails on one that no longer differs.
 *
 * @module
 */

/** `<source> <dependency>` → why that registry pin differs from molecule's and the fleet's. */
export const REGISTRY_PIN_EXCEPTIONS: Readonly<Record<string, string>> = {
  'appFrameworks.react-native.devDependencies tailwindcss':
    'NativeWind 4 compiles through react-native-css-interop, whose tailwindcss peer is ~3, ' +
    'while the web fleet is on Tailwind 4; an Expo app is never installed into the sandbox ' +
    'workspace the fleet shares',
  'appFrameworks.react-native.dependencies react':
    "React Native 0.79's renderer throws at startup unless react is exactly the version it " +
    'was built with, 19.0.0, which is the version Expo SDK 53 installs',
  'appFrameworks.react-native.dependencies react-dom':
    'react-native-web renders the web target through react-dom, which throws unless it is ' +
    "exactly react's version (19.0.0 in an Expo SDK 53 app)",
  'appFrameworks.react-native.devDependencies @types/react':
    "Expo SDK 53 pairs react 19.0.0 with @types/react ~19.0.10; the fleet's 19.3 types " +
    'describe APIs react 19.0.0 does not have',
}

/**
 * The reason a registry pin is kept at its own version, when the ledger lists it.
 *
 * @param source - The registry section the pin sits in, e.g. `appFrameworks.react-native.dependencies`.
 * @param dependency - The dependency's package name.
 * @returns The recorded reason, or `undefined` when the pin follows molecule's version.
 */
export function registryPinException(source: string, dependency: string): string | undefined {
  return REGISTRY_PIN_EXCEPTIONS[`${source} ${dependency}`]
}
