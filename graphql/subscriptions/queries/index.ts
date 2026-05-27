import { gql } from '@apollo/client';

export const SUBSCRIPTION_PLANS_QUERY = gql`
  query SubscriptionPlans {
    subscriptionPlans {
      edges {
        node {
          id
          name
          description
          planType
          priceMonthly
          priceQuarterly
          priceAnnually
          maxUsers
          maxStorageGb
          maxTransactionsPerMonth
          maxPropertiesPerMonth
          maxUnitsPerMonth
          maxTenants
          isActive
        }
      }
    }
  }
`;

export const SUBSCRIPTION_STATUS_QUERY = gql`
  query SubscriptionStatus($companyId: ID!) {
    subscriptionStatus(companyId: $companyId) {
      subscription {
        id
        status
        billingCycle
        nextPaymentDate
        plan { id name planType }
      }
      metrics {
        unitsCount
        propertiesCount
        tenantsCount
        activeUsersCount
      }
      amounts {
        baseAmount
        finalAmount
        discountAmount
        discountName
      }
    }
  }
`;

export const GETTING_STARTED_QUERY = gql`
  query GettingStarted($companyId: UUID!) {
    subscriptionGettingStartedData(companyId: $companyId)
  }
`;

export const COMPANY_INVITATIONS_QUERY = gql`
  query MyCompanyInvitations {
    companyInvitations(isAccepted: false, isDeclined: false) {
      edges {
        node {
          id
          invitationToken
          email
          expiresAt
          company { id name }
          role
        }
      }
    }
  }
`;

export const DASHBOARD_COMPANY_CONTEXT_QUERY = gql`
  query DashboardCompanyContext {
    dashboard {
      companyContext {
        showSetupGuide
        showResumeGuide
        isTrial
        trialEndDate
        hasSubscription
      }
    }
  }
`;
