import {
  userAuthorization as authorization,
  userRequestHandlerMap as defaultRequestHandlerMap,
} from '@molecule/api-bonds-default-express'
import { authorizers } from '@molecule/api-resource-user'

/**
 * Auth rate limiting, tuned per environment.
 *
 * The default `rateLimitAuth` authorizer allows 60 attempts per IP per
 * 15 minutes — deliberate brute-force protection for production. It is
 * tuned for humans, not for a full e2e suite: the Playwright run makes
 * hundreds of sign-up/log-in calls, all from 127.0.0.1, and deterministically
 * exhausts the shared per-IP bucket partway through the run (every later
 * auth call then 429s for the rest of the window — the api-tokens /
 * user-journey / forgot-password failure class).
 *
 * Outside production, raise ONLY the per-IP ceiling; the per-account
 * ceiling (10 attempts / 15 min) keeps its production tuning so the
 * anti-brute-force behaviour stays real. Production keeps the stock
 * limiter untouched.
 */
const requestHandlerMap = { ...defaultRequestHandlerMap }
if (process.env.NODE_ENV !== 'production') {
  requestHandlerMap.rateLimitAuth = authorizers.rateLimit({
    scope: 'auth',
    accountFrom: [authorizers.loginAccountKey, authorizers.emailAccountKey],
    ipMax: 10_000,
  })
}

export { authorization, requestHandlerMap }
