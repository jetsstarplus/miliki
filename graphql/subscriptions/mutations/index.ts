import { gql } from '@apollo/client';

export const SELECT_SUBSCRIPTION_PLAN_MUTATION = gql`
  mutation SelectSubscriptionPlan($companyId: UUID!, $planId: UUID!, $billingCycle: String) {
    selectSubscriptionPlan(companyId: $companyId, planId: $planId, billingCycle: $billingCycle) {
      success
      message
      requiresGettingStarted
      gettingStartedData
      subscription {
        id
        status
        billingCycle
        plan { id name planType }
      }
    }
  }
`;

export const SKIP_GETTING_STARTED_MUTATION = gql`
  mutation SkipGettingStarted($companyId: UUID!) {
    skipGettingStarted(companyId: $companyId) {
      success
      message
    }
  }
`;

export const ACCEPT_COMPANY_INVITATION_MUTATION = gql`
  mutation AcceptCompanyInvitation($invitationToken: UUID!) {
    acceptCompanyInvitation(invitationToken: $invitationToken) {
      success
      message
      membership {
        id
        role
        status
        company { id name companyType status email }
      }
    }
  }
`;
