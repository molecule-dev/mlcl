/**
 * Long-form guide bodies for the guide-detail page.
 *
 * The guides API serves catalog metadata (title, description, read time);
 * the step-by-step BODY of each recipe lives here as static reference
 * content so it renders instantly with the page and stays reviewable in
 * the app source. Guides without an entry here render as a summary card
 * only — add an entry keyed by the guide's catalog id to give it a body.
 */

export interface GuideStepBullet {
  key: string
  text: string
}

export interface GuideStepContent {
  /** Anchor id for the section (e.g. `oauth-step-1`). */
  id: string
  headingKey: string
  headingDefault: string
  bodyKey: string
  bodyDefault: string
  bullets?: GuideStepBullet[]
  /** Static request sample rendered as a code block. */
  code?: string
  /** Compact three-node flow diagram (client → action → API). */
  flow?: {
    fromKey: string
    fromDefault: string
    actionKey: string
    actionDefault: string
    toKey: string
    toDefault: string
  }
}

export interface GuideBodyContent {
  callout?: {
    titleKey: string
    titleDefault: string
    bodyKey: string
    bodyDefault: string
  }
  steps: GuideStepContent[]
}

export const GUIDE_BODIES: Record<string, GuideBodyContent> = {
  'oauth-pkce': {
    callout: {
      titleKey: 'guideContent.oauth.calloutTitle',
      titleDefault: 'Before you begin',
      bodyKey: 'guideContent.oauth.calloutBody',
      bodyDefault:
        'Create a developer account and register an application first — you need a Client ID and a redirect URI to complete this flow.',
    },
    steps: [
      {
        id: 'oauth-step-1',
        headingKey: 'guideContent.oauth.step1.heading',
        headingDefault: 'Step 1: Register your app',
        bodyKey: 'guideContent.oauth.step1.body',
        bodyDefault:
          'To start the OAuth flow, register your application in the developer portal to obtain your credentials.',
        bullets: [
          {
            key: 'guideContent.oauth.step1.bullet1',
            text: 'Open the developer dashboard and sign in.',
          },
          {
            key: 'guideContent.oauth.step1.bullet2',
            text: 'Choose “Create New App” and give it a name and description.',
          },
          {
            key: 'guideContent.oauth.step1.bullet3',
            text: 'Add your authorized redirect_uris — the endpoints where users land after approving your app.',
          },
        ],
      },
      {
        id: 'oauth-step-2',
        headingKey: 'guideContent.oauth.step2.heading',
        headingDefault: 'Step 2: Request authorization',
        bodyKey: 'guideContent.oauth.step2.body',
        bodyDefault:
          'Send the user to the authorization URL below. If they accept, they are redirected to your redirect_uri with a one-time code query parameter.',
        code: 'GET /authorize?\n  client_id=YOUR_CLIENT_ID&\n  redirect_uri=YOUR_CALLBACK_URL&\n  response_type=code&\n  scope=read:user write:projects&\n  state=xyz_123_abc',
      },
      {
        id: 'oauth-step-3',
        headingKey: 'guideContent.oauth.step3.heading',
        headingDefault: 'Step 3: Exchange code for tokens',
        bodyKey: 'guideContent.oauth.step3.body',
        bodyDefault:
          'Once you receive the authorization code, exchange it for an access token by making a POST request to the token endpoint from your backend server — never from the browser.',
        flow: {
          fromKey: 'guideContent.oauth.flow.from',
          fromDefault: 'Your app',
          actionKey: 'guideContent.oauth.flow.action',
          actionDefault: 'POST /token',
          toKey: 'guideContent.oauth.flow.to',
          toDefault: '{{appName}} API',
        },
      },
    ],
  },
}
