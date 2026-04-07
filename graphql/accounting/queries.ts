import { gql } from '@apollo/client';

/**
 * Accounting (Section 17)
 */

export const ACCOUNTS_QUERY = gql`
  query Accounts($companyId: UUID!, $isActive: Boolean, $search: String) {
    accounts(companyId: $companyId, isActive: $isActive, search: $search) {
      id
      code
      name
      accountType
      isActive
      cashAccount
    }
  }
`;

export const JOURNAL_ENTRIES_QUERY = gql`
  query JournalEntries($companyId: UUID!, $status: String, $entryType: String) {
    journalEntries(companyId: $companyId, status: $status, entryType: $entryType) {
      id
      entryNumber
      entryDate
      entryType
      status
      description
    }
  }
`;

export const TENANT_CREDITS_REFUNDS_QUERY = gql`
  query TenantCreditsRefunds($tenantId: Int, $companyId: UUID!) {
    tenantCredits(tenantId: $tenantId, companyId: $companyId) {
      id
      amount
      description
      creditDate
    }
    tenantRefunds(tenantId: $tenantId, companyId: $companyId) {
      id
      amount
      description
      refundDate
    }
  }
`;
