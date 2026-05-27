import { gql } from '@apollo/client';

export const CREATE_ACCOUNT = gql`
  mutation CreateAccount(
    $companyId: UUID!
    $name: String!
    $code: String!
    $accountType: String!
    $description: String
    $parentId: UUID
    $isActive: Boolean
    $cashAccount: Boolean
  ) {
    createAccount(
      companyId: $companyId
      name: $name
      code: $code
      accountType: $accountType
      description: $description
      parentId: $parentId
      isActive: $isActive
      cashAccount: $cashAccount
    ) {
      success
      message
      account {
        id
      }
    }
  }
`;

export const UPDATE_ACCOUNT = gql`
  mutation UpdateAccount($input: UpdateAccountInput!) {
    updateAccount(input: $input) {
      success
      errors {
        messages
      }
    }
  }
`;

export const CREATE_JOURNAL_ENTRY = gql`
  mutation CreateJournalEntry(
    $companyId: UUID!
    $entryNumber: String!
    $entryDate: Date!
    $description: String!
    $entryType: String
    $status: String
    $reference: String
    $paymentTransactionId: UUID
    $refundId: UUID
  ) {
    createJournalEntry(
      companyId: $companyId
      entryNumber: $entryNumber
      entryDate: $entryDate
      description: $description
      entryType: $entryType
      status: $status
      reference: $reference
      paymentTransactionId: $paymentTransactionId
      refundId: $refundId
    ) {
      success
      message
      journalEntry {
        id
        status
      }
    }
  }
`;

export const ADD_JOURNAL_LINE = gql`
  mutation AddJournalLine(
    $journalEntryId: UUID!
    $accountId: UUID!
    $debitCredit: String!
    $amount: Decimal!
    $description: String
    $memo: String
    $debitAmount: Decimal
    $creditAmount: Decimal
  ) {
    addJournalLine(
      journalEntryId: $journalEntryId
      accountId: $accountId
      debitCredit: $debitCredit
      amount: $amount
      description: $description
      memo: $memo
      debitAmount: $debitAmount
      creditAmount: $creditAmount
    ) {
      success
      message
      line {
        id
      }
    }
  }
`;

export const POST_JOURNAL_ENTRY = gql`
  mutation PostJournalEntry($journalEntryId: UUID!) {
    postJournalEntry(journalEntryId: $journalEntryId) {
      success
      message
      journalEntry {
        id
        status
      }
    }
  }
`;

export const VOID_JOURNAL_ENTRY = gql`
  mutation VoidJournalEntry($journalEntryId: ID!) {
    voidJournalEntry(journalEntryId: $journalEntryId) {
      success
      message
      journalEntry {
        id
        status
      }
    }
  }
`;

export const DELETE_JOURNAL_ENTRY = gql`
  mutation DeleteJournalEntry($journalEntryId: ID!) {
    deleteJournalEntry(journalEntryId: $journalEntryId) {
      success
      message
      journalEntryId
    }
  }
`;

export const CREATE_TENANT_CREDIT = gql`
  mutation CreateTenantCredit(
    $companyId: UUID!
    $tenantId: Int!
    $creditType: String!
    $creditNumber: String!
    $creditDate: Date!
    $amount: Decimal!
    $description: String
    $buildingId: Int
    $unitId: Int
  ) {
    createTenantCredit(
      companyId: $companyId
      tenantId: $tenantId
      creditType: $creditType
      creditNumber: $creditNumber
      creditDate: $creditDate
      amount: $amount
      description: $description
      buildingId: $buildingId
      unitId: $unitId
    ) {
      success
      message
      credit {
        id
        status
      }
    }
  }
`;

export const CREATE_TENANT_REFUND = gql`
  mutation CreateTenantRefund(
    $companyId: UUID!
    $tenantId: Int!
    $refundType: String!
    $refundNumber: String!
    $refundDate: Date!
    $amount: Decimal!
    $buildingId: Int
    $unitId: Int
    $status: String
    $refundMethod: String
    $refundReference: String
  ) {
    createTenantRefund(
      companyId: $companyId
      tenantId: $tenantId
      refundType: $refundType
      refundNumber: $refundNumber
      refundDate: $refundDate
      amount: $amount
      buildingId: $buildingId
      unitId: $unitId
      status: $status
      refundMethod: $refundMethod
      refundReference: $refundReference
    ) {
      success
      message
      refund {
        id
        status
      }
    }
  }
`;

export const APPROVE_TENANT_REFUND = gql`
  mutation ApproveTenantRefund($refundId: ID!) {
    approveTenantRefund(refundId: $refundId) {
      success
      message
      refund {
        id
        status
        approvedAt
      }
    }
  }
`;

export const COMPLETE_TENANT_REFUND = gql`
  mutation CompleteTenantRefund($refundId: ID!) {
    completeTenantRefund(refundId: $refundId) {
      success
      message
      refund {
        id
        status
        completedAt
      }
    }
  }
`;

export const CANCEL_TENANT_REFUND = gql`
  mutation CancelTenantRefund($refundId: ID!) {
    cancelTenantRefund(refundId: $refundId) {
      success
      message
      refund {
        id
        status
      }
    }
  }
`;

export const UPDATE_ACCOUNTING_SETTINGS = gql`
  mutation UpdateAccountingSettings(
    $companyId: ID!
    $accountingMethod: String
    $fiscalYearStartMonth: Int
    $fiscalYearStartDay: Int
    $periodFrequency: String
  ) {
    updateAccountingSettings(
      companyId: $companyId
      accountingMethod: $accountingMethod
      fiscalYearStartMonth: $fiscalYearStartMonth
      fiscalYearStartDay: $fiscalYearStartDay
      periodFrequency: $periodFrequency
    ) {
      success
      message
    }
  }
`;

export const CREATE_ACCOUNTING_PERIOD = gql`
  mutation CreateAccountingPeriod($companyId: ID!, $name: String!, $startDate: Date!, $endDate: Date!) {
    createAccountingPeriod(companyId: $companyId, name: $name, startDate: $startDate, endDate: $endDate) {
      success
      message
    }
  }
`;

export const GENERATE_ACCOUNTING_PERIODS = gql`
  mutation GenerateAccountingPeriods($companyId: ID!, $year: Int!) {
    generateAccountingPeriods(companyId: $companyId, year: $year) {
      success
      message
      periodsCreated
    }
  }
`;

export const CLOSE_ACCOUNTING_PERIOD = gql`
  mutation CloseAccountingPeriod($periodId: ID!) {
    closeAccountingPeriod(periodId: $periodId) {
      success
      message
      periodId
      closingEntryId
    }
  }
`;

export const CREATE_MANUAL_TRANSFER = gql`
  mutation CreateManualTransfer(
    $companyId: ID!
    $fromAccountId: ID!
    $toAccountId: ID!
    $amount: Decimal!
    $description: String!
    $reference: String
    $autoPost: Boolean
  ) {
    createManualTransfer(
      companyId: $companyId
      fromAccountId: $fromAccountId
      toAccountId: $toAccountId
      amount: $amount
      description: $description
      reference: $reference
      autoPost: $autoPost
    ) {
      success
      message
      journalEntry {
        id
        entryNumber
        status
      }
    }
  }
`;

export const SETUP_DEFAULT_ACCOUNTS = gql`
  mutation SetupDefaultAccounts($companyId: ID!) {
    setupDefaultAccounts(companyId: $companyId) {
      success
      message
      createdCount
    }
  }
`;
