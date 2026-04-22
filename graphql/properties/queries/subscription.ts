
import { gql } from '@apollo/client';

export const SUBSCRIPTION_PAYMENT_CONTEXT = gql`
  query SubscriptionPaymentContext($companyId: ID!, $paymentFor: String) {
    subscriptionInitiatePaymentData(companyId: $companyId, paymentFor: $paymentFor)
  }
`;

export const PAYMENT_STATUS = gql`
  query PaymentStatus($paymentId: ID!) {
    paymentStatus(paymentId: $paymentId)
  }
`;

export const MESSAGING_BALANCES = gql`
  query MessagingBalances($companyId: ID!) {
    messagingBalances(companyId: $companyId) {
      smsBalance
      whatsappBalance
      smsTopupRate
      whatsappTopupRate
    }
  }
`;

export const SUBSCRIPTION_STATUS = gql`
  query SubscriptionStatus($companyId: ID!) {
    subscriptionStatus(companyId: $companyId) {
      subscription {
        id
        status
        currentPeriodEnd
        plan {
          id
          name
          planType
        }
      }
    }
  }
`;
