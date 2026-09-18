/**
 * Resource-payment plans + paymentRecords bond setup
 *
 * Wires @molecule/api-resource-payment's planService and paymentRecordService
 * as the singleton 'plans' and 'paymentRecords' bonds. Required by
 * @molecule/api-resource-user's handlePaymentNotification webhook handler.
 */

import { bond } from '@molecule/api-bond'
import { paymentRecordService, planService } from '@molecule/api-resource-payment'

export function setupResourcePaymentPlans(): void {
  bond('plans', planService)
  bond('paymentRecords', paymentRecordService)
}
