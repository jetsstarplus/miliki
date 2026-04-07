import { gql } from '@apollo/client';

/**
 * Subscription Management (Section 3)
 */

export const SUBSCRIPTION_STATUS_QUERY = gql`
  query SubscriptionStatus($companyId: UUID!) {
    subscriptionStatus(companyId: $companyId) {
      subscription { id status billingCycle nextBillingDate }
      metrics {
        activeUnitsCount
        activeBuildingsCount
        activeTenantsCount
        activeUsersCount
      }
      usageStats
      hasStandingOrder
      amounts { baseAmount finalAmount discountAmount discountName }
    }
  }
`;

export const SUBSCRIPTION_PLANS_QUERY = gql`
  query SubscriptionPlans {
    subscriptionPlans {
      edges {
        node {
          id
          name
          priceMonthly
          priceAnnually
          maxUnits
          maxProperties
          maxTenants
          features
          isActive
        }
      }
    }
  }
`;

export const PAYMENT_HISTORY_QUERY = gql`
  query PaymentHistory($companyId: UUID!, $limit: Int) {
    paymentHistory(companyId: $companyId, limit: $limit) {
      id
      amount
      status
      createdAt
      reference
    }
  }
`;

export const MESSAGING_BALANCES_QUERY = gql`
  query MessagingBalances($companyId: UUID!) {
    messagingBalances(companyId: $companyId) {
      smsBalance
      smsCreditsBalance
      smsCreditValue
      smsCostPerSms
      whatsappBalance
      whatsappCreditsBalance
      whatsappCreditValue
    }
  }
`;

export const SUBSCRIPTION_INITIATE_PAYMENT_DATA_QUERY = gql`
  query PaymentContext($companyId: UUID!, $paymentFor: String) {
    subscriptionInitiatePaymentData(companyId: $companyId, paymentFor: $paymentFor)
  }
`;

export const GETTING_STARTED_QUERY = gql`
  query GettingStarted($companyId: UUID!) {
    subscriptionGettingStartedData(companyId: $companyId)
  }
`;
