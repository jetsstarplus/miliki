export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum DebitCredit {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum AccountingMethod {
  ACCRUAL = 'ACCRUAL',
  CASH = 'CASH',
}

export enum AccountingPeriodFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export const AccountTypeLabels: Record<AccountType, string> = {
  [AccountType.ASSET]: 'Asset',
  [AccountType.LIABILITY]: 'Liability',
  [AccountType.EQUITY]: 'Equity',
  [AccountType.REVENUE]: 'Revenue',
  [AccountType.EXPENSE]: 'Expense',
};

/**
 * Normal Balance Logic:
 * Assets and Expenses normally have Debit balances.
 * Liabilities, Equity, and Revenue normally have Credit balances.
 */
export const NormalBalance: Record<AccountType, DebitCredit> = {
  [AccountType.ASSET]: DebitCredit.DEBIT,
  [AccountType.EXPENSE]: DebitCredit.DEBIT,
  [AccountType.LIABILITY]: DebitCredit.CREDIT,
  [AccountType.EQUITY]: DebitCredit.CREDIT,
  [AccountType.REVENUE]: DebitCredit.CREDIT,
};

export const AccountingMethodLabels: Record<AccountingMethod, string> = {
  [AccountingMethod.ACCRUAL]: 'Accrual Basis',
  [AccountingMethod.CASH]: 'Cash Basis',
};

export enum JournalStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOID = 'VOID',
}

export enum JournalEntryType {
  GENERAL = 'GENERAL',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  REFUND = 'REFUND',
  ALLOCATION = 'ALLOCATION',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  INVOICE = 'INVOICE',
}

export const JournalStatusLabels: Record<JournalStatus, string> = {
  [JournalStatus.DRAFT]: 'Draft',
  [JournalStatus.POSTED]: 'Posted',
  [JournalStatus.VOID]: 'Void',
};

/** Status Colors for Ledger Badges */
export const JournalStatusColors: Record<JournalStatus, string> = {
  [JournalStatus.DRAFT]: 'text-amber-600 bg-amber-50 border-amber-200',
  [JournalStatus.POSTED]: 'text-green-700 bg-green-50 border-green-200',
  [JournalStatus.VOID]: 'text-red-600 bg-red-50 border-red-200',
};

export const JournalEntryTypeLabels: Record<JournalEntryType, string> = {
  [JournalEntryType.GENERAL]: 'General Journal',
  [JournalEntryType.PAYMENT]: 'Payment',
  [JournalEntryType.RECEIPT]: 'Receipt',
  [JournalEntryType.REFUND]: 'Refund',
  [JournalEntryType.ALLOCATION]: 'Charge Allocation',
  [JournalEntryType.ADJUSTMENT]: 'Adjustment',
  [JournalEntryType.TRANSFER]: 'Transfer',
  [JournalEntryType.INVOICE]: 'Invoice',
};

export enum TenantCreditType {
  OVERPAYMENT = 'OVERPAYMENT',
  PREPAYMENT = 'PREPAYMENT',
  DEPOSIT_CREDIT = 'DEPOSIT_CREDIT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export const TenantCreditTypeLabels: Record<TenantCreditType, string> = {
  [TenantCreditType.OVERPAYMENT]: 'Overpayment',
  [TenantCreditType.PREPAYMENT]: 'Prepayment/Advance',
  [TenantCreditType.DEPOSIT_CREDIT]: 'Deposit in Credit',
  [TenantCreditType.ADJUSTMENT]: 'Manual Adjustment',
};

/**
 * Descriptions for Tooltips or Information Modals
 */
export const TenantCreditTypeDescriptions: Record<TenantCreditType, string> = {
  [TenantCreditType.OVERPAYMENT]: 'Extra funds from a previous payment that exceeded the balance due.',
  [TenantCreditType.PREPAYMENT]: 'Funds paid in advance for future rent or service charges.',
  [TenantCreditType.DEPOSIT_CREDIT]: 'Security deposit funds that have been moved to the credit ledger.',
  [TenantCreditType.ADJUSTMENT]: 'A balance correction made manually by a system administrator.',
};

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RefundType {
  DEPOSIT_RETURN = 'DEPOSIT_RETURN',
  OVERPAYMENT = 'OVERPAYMENT',
  ADJUSTMENT = 'ADJUSTMENT',
  OTHER = 'OTHER',
}

export const RefundStatusLabels: Record<RefundStatus, string> = {
  [RefundStatus.PENDING]: 'Pending',
  [RefundStatus.APPROVED]: 'Approved',
  [RefundStatus.PROCESSING]: 'Processing',
  [RefundStatus.COMPLETED]: 'Completed',
  [RefundStatus.CANCELLED]: 'Cancelled',
};

/** Status Colors for Refund Badges */
export const RefundStatusColors: Record<RefundStatus, string> = {
  [RefundStatus.PENDING]: 'text-amber-600 bg-amber-50',
  [RefundStatus.APPROVED]: 'text-blue-600 bg-blue-50',
  [RefundStatus.PROCESSING]: 'text-purple-600 bg-purple-50',
  [RefundStatus.COMPLETED]: 'text-green-600 bg-green-50',
  [RefundStatus.CANCELLED]: 'text-gray-500 bg-gray-100',
};

export const RefundTypeLabels: Record<RefundType, string> = {
  [RefundType.DEPOSIT_RETURN]: 'Deposit Return',
  [RefundType.OVERPAYMENT]: 'Overpayment Refund',
  [RefundType.ADJUSTMENT]: 'Adjustment',
  [RefundType.OTHER]: 'Other',
};
