// Minimal type stub for connect-busboy — the real package ships no .d.ts.
// Express.Request.busboy is attached by the middleware at runtime as a
// Writable stream; typed `any` so handlers can both pipe to it and
// `.on('file', ...)` it without TS friction. `connect-busboy` is already a
// dependency (it ships with @molecule/api-middleware-body-parser-express).
declare module 'connect-busboy' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const middleware: any
  export = middleware
}
declare namespace Express {
  interface Request {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    busboy: any
  }
}
