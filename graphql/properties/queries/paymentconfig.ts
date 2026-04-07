import { gql } from '@apollo/client';

/**
 * Payment Configuration (Section 18)
 */

export const PAYMENT_CONFIG_DASHBOARD_QUERY = gql`
  query PaymentConfigDashboard {
    paymentConfigDashboardData
  }
`;

/**
 * Tenant Payment Link - public, no auth (Section 19)
 */

export const TENANT_PAYMENT_LINK_QUERY = gql`
  query TenantPaymentLinkData($token: String!) {
    tenantPaymentLinkData(token: $token)
  }
`;
