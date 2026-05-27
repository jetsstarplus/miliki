import { gql } from '@apollo/client';

export const ACCOUNTING_MENU_DATA = gql`
  query AccountingMenuData($companyId: ID!) {
    accountingMenuData(companyId: $companyId)
  }
`;

export const ACCOUNTING_TEMPLATE_WORKFLOWS = gql`
  query AccountingTemplateWorkflows($companyId: ID!) {
    accountingTemplateWorkflows(companyId: $companyId)
  }
`;

export const ACCOUNTING_DASHBOARD_PAGE_DATA = gql`
  query AccountingDashboardPageData($companyId: ID!) {
    accountingDashboardPageData(companyId: $companyId)
  }
`;

export const CHART_OF_ACCOUNTS_PAGE_DATA = gql`
  query ChartOfAccountsPageData($companyId: ID!, $accountType: String, $search: String, $isActive: Boolean) {
    chartOfAccountsPageData(
      companyId: $companyId
      accountType: $accountType
      search: $search
      isActive: $isActive
    )
  }
`;

export const ACCOUNT_FORM_PAGE_DATA = gql`
  query AccountFormPageData($companyId: ID!, $accountId: ID) {
    accountFormPageData(companyId: $companyId, accountId: $accountId)
  }
`;

export const ACCOUNT_DETAIL_PAGE_DATA = gql`
  query AccountDetailPageData($accountId: ID!) {
    accountDetailPageData(accountId: $accountId)
  }
`;

export const JOURNAL_ENTRIES_PAGE_DATA = gql`
  query JournalEntriesPageData($companyId: ID!, $status: String, $entryType: String) {
    journalEntriesPageData(companyId: $companyId, status: $status, entryType: $entryType)
  }
`;

export const JOURNAL_ENTRY_FORM_PAGE_DATA = gql`
  query JournalEntryFormPageData($companyId: ID!, $journalEntryId: ID) {
    journalEntryFormPageData(companyId: $companyId, journalEntryId: $journalEntryId)
  }
`;

export const JOURNAL_ENTRY_DETAIL_PAGE_DATA = gql`
  query JournalEntryDetailPageData($journalEntryId: ID!) {
    journalEntryDetailPageData(journalEntryId: $journalEntryId)
  }
`;

export const JOURNAL_LINES_PAGE_DATA = gql`
  query JournalLinesPageData($companyId: ID!, $accountId: ID, $entryType: String, $status: String) {
    journalLinesPageData(companyId: $companyId, accountId: $accountId, entryType: $entryType, status: $status)
  }
`;

export const TENANT_CREDITS_PAGE_DATA = gql`
  query TenantCreditsPageData($companyId: ID!, $status: String, $search: String) {
    tenantCreditsPageData(companyId: $companyId, status: $status, search: $search)
  }
`;

export const TENANT_CREDIT_DETAIL_PAGE_DATA = gql`
  query TenantCreditDetailPageData($creditId: ID!) {
    tenantCreditDetailPageData(creditId: $creditId)
  }
`;

export const TENANT_REFUNDS_PAGE_DATA = gql`
  query TenantRefundsPageData($companyId: ID!, $status: String, $search: String) {
    tenantRefundsPageData(companyId: $companyId, status: $status, search: $search)
  }
`;

export const TENANT_REFUND_FORM_PAGE_DATA = gql`
  query TenantRefundFormPageData($companyId: ID!) {
    tenantRefundFormPageData(companyId: $companyId)
  }
`;

export const TENANT_REFUND_DETAIL_PAGE_DATA = gql`
  query TenantRefundDetailPageData($refundId: ID!) {
    tenantRefundDetailPageData(refundId: $refundId)
  }
`;

export const ACCOUNTING_SETTINGS_PAGE_DATA = gql`
  query AccountingSettingsPageData($companyId: ID!) {
    accountingSettingsPageData(companyId: $companyId)
  }
`;

export const ACCOUNTING_PERIODS_PAGE_DATA = gql`
  query AccountingPeriodsPageData($companyId: ID!) {
    accountingPeriodsPageData(companyId: $companyId)
  }
`;

export const MANUAL_TRANSFER_FORM_DATA = gql`
  query ManualTransferFormData($companyId: ID!) {
    manualTransferFormData(companyId: $companyId)
  }
`;

export const SETUP_DEFAULT_ACCOUNTS_PAGE_DATA = gql`
  query SetupDefaultAccountsPageData($companyId: ID!) {
    setupDefaultAccountsPageData(companyId: $companyId)
  }
`;

export const TRIAL_BALANCE_REPORT_DATA = gql`
  query TrialBalanceReportData($companyId: ID!, $filters: GenericScalar) {
    trialBalanceReportData(companyId: $companyId, filters: $filters)
  }
`;

export const BALANCE_SHEET_REPORT_DATA = gql`
  query BalanceSheetReportData($companyId: ID!, $filters: GenericScalar) {
    balanceSheetReportData(companyId: $companyId, filters: $filters)
  }
`;

export const INCOME_STATEMENT_REPORT_DATA = gql`
  query IncomeStatementReportData($companyId: ID!, $filters: GenericScalar) {
    incomeStatementReportData(companyId: $companyId, filters: $filters)
  }
`;

export const CASH_FLOW_REPORT_DATA = gql`
  query CashFlowReportData($companyId: ID!, $filters: GenericScalar) {
    cashFlowReportData(companyId: $companyId, filters: $filters)
  }
`;

export const RETAINED_EARNINGS_REPORT_DATA = gql`
  query RetainedEarningsReportData($companyId: ID!, $filters: GenericScalar) {
    retainedEarningsReportData(companyId: $companyId, filters: $filters)
  }
`;

export const COMPARATIVE_PERFORMANCE_REPORT_DATA = gql`
  query ComparativePerformanceReportData($companyId: ID!, $filters: GenericScalar) {
    comparativePerformanceReportData(companyId: $companyId, filters: $filters)
  }
`;

export const REVENUE_TREND_REPORT_DATA = gql`
  query RevenueTrendReportData($companyId: ID!, $filters: GenericScalar) {
    revenueTrendReportData(companyId: $companyId, filters: $filters)
  }
`;

export const ACCOUNT_TREND_REPORT_DATA = gql`
  query AccountTrendReportData($companyId: ID!, $filters: GenericScalar) {
    accountTrendReportData(companyId: $companyId, filters: $filters)
  }
`;
