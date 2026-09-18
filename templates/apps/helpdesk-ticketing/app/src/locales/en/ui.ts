/**
 * Default English translations.
 *
 * Add additional locales by creating new files (e.g., es.ts, fr.ts)
 * and registering them with the i18n provider in config.ts.
 */

import type { UiTranslations } from '../types.js'

export const ui: UiTranslations = {
  'common.notAvailable': '—',
  'common.timeAgo.minutes': '{{minutes}}m ago',
  'common.timeAgo.hours': '{{hours}}h ago',
  'common.timeAgo.days': '{{days}}d ago',
  'common.statusOnHold': 'On hold',
  'common.time.hours': '{{value}}h',
  'ticketsPagination.prev': 'Previous page',
  'ticketsPagination.next': 'Next page',
  'ticketsTable.sla.closed': 'Closed',
  'ticketsTable.sla.onTime': 'On time',
  'ticketsTable.sla.minutesLeft': '{{m}}m left',
  'ticketsTable.sla.hoursLeft': '{{h}}h {{m}}m',
  'ticketsTable.sla.expired': 'EXPIRED',
  'demoTicket.thread.customer':
    "I reset my password yesterday and now I can't log into the billing portal. Can you help?",
  'demoTicket.article.loginTitle': 'Troubleshooting Login Issues',
  'demoTicket.plan.enterprise': 'Enterprise',
  'knowledgeCategoryCard.accountBillingTitle': 'Account & Billing',
  'knowledgeCategoryCard.apiIntegrationsTitle': 'API & Integrations',
  'ticketsFilterBar.filterByAssignee': 'Filter by assignee',
  'ticketsFilterBar.dateRangeDemoHint': 'Date range filtering is not enabled in this demo build.',
}
