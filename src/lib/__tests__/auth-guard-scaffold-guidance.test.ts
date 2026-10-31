import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const APP_GUARD = join(MLCL_ROOT, 'templates/app/react/components/AuthGuard.tsx.tpl')
const APP_TEMPLATES = join(MLCL_ROOT, 'templates/apps')

/** The flagship apps whose guard header must match the canonical source. */
const EXPECTED_FLAGSHIPS = `
3d-model-viewer
accounting-invoicing
ai-agent-playground
ai-chatbot-builder
ai-code-review-tool
ai-content-moderator
ai-customer-service-bot
ai-data-analyst
ai-document-processor
ai-email-composer
ai-hotel-receptionist
ai-image-generator
ai-meeting-notes
ai-study-buddy
ai-translation-hub
ai-travel-agent
ai-voice-assistant
ai-workflow-automator
ai-writing-studio
animation-tool
api-documentation
api-testing-tool
applicant-tracking
auction-platform
banking-dashboard
bill-split
book-tracker
budget-planner
calorie-counter
ci-cd-dashboard
clipboard-manager
cloud-file-manager
contract-management
coupon-deals-platform
course-marketplace
crowdfunding
crypto-tracker
customer-support-chat
daily-puzzle
database-admin
delivery-tracking
design-canvas
digital-goods-store
discussion-boards
document-collaboration
donor-management
email-client
employee-onboarding
energy-monitoring
error-tracker
event-ticketing
expense-report
family-tree
feature-flag-manager
feedback-roadmap
field-service
flashcard-app
fleet-management
flight-search
food-delivery
forum
grocery-delivery
habit-tracker
health-records
hotel-booking
hr-management
internal-announcements
internal-knowledge-base
inventory-management
investment-portfolio
invoice-billing
iot-device-manager
itinerary-planner
job-board
kanban-board
language-learning
link-aggregator
log-viewer
meal-planner
medication-reminder
meditation-app
mental-health-journal
messaging-app
mind-mapping
multi-vendor-marketplace
music-daw
music-streaming
news-aggregator
note-taking
okr-goal-tracking
oncall-management
password-manager
payroll-manager
pet-care
photo-editor
photo-sharing
podcast
presentation-builder
price-comparison
property-management
quiz-platform
rag-knowledge-base
rental-marketplace
restaurant-ordering
restaurant-review
screen-sharing
secrets-manager
shift-scheduling
sleep-tracker
smart-home-dashboard
social-media
sports-league
spreadsheet
status-page
student-portal
subscription-box
survey-feedback-tool
telemedicine
time-tracking
to-do-list
transit-tracker
travel-booking
tutoring-marketplace
venue-booking
video-conferencing
video-editor
video-streaming
virtual-classroom
voting-polling
warehouse-fulfillment
weather-dashboard
webhook-manager
wedding-planner
whiteboard
wiki
workout-tracker
writing-tool
`
  .trim()
  .split('\n')
  .sort()

/** Every flagship copy of the scaffold guard, plus the standard React source. */
function guardSources(): string[] {
  const flagshipGuards = readdirSync(APP_TEMPLATES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: join(APP_TEMPLATES, entry.name, 'app/src/components/AuthGuard.tsx'),
    }))
    .filter((entry) => existsSync(entry.path))
    .sort((a, b) => a.name.localeCompare(b.name))
  expect(flagshipGuards.map((entry) => entry.name)).toEqual(EXPECTED_FLAGSHIPS)
  return [APP_GUARD, ...flagshipGuards.map((entry) => entry.path)]
}

/** The leading JSDoc contract, excluding an app's custom guard body. */
function headerOf(path: string): string {
  const source = readFileSync(path, 'utf8')
  const header = source.match(/^\/\*\*[\s\S]*?\*\//)?.[0]
  if (!header) throw new Error(`${path} has no leading AuthGuard contract`)
  return header
}

describe('scaffold AuthGuard restore guidance', () => {
  it('keeps every expected guard header identical to the canonical contract', () => {
    const canonical = headerOf(APP_GUARD)
    for (const path of guardSources()) {
      expect(headerOf(path), path).toBe(canonical)
    }
  })
})
