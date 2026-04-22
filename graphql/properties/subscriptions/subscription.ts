import { gql } from '@apollo/client';

export const SUBSCRIPTION_PAYMENT_UPDATES = gql`
  subscription SubscriptionPaymentUpdates($companyId: UUID!, $paymentId: ID) {
    subscriptionPaymentUpdates(companyId: $companyId, paymentId: $paymentId) {
      action
      payment {
        id
        status
        failureReason
        amount
      }
    }
  }
`;
