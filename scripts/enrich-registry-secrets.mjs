#!/usr/bin/env node
/**
 * Enrich registry.json secrets with setup metadata (label, setupUrl,
 * instructions, example, generate, provisioned).
 *
 * The map below is the hand-curated source of truth for "how do I get this
 * credential", keyed by env var name (the same env var always means the same
 * credential, whichever package declares it). Idempotent: re-running
 * overwrites only the enrichment fields; name/required/default are never
 * touched. Fails loudly if any declared secret is missing from the map so new
 * packages can't ship un-enriched secrets silently.
 *
 * Consumed by: mlcl scaffold (.env comments + auto-generation), README.md
 * generation (Environment Variables section), and molecule-dev's IDE setup
 * panel (via GET /projects/:id/setup).
 *
 * Usage: node scripts/enrich-registry-secrets.mjs [--check]
 *   --check  verify coverage + that registry matches the map (CI guard); no writes
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const registryPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'registry.json')

/** @type {Record<string, {label: string, setupUrl?: string, instructions: string, example?: string, generate?: string, provisioned?: boolean}>} */
const SECRET_META = {
  // --- AI providers -------------------------------------------------------
  ANTHROPIC_API_KEY: {
    label: 'Anthropic API key',
    setupUrl: 'https://console.anthropic.com/settings/keys',
    instructions: 'Create a key in the Anthropic Console under Settings → API keys.',
    example: 'sk-ant-api03-...',
  },
  OPENAI_API_KEY: {
    label: 'OpenAI API key',
    setupUrl: 'https://platform.openai.com/api-keys',
    instructions: 'Create a secret key on the OpenAI platform (API keys page).',
    example: 'sk-proj-...',
  },
  GOOGLE_AI_API_KEY: {
    label: 'Google AI (Gemini) API key',
    setupUrl: 'https://aistudio.google.com/apikey',
    instructions: 'Create a Gemini API key in Google AI Studio.',
    example: 'AIza...',
  },
  DEEPSEEK_API_KEY: {
    label: 'DeepSeek API key',
    setupUrl: 'https://platform.deepseek.com/api_keys',
    instructions: 'Create an API key on the DeepSeek open platform.',
    example: 'sk-...',
  },
  DASHSCOPE_API_KEY: {
    label: 'Alibaba DashScope API key',
    setupUrl: 'https://www.alibabacloud.com/help/en/model-studio/get-api-key',
    instructions: 'Create an API key in Alibaba Cloud Model Studio (DashScope).',
    example: 'sk-...',
  },
  MINIMAX_API_KEY: {
    label: 'MiniMax API key',
    setupUrl: 'https://platform.minimax.io/',
    instructions: 'Create an interface key in the MiniMax platform user center.',
  },
  MOONSHOT_API_KEY: {
    label: 'Moonshot API key',
    setupUrl: 'https://platform.moonshot.ai/console/api-keys',
    instructions: 'Create an API key in the Moonshot AI console.',
    example: 'sk-...',
  },
  ZHIPU_API_KEY: {
    label: 'Zhipu AI API key',
    setupUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    instructions: 'Create an API key in the Zhipu AI (BigModel) user center.',
  },
  STABILITY_API_KEY: {
    label: 'Stability AI API key',
    setupUrl: 'https://platform.stability.ai/account/keys',
    instructions: 'Create an API key under Account → API keys on the Stability platform.',
    example: 'sk-...',
  },
  ELEVENLABS_API_KEY: {
    label: 'ElevenLabs API key',
    setupUrl: 'https://elevenlabs.io/app/settings/api-keys',
    instructions: 'Create an API key in ElevenLabs under Settings → API keys.',
    example: 'sk_...',
  },
  DEEPL_API_KEY: {
    label: 'DeepL API key',
    setupUrl: 'https://www.deepl.com/en/your-account/keys',
    instructions: 'Copy the authentication key from your DeepL account (free keys end with ":fx").',
    example: '279a2e9d-...:fx',
  },

  // --- Analytics ----------------------------------------------------------
  POSTHOG_API_KEY: {
    label: 'PostHog project API key',
    setupUrl: 'https://app.posthog.com/settings/project',
    instructions: 'Copy the Project API key from PostHog → Project settings.',
    example: 'phc_...',
  },
  POSTHOG_HOST: {
    label: 'PostHog host',
    instructions: 'Origin of your PostHog instance (US cloud, EU cloud, or self-hosted).',
    example: 'https://us.i.posthog.com',
  },
  MIXPANEL_TOKEN: {
    label: 'Mixpanel project token',
    setupUrl: 'https://mixpanel.com/settings/project',
    instructions: 'Copy the Project Token from Mixpanel → Project Settings → Access Keys.',
  },
  VITE_MIXPANEL_TOKEN: {
    label: 'Mixpanel project token',
    setupUrl: 'https://mixpanel.com/settings/project',
    instructions:
      'Copy the Project Token from Mixpanel → Project Settings → Access Keys. This is a public browser-side token — Vite embeds it into the client bundle (VITE_ prefix required).',
  },
  VITE_POSTHOG_KEY: {
    label: 'PostHog project API key',
    setupUrl: 'https://app.posthog.com/settings/project',
    instructions:
      'Copy the Project API key from PostHog → Project settings. This is a public browser-side key — Vite embeds it into the client bundle (VITE_ prefix required).',
    example: 'phc_...',
  },
  VITE_POSTHOG_HOST: {
    label: 'PostHog host',
    instructions:
      'Origin of your PostHog instance (US cloud, EU cloud, or self-hosted). Browser-side (VITE_ prefix required).',
    example: 'https://us.i.posthog.com',
  },

  // --- Payments -----------------------------------------------------------
  STRIPE_SECRET_KEY: {
    label: 'Stripe secret key',
    setupUrl: 'https://dashboard.stripe.com/apikeys',
    instructions:
      'Stripe Dashboard → Developers → API keys; use the sk_test_ key in test mode, sk_live_ in production.',
    example: 'sk_test_...',
  },
  STRIPE_WEBHOOK_SECRET: {
    label: 'Stripe webhook signing secret',
    setupUrl: 'https://dashboard.stripe.com/webhooks',
    instructions:
      'Stripe Dashboard → Developers → Webhooks → Add endpoint pointing at {apiUrl}/api/users/payment-notification/stripe, then copy its signing secret.',
    example: 'whsec_...',
  },
  STRIPE_IDENTITY_WEBHOOK_SECRET: {
    label: 'Stripe Identity webhook signing secret',
    setupUrl: 'https://dashboard.stripe.com/webhooks',
    instructions:
      'Add a webhook endpoint for Identity events in the Stripe Dashboard and copy its signing secret.',
    example: 'whsec_...',
  },
  APPLE_SHARED_SECRET: {
    label: 'Apple app-specific shared secret',
    setupUrl: 'https://appstoreconnect.apple.com/',
    instructions:
      'App Store Connect → your app → App Information → App-Specific Shared Secret (for receipt validation).',
  },
  GOOGLE_API_SERVICE_KEY_OBJECT: {
    label: 'Google service account key (JSON)',
    setupUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    instructions:
      'Create a service account with Android Publisher access in Google Cloud Console, create a JSON key, and paste the full JSON.',
    example: '{"type":"service_account",...}',
  },
  GOOGLE_PLAY_PACKAGE_NAME: {
    label: 'Google Play package name',
    instructions:
      'Your Android application ID as published on Google Play (used to verify purchases).',
    example: 'com.example.app',
  },

  // --- OAuth / sign-in ----------------------------------------------------
  OAUTH_GOOGLE_CLIENT_ID: {
    label: 'Google OAuth client ID',
    setupUrl: 'https://console.cloud.google.com/apis/credentials',
    instructions:
      'Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application); add your app origin and {apiUrl}/api/users/log-in/oauth as an authorized redirect URI.',
    example: '1234567890-abc.apps.googleusercontent.com',
  },
  OAUTH_GOOGLE_CLIENT_SECRET: {
    label: 'Google OAuth client secret',
    setupUrl: 'https://console.cloud.google.com/apis/credentials',
    instructions: 'Shown when creating the OAuth 2.0 Client ID in Google Cloud Console.',
    example: 'GOCSPX-...',
  },
  OAUTH_GITHUB_CLIENT_ID: {
    label: 'GitHub OAuth client ID',
    setupUrl: 'https://github.com/settings/developers',
    instructions:
      'GitHub → Settings → Developer settings → OAuth Apps → New OAuth App; set the callback URL to {apiUrl}/api/users/log-in/oauth.',
    example: 'Iv1.abc123...',
  },
  OAUTH_GITHUB_CLIENT_SECRET: {
    label: 'GitHub OAuth client secret',
    setupUrl: 'https://github.com/settings/developers',
    instructions: 'Generate a client secret on your GitHub OAuth App page.',
  },
  OAUTH_GITLAB_CLIENT_ID: {
    label: 'GitLab OAuth application ID',
    setupUrl: 'https://gitlab.com/-/user_settings/applications',
    instructions:
      'GitLab → User settings → Applications → Add new application with the {apiUrl}/api/users/log-in/oauth redirect URI.',
  },
  OAUTH_GITLAB_CLIENT_SECRET: {
    label: 'GitLab OAuth secret',
    setupUrl: 'https://gitlab.com/-/user_settings/applications',
    instructions: 'Shown when creating the application in GitLab.',
  },
  OAUTH_MICROSOFT_CLIENT_ID: {
    label: 'Microsoft application (client) ID',
    setupUrl: 'https://entra.microsoft.com/',
    instructions:
      'Microsoft Entra ID → App registrations → New registration; copy the Application (client) ID.',
  },
  OAUTH_MICROSOFT_CLIENT_SECRET: {
    label: 'Microsoft client secret',
    setupUrl: 'https://entra.microsoft.com/',
    instructions: 'App registration → Certificates & secrets → New client secret; copy the Value.',
  },
  OAUTH_MICROSOFT_TENANT_ID: {
    label: 'Microsoft directory (tenant) ID',
    setupUrl: 'https://entra.microsoft.com/',
    instructions:
      'Copy the Directory (tenant) ID from the app registration overview, or use "common" for multi-tenant.',
    example: 'common',
  },
  OAUTH_TWITTER_CLIENT_ID: {
    label: 'X (Twitter) OAuth client ID',
    setupUrl: 'https://developer.x.com/en/portal/dashboard',
    instructions:
      'Create a project + app in the X developer portal, enable OAuth 2.0, and copy the client ID.',
  },
  OAUTH_TWITTER_CLIENT_SECRET: {
    label: 'X (Twitter) OAuth client secret',
    setupUrl: 'https://developer.x.com/en/portal/dashboard',
    instructions: 'Shown when enabling OAuth 2.0 for your app in the X developer portal.',
  },
  OAUTH_APPLE_CLIENT_ID: {
    label: 'Apple Services ID',
    setupUrl: 'https://developer.apple.com/account/resources/identifiers/list/serviceId',
    instructions:
      'Apple Developer → Identifiers → create a Services ID with "Sign in with Apple" enabled.',
    example: 'com.example.app.signin',
  },
  OAUTH_APPLE_TEAM_ID: {
    label: 'Apple Team ID',
    setupUrl: 'https://developer.apple.com/account',
    instructions: 'The 10-character Team ID from your Apple Developer membership details.',
    example: 'A1B2C3D4E5',
  },
  OAUTH_APPLE_KEY_ID: {
    label: 'Apple key ID',
    setupUrl: 'https://developer.apple.com/account/resources/authkeys/list',
    instructions:
      'Create a "Sign in with Apple" key under Certificates, Identifiers & Profiles → Keys.',
  },
  OAUTH_APPLE_PRIVATE_KEY: {
    label: 'Apple private key (.p8)',
    setupUrl: 'https://developer.apple.com/account/resources/authkeys/list',
    instructions:
      'Download the .p8 file when creating the key (one-time download) and paste its PEM contents.',
    example: 'contents of AuthKey_ABC123DEF4.p8',
  },
  OAUTH_FITBIT_CLIENT_ID: {
    label: 'Fitbit OAuth client ID',
    setupUrl: 'https://dev.fitbit.com/apps',
    instructions: 'Register an application at dev.fitbit.com and copy the OAuth 2.0 Client ID.',
  },
  OAUTH_FITBIT_CLIENT_SECRET: {
    label: 'Fitbit client secret',
    setupUrl: 'https://dev.fitbit.com/apps',
    instructions: 'Shown on your registered Fitbit application page.',
  },
  OAUTH_OURA_CLIENT_ID: {
    label: 'Oura OAuth client ID',
    setupUrl: 'https://cloud.ouraring.com/oauth/applications',
    instructions: 'Create an OAuth application in the Oura Cloud developer portal.',
  },
  OAUTH_OURA_CLIENT_SECRET: {
    label: 'Oura client secret',
    setupUrl: 'https://cloud.ouraring.com/oauth/applications',
    instructions: 'Shown when creating the OAuth application in Oura Cloud.',
  },

  // --- Email --------------------------------------------------------------
  MAILGUN_API_KEY: {
    label: 'Mailgun API key',
    setupUrl: 'https://app.mailgun.com/settings/api_security',
    instructions: 'Mailgun dashboard → Settings → API Security → create/copy a sending API key.',
  },
  MAILGUN_DOMAIN: {
    label: 'Mailgun sending domain',
    setupUrl: 'https://app.mailgun.com/mg/sending/domains',
    instructions:
      'Add and verify a sending domain in Mailgun (sandbox domains work for testing to authorized recipients).',
    example: 'mg.example.com',
  },
  MAILGUN_INBOUND_REPLAY_WINDOW_SECONDS: {
    label: 'Mailgun inbound replay window',
    instructions:
      'Max age (seconds) of accepted inbound webhook signatures — replay protection; the default is fine.',
    example: '300',
  },
  SENDGRID_API_KEY: {
    label: 'SendGrid API key',
    setupUrl: 'https://app.sendgrid.com/settings/api_keys',
    instructions: 'SendGrid → Settings → API Keys → Create API Key with Mail Send permission.',
    example: 'SG....',
  },

  // --- AWS (SES / S3 / SQS) ------------------------------------------------
  AWS_ACCESS_KEY_ID: {
    label: 'AWS access key ID',
    setupUrl: 'https://console.aws.amazon.com/iam/',
    instructions:
      'Create an IAM user with the needed policy (SES/S3/SQS) and create an access key under Security credentials.',
    example: 'AKIA...',
  },
  AWS_SECRET_ACCESS_KEY: {
    label: 'AWS secret access key',
    setupUrl: 'https://console.aws.amazon.com/iam/',
    instructions: 'Shown once when creating the IAM access key — store it immediately.',
  },
  AWS_REGION: {
    label: 'AWS region',
    instructions: 'The AWS region your resources live in.',
    example: 'us-east-1',
  },
  AWS_SES_REGION: {
    label: 'AWS SES region',
    instructions: 'The AWS region where SES is set up (and out of sandbox for production sending).',
    example: 'us-east-1',
  },
  AWS_SES_INBOUND_TOPIC_ARN: {
    label: 'SES inbound SNS topic ARN',
    setupUrl: 'https://console.aws.amazon.com/ses/',
    instructions: 'ARN of the SNS topic your SES receipt rule publishes inbound mail to.',
    example: 'arn:aws:sns:us-east-1:123456789012:ses-inbound',
  },
  AWS_SNS_SIGNING_CERT_HOSTNAME_SUFFIXES: {
    label: 'SNS signing-cert hostname allowlist',
    instructions:
      'Comma-separated hostname suffixes allowed for SNS signature certificates; the default (.amazonaws.com) is fine.',
    example: '.amazonaws.com',
    default: '.amazonaws.com',
  },
  AWS_S3_BUCKET: {
    label: 'S3 bucket name',
    setupUrl: 'https://console.aws.amazon.com/s3/',
    instructions: 'Name of the S3 bucket to store uploads in (create one in the S3 console).',
    example: 'my-app-uploads',
  },
  AWS_S3_REGION: {
    label: 'S3 bucket region',
    instructions: 'The AWS region of your uploads bucket.',
    example: 'us-east-1',
  },
  AWS_S3_ENDPOINT: {
    label: 'S3 endpoint override',
    instructions:
      "Endpoint URL for S3-compatible stores (MinIO, Cloudflare R2, DigitalOcean Spaces) — molecule's managed storage sets this automatically; leave empty for real AWS S3.",
    example: 'http://localhost:9000',
  },
  AWS_S3_FORCE_PATH_STYLE: {
    label: 'S3 path-style addressing',
    instructions:
      "Set to 'true' for MinIO-style path addressing (http://host/bucket instead of virtual-hosted buckets); set automatically by molecule's managed storage. Leave unset for real AWS S3.",
    example: 'true',
  },
  SQS_ENDPOINT: {
    label: 'SQS endpoint override',
    instructions:
      'Only for LocalStack or a custom SQS-compatible endpoint. Leave unset for real AWS — queues are addressed by NAME (the queue must exist, or pass { autoCreateQueues: true } to createProvider()).',
    example: 'http://localhost:4566',
  },

  // --- Databases / infra (connection strings) ------------------------------
  DATABASE_URL: {
    label: 'PostgreSQL connection URL',
    instructions: 'Postgres connection string; locally, use the Docker Compose default.',
    example: 'postgres://user:pass@localhost:5432/myapp',
    provisioned: true,
  },
  MYSQL_URL: {
    label: 'MySQL connection URL',
    instructions: 'MySQL connection string for your database instance.',
    example: 'mysql://user:pass@localhost:3306/myapp',
  },
  SQLITE_PATH: {
    label: 'SQLite database path',
    instructions: 'Filesystem path of the SQLite database file (created on first run).',
    example: './data/app.db',
  },
  REDIS_URL: {
    label: 'Redis connection URL',
    instructions:
      "Redis connection string (redis:// or rediss:// for TLS). molecule.dev runs a Redis inside your app's container automatically (dev and production) — set this only to use an external/managed Redis; locally, the Docker Compose default works.",
    example: 'redis://localhost:6379',
    provisioned: true,
  },
  MEMCACHED_SERVERS: {
    label: 'Memcached servers',
    instructions: 'Comma-separated host:port list of memcached servers.',
    example: 'localhost:11211',
  },
  RABBITMQ_URL: {
    label: 'RabbitMQ connection URL',
    instructions: 'AMQP connection URL of your RabbitMQ instance.',
    example: 'amqp://guest:guest@localhost:5672',
  },
  MEILISEARCH_URL: {
    label: 'Meilisearch URL',
    instructions:
      "Origin of your Meilisearch instance. molecule.dev runs Meilisearch inside your app's container automatically (dev and production) — set this only to use an external/managed instance; locally, run the official meilisearch Docker container or binary.",
    example: 'http://localhost:7700',
    provisioned: true,
  },
  MEILISEARCH_API_KEY: {
    label: 'Meilisearch API key',
    instructions:
      'The master key (or a scoped API key) you configured when launching Meilisearch (--master-key / MEILI_MASTER_KEY). Optional for keyless local or in-container instances.',
    provisioned: true,
  },
  TYPESENSE_HOST: {
    label: 'Typesense host',
    instructions: 'Hostname of your Typesense node (Typesense Cloud or self-hosted).',
    example: 'localhost',
  },
  TYPESENSE_API_KEY: {
    label: 'Typesense API key',
    instructions: 'The API key you configured when launching Typesense (or from Typesense Cloud).',
  },

  // --- Auth / crypto (auto-generated) --------------------------------------
  JWT_PRIVATE_KEY: {
    label: 'JWT signing key (RSA private)',
    instructions:
      'RSA private key (PEM) for signing JWTs; @molecule/api-jwt also self-generates key files on first boot if unset.',
    generate: 'rsa-keypair-private',
  },
  JWT_PUBLIC_KEY: {
    label: 'JWT verification key (RSA public)',
    instructions: 'RSA public key (PEM) matching JWT_PRIVATE_KEY.',
    generate: 'rsa-keypair-public',
  },
  ENCRYPTION_KEY: {
    label: 'AES-256 encryption key',
    instructions: '64-character hex (256-bit) key for AES-GCM encryption.',
    generate: 'random-hex-32',
  },
  VAPID_PUBLIC_KEY: {
    label: 'Web Push VAPID public key',
    instructions: 'VAPID public key for Web Push.',
    generate: 'vapid-public',
  },
  VAPID_PRIVATE_KEY: {
    label: 'Web Push VAPID private key',
    instructions: 'VAPID private key matching VAPID_PUBLIC_KEY.',
    generate: 'vapid-private',
  },
  VAPID_EMAIL: {
    label: 'Web Push contact email',
    instructions: 'Contact address sent to push services with each request (mailto: form).',
    example: 'mailto:you@example.com',
  },

  // --- Notifications / chat channels ---------------------------------------
  NOTIFICATIONS_SLACK_WEBHOOK_URL: {
    label: 'Slack incoming webhook URL',
    setupUrl: 'https://api.slack.com/apps',
    instructions:
      'Create a Slack app → Incoming Webhooks → Add New Webhook to Workspace, then copy the URL.',
    example: 'https://hooks.slack.com/services/T00000000/B00000000/XXXX',
  },
  SLACK_BOT_TOKEN: {
    label: 'Slack bot token',
    setupUrl: 'https://api.slack.com/apps',
    instructions:
      'Create a Slack app, add bot scopes under OAuth & Permissions, install to your workspace, and copy the Bot User OAuth Token.',
    example: 'xoxb-...',
  },
  SLACK_SIGNING_SECRET: {
    label: 'Slack signing secret',
    setupUrl: 'https://api.slack.com/apps',
    instructions: 'Your Slack app → Basic Information → App Credentials → Signing Secret.',
  },
  NOTIFICATIONS_WEBHOOK_URL: {
    label: 'Notification webhook URL',
    instructions: 'HTTPS endpoint that receives notification POSTs from your app.',
    example: 'https://example.com/hooks/notify',
  },
  NOTIFICATIONS_WEBHOOK_SECRET: {
    label: 'Notification webhook signing secret',
    instructions:
      'Shared secret used to HMAC-sign webhook payloads so the receiver can verify them; share it with the receiving service.',
    generate: 'random-hex-32',
  },
  CHANNEL_DISCORD_BOT_TOKEN: {
    label: 'Discord bot token',
    setupUrl: 'https://discord.com/developers/applications',
    instructions: 'Create an application → Bot → Reset Token, then copy the bot token.',
  },
  CHANNEL_DISCORD_PUBLIC_KEY: {
    label: 'Discord public key',
    setupUrl: 'https://discord.com/developers/applications',
    instructions:
      'Your application → General Information → Public Key (verifies interaction signatures).',
  },
  CHANNEL_TELEGRAM_BOT_TOKEN: {
    label: 'Telegram bot token',
    setupUrl: 'https://t.me/BotFather',
    instructions: 'Create a bot with @BotFather in Telegram (/newbot) and copy the token.',
    example: '123456789:ABC-DEF...',
  },
  CHANNEL_TELEGRAM_WEBHOOK_SECRET: {
    label: 'Telegram webhook secret',
    instructions: 'Secret token passed to setWebhook so Telegram signs updates.',
    generate: 'random-hex-32',
  },
  CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN: {
    label: 'Messenger page access token',
    setupUrl: 'https://developers.facebook.com/apps',
    instructions:
      'Create a Meta app with the Messenger product and generate a Page access token for your page.',
  },
  CHANNEL_MESSENGER_APP_SECRET: {
    label: 'Meta app secret',
    setupUrl: 'https://developers.facebook.com/apps',
    instructions: 'Your Meta app → App settings → Basic → App secret.',
  },
  CHANNEL_WHATSAPP_ACCESS_TOKEN: {
    label: 'WhatsApp access token',
    setupUrl: 'https://developers.facebook.com/apps',
    instructions:
      'Create a Meta app with the WhatsApp product and generate a permanent access token (System User).',
  },
  CHANNEL_WHATSAPP_PHONE_NUMBER_ID: {
    label: 'WhatsApp phone number ID',
    setupUrl: 'https://developers.facebook.com/apps',
    instructions: 'WhatsApp → API Setup → Phone number ID (not the phone number itself).',
  },
  CHANNEL_WHATSAPP_APP_SECRET: {
    label: 'Meta app secret (WhatsApp)',
    setupUrl: 'https://developers.facebook.com/apps',
    instructions:
      'Your Meta app → App settings → Basic → App secret (verifies webhook signatures).',
  },

  // --- SMS ------------------------------------------------------------------
  TWILIO_ACCOUNT_SID: {
    label: 'Twilio account SID',
    setupUrl: 'https://console.twilio.com/',
    instructions: 'Copy the Account SID from the Twilio Console dashboard.',
    example: 'AC...',
  },
  TWILIO_AUTH_TOKEN: {
    label: 'Twilio auth token',
    setupUrl: 'https://console.twilio.com/',
    instructions: 'Copy the Auth Token from the Twilio Console dashboard.',
  },
  TWILIO_FROM_NUMBER: {
    label: 'Twilio from number',
    setupUrl: 'https://console.twilio.com/us1/develop/phone-numbers/manage/incoming',
    instructions: 'Buy or verify a phone number in Twilio and use it in E.164 format.',
    example: '+15551234567',
  },

  // --- Maps / geo -----------------------------------------------------------
  GOOGLE_MAPS_API_KEY: {
    label: 'Google Maps API key',
    setupUrl: 'https://console.cloud.google.com/google/maps-apis/credentials',
    instructions:
      'Enable the Maps/Geocoding APIs in Google Cloud Console and create an API key (restrict it to those APIs).',
    example: 'AIza...',
  },
  MAPBOX_ACCESS_TOKEN: {
    label: 'Mapbox access token',
    setupUrl: 'https://account.mapbox.com/access-tokens/',
    instructions:
      'Copy the default public token (or create a scoped one) from your Mapbox account.',
    example: 'pk.ey...',
  },

  // --- Market / external data -----------------------------------------------
  COINMARKETCAP_API_KEY: {
    label: 'CoinMarketCap API key',
    setupUrl: 'https://pro.coinmarketcap.com/account',
    instructions: 'Sign up for the CoinMarketCap API (free tier available) and copy your key.',
  },
  ALPHA_VANTAGE_API_KEY: {
    label: 'Alpha Vantage API key',
    setupUrl: 'https://www.alphavantage.co/support/#api-key',
    instructions: 'Request a free API key on the Alpha Vantage site.',
  },
  IEX_API_KEY: {
    label: 'IEX Cloud API token',
    setupUrl: 'https://iexcloud.io/',
    instructions: 'Copy an API token from the IEX Cloud console (service availability may vary).',
    example: 'pk_...',
  },
  POLYGON_API_KEY: {
    label: 'Polygon.io API key',
    setupUrl: 'https://polygon.io/dashboard/api-keys',
    instructions: 'Copy your API key from the Polygon.io dashboard.',
  },
  OPENWEATHER_API_KEY: {
    label: 'OpenWeather API key',
    setupUrl: 'https://home.openweathermap.org/api_keys',
    instructions: 'Sign up at OpenWeatherMap (free tier available) and copy your API key.',
  },
  OPENEXCHANGE_APP_ID: {
    label: 'Open Exchange Rates app ID',
    setupUrl: 'https://openexchangerates.org/account/app-ids',
    instructions: 'Sign up (free tier available) and copy your App ID.',
  },

  // --- Travel ----------------------------------------------------------------
  AMADEUS_CLIENT_ID: {
    label: 'Amadeus API key',
    setupUrl: 'https://developers.amadeus.com/my-apps',
    instructions: 'Create an app in Amadeus for Developers (Self-Service) and copy the API Key.',
  },
  AMADEUS_CLIENT_SECRET: {
    label: 'Amadeus API secret',
    setupUrl: 'https://developers.amadeus.com/my-apps',
    instructions: 'Copy the API Secret from your Amadeus app page.',
  },

  // --- Shipping ---------------------------------------------------------------
  EASYPOST_API_KEY: {
    label: 'EasyPost API key',
    setupUrl: 'https://app.easypost.com/account/api-keys',
    instructions: 'Copy the test or production API key from EasyPost → Account → API Keys.',
    example: 'EZAK...',
  },
  SHIPPO_API_KEY: {
    label: 'Shippo API token',
    setupUrl: 'https://apps.goshippo.com/settings/api',
    instructions: 'Copy the test or live token from Shippo → Settings → API.',
    example: 'shippo_test_...',
  },

  // --- KYC / e-sign ------------------------------------------------------------
  HELLOSIGN_API_KEY: {
    label: 'Dropbox Sign (HelloSign) API key',
    setupUrl: 'https://app.hellosign.com/home/myAccount#api',
    instructions: 'Generate an API key in Dropbox Sign → Account settings → API.',
  },

  // --- Video ---------------------------------------------------------------------
  ZOOM_ACCOUNT_ID: {
    label: 'Zoom account ID',
    setupUrl: 'https://marketplace.zoom.us/',
    instructions:
      'Create a Server-to-Server OAuth app in the Zoom App Marketplace; copy the Account ID.',
  },
  ZOOM_CLIENT_ID: {
    label: 'Zoom client ID',
    setupUrl: 'https://marketplace.zoom.us/',
    instructions: 'From your Server-to-Server OAuth app credentials.',
  },
  ZOOM_CLIENT_SECRET: {
    label: 'Zoom client secret',
    setupUrl: 'https://marketplace.zoom.us/',
    instructions: 'From your Server-to-Server OAuth app credentials.',
  },
  DAILY_CO_API_KEY: {
    label: 'Daily.co API key',
    setupUrl: 'https://dashboard.daily.co/developers',
    instructions: 'Copy the API key from the Daily dashboard → Developers.',
  },
  LIVEKIT_URL: {
    label: 'LiveKit server URL',
    setupUrl: 'https://cloud.livekit.io/',
    instructions: 'Your LiveKit Cloud project URL (or self-hosted wss:// URL).',
    example: 'wss://your-app.livekit.cloud',
  },
  LIVEKIT_API_KEY: {
    label: 'LiveKit API key',
    setupUrl: 'https://cloud.livekit.io/',
    instructions: 'LiveKit Cloud → project → Settings → Keys.',
  },
  LIVEKIT_API_SECRET: {
    label: 'LiveKit API secret',
    setupUrl: 'https://cloud.livekit.io/',
    instructions: 'Shown when creating the key in LiveKit Cloud.',
  },

  // --- Secrets managers / platform-internal --------------------------------------
  DOPPLER_TOKEN: {
    label: 'Doppler service token',
    setupUrl: 'https://dashboard.doppler.com/',
    instructions:
      'Create a service token for your project config (Project → Access → Service Tokens).',
    example: 'dp.st....',
  },
  MOLECULE_VAULT_TOKEN: {
    label: 'molecule.dev vault token',
    provisioned: true,
  },
  MOLECULE_APP_ID: {
    label: 'molecule.dev app ID',
    provisioned: true,
  },
  MOLECULE_VAULT_URL: {
    label: 'molecule.dev vault URL',
    provisioned: true,
  },
  // --- Error tracking -------------------------------------------------------
  SENTRY_DSN: {
    label: 'Sentry DSN',
    setupUrl: 'https://sentry.io/settings/projects/',
    instructions:
      'Sentry → Settings → Projects → your project → Client Keys (DSN); copy the DSN. Until it is set the bond is a no-op (no events are sent).',
    example: 'https://examplePublicKey@o0.ingest.sentry.io/0',
  },
  SENTRY_ENVIRONMENT: {
    label: 'Sentry environment',
    instructions:
      'Environment tag applied to every event (e.g. production, staging); defaults to NODE_ENV when unset.',
    example: 'production',
  },
  SENTRY_TRACES_SAMPLE_RATE: {
    label: 'Sentry traces sample rate',
    instructions:
      'Fraction between 0 and 1 of transactions sampled for performance tracing (e.g. 0.1 = 10%); unset disables tracing.',
    example: '0.1',
  },
  MOLECULE_ACTIVITY_URL: {
    label: 'molecule.dev activity capture URL',
    instructions:
      'Endpoint for captured side effects (emails/SMS/webhooks) in molecule.dev sandboxes.',
    provisioned: true,
  },
}

const raw = JSON.parse(readFileSync(registryPath, 'utf-8'))
const check = process.argv.includes('--check')

const missing = new Set()
let touched = 0
let drift = 0

for (const [pkgName, pkg] of Object.entries(raw.packages)) {
  if (!Array.isArray(pkg.secrets) || pkg.secrets.length === 0) continue
  for (const secret of pkg.secrets) {
    const meta = SECRET_META[secret.name]
    if (!meta) {
      missing.add(`${secret.name} (${pkgName})`)
      continue
    }
    const enriched = { ...secret }
    for (const field of [
      'label',
      'setupUrl',
      'instructions',
      'example',
      'generate',
      'provisioned',
    ]) {
      if (meta[field] !== undefined) enriched[field] = meta[field]
      else delete enriched[field]
    }
    if (JSON.stringify(enriched) !== JSON.stringify(secret)) {
      drift++
      if (!check) {
        Object.keys(secret).forEach((k) => delete secret[k])
        Object.assign(secret, enriched)
      }
    }
    touched++
  }
}

if (missing.size) {
  console.error('Secrets with no enrichment metadata (add them to SECRET_META):')
  for (const name of [...missing].sort()) console.error('  - ' + name)
  process.exit(1)
}

if (check) {
  if (drift) {
    console.error(
      `${drift} secret entr${drift === 1 ? 'y' : 'ies'} out of sync — run: node scripts/enrich-registry-secrets.mjs`,
    )
    process.exit(1)
  }
  console.log(`OK — ${touched} secret entries enriched and in sync.`)
} else {
  writeFileSync(registryPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
  console.log(`Enriched ${touched} secret entries (${drift} updated) across registry.json.`)
}
