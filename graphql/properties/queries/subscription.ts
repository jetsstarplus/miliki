
import { gql } from '@apollo/client';

export const SUBSCRIPTION_PAYMENT_CONTEXT = gql`
  query SubscriptionPaymentContext($companyId: ID!, $paymentFor: String) {
    subscriptionInitiatePaymentData(companyId: $companyId, paymentFor: $paymentFor)
  }
`;

export const PAYMENT_STATUS = gql`
  query PaymentStatus($paymentId: Int!) {
    paymentStatus(paymentId: $paymentId) {
      success
      payment {
        id
        status
        failure_reason
        sms_balance
        whatsapp_balance
      }
    }
  }
`;
