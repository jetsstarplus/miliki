export enum BuildingType {
  RESIDENTIAL = 'RESIDENTIAL',
  COMMERCIAL = 'COMMERCIAL',
  MIXED_USE = 'MIXED_USE',
}

/**
 * Note: Values like '1BR', '2BR' are kept to match your 
 * Django backend database values exactly.
 */
export enum UnitType {
  STUDIO = 'STUDIO',
  ONE_BEDROOM = '1BR',
  TWO_BEDROOM = '2BR',
  THREE_BEDROOM = '3BR',
  FOUR_BEDROOM = '4BR',
  PENTHOUSE = 'PENTHOUSE',
  SHOP = 'SHOP',
  OFFICE = 'OFFICE',
  WAREHOUSE = 'WAREHOUSE',
}

export enum UnitStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED',
}

export enum PaymentPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
}

export enum RentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
}

export enum AgreementStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED',
  CANCELLED = 'CANCELLED',
}

export enum PenaltyCalculationType {
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  PERCENTAGE = 'PERCENTAGE',
  DAILY_RATE = 'DAILY_RATE',
  PERCENTAGE_PER_DAY = 'PERCENTAGE_PER_DAY',
}

export enum TransactionType {
  RENT = 'RENT',
  DEPOSIT = 'DEPOSIT',
  SERVICE_CHARGE = 'SERVICE_CHARGE',
  PURCHASE = 'PURCHASE',
  RENT_TO_OWN = 'RENT_TO_OWN',
  PENALTY = 'PENALTY',
  REFUND = 'REFUND',
}

export const UnitTypeLabels: Record<UnitType, string> = {
  [UnitType.STUDIO]: 'Studio',
  [UnitType.ONE_BEDROOM]: '1 Bedroom',
  [UnitType.TWO_BEDROOM]: '2 Bedrooms',
  [UnitType.THREE_BEDROOM]: '3 Bedrooms',
  [UnitType.FOUR_BEDROOM]: '4 Bedrooms',
  [UnitType.PENTHOUSE]: 'Penthouse',
  [UnitType.SHOP]: 'Shop',
  [UnitType.OFFICE]: 'Office',
  [UnitType.WAREHOUSE]: 'Warehouse',
};

export const TransactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.RENT]: 'Rent Payment',
  [TransactionType.DEPOSIT]: 'Deposit',
  [TransactionType.SERVICE_CHARGE]: 'Service Charge',
  [TransactionType.PURCHASE]: 'Unit Purchase',
  [TransactionType.RENT_TO_OWN]: 'Rent to Own Installment',
  [TransactionType.PENALTY]: 'Penalty/Late Fee',
  [TransactionType.REFUND]: 'Refund',
};

export enum LeaseType {
  STANDARD = 'STANDARD',
  COMMERCIAL = 'COMMERCIAL',
  SHORT_TERM = 'SHORT_TERM',
  MONTH_TO_MONTH = 'MONTH_TO_MONTH',
  FIXED_TERM = 'FIXED_TERM',
}

export enum LeaseStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  RENEWED = 'RENEWED',
}

export enum PaymentFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
}

export enum TerminatedBy {
  LANDLORD = 'LANDLORD',
  TENANT = 'TENANT',
  MUTUAL = 'MUTUAL',
  COURT = 'COURT',
}
export enum LandlordStatementHandoffStatus {
  PUBLISHED = 'PUBLISHED',
  VIEWED = 'VIEWED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export enum LandlordInvoicePaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  MPESA = 'MPESA',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export enum LandlordInvoicePaymentStatus {
  ACTIVE = 'ACTIVE',
  VOID = 'VOID',
}
export const LandlordStatementHandoffLabels: Record<LandlordStatementHandoffStatus, string> = {
  [LandlordStatementHandoffStatus.PUBLISHED]: 'Published',
  [LandlordStatementHandoffStatus.VIEWED]: 'Viewed',
  [LandlordStatementHandoffStatus.ACKNOWLEDGED]: 'Acknowledged',
};

export const LandlordInvoicePaymentMethodLabels: Record<LandlordInvoicePaymentMethod, string> = {
  [LandlordInvoicePaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [LandlordInvoicePaymentMethod.MPESA]: 'M-Pesa',
  [LandlordInvoicePaymentMethod.CASH]: 'Cash',
  [LandlordInvoicePaymentMethod.CHEQUE]: 'Cheque',
  [LandlordInvoicePaymentMethod.OTHER]: 'Other',
};

export const LandlordInvoicePaymentStatusLabels: Record<LandlordInvoicePaymentStatus, string> = {
  [LandlordInvoicePaymentStatus.ACTIVE]: 'Active',
  [LandlordInvoicePaymentStatus.VOID]: 'Voided',
};

export enum ChargeStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
  CANCELLED = 'CANCELLED',
}
export const ChargeStatusLabels: Record<ChargeStatus, string> = {
  [ChargeStatus.PENDING]: 'Pending',
  [ChargeStatus.PARTIAL]: 'Partially Paid',
  [ChargeStatus.PAID]: 'Fully Paid',
  [ChargeStatus.OVERDUE]: 'Overdue',
  [ChargeStatus.WAIVED]: 'Waived',
  [ChargeStatus.CANCELLED]: 'Cancelled',
};

/**
 * Example helper for UI styling (Tailwind/CSS classes)
 */
export const ChargeStatusColors: Record<ChargeStatus, string> = {
  [ChargeStatus.PENDING]: 'text-yellow-600 bg-yellow-100',
  [ChargeStatus.PARTIAL]: 'text-blue-600 bg-blue-100',
  [ChargeStatus.PAID]: 'text-green-600 bg-green-100',
  [ChargeStatus.OVERDUE]: 'text-red-600 bg-red-100',
  [ChargeStatus.WAIVED]: 'text-gray-600 bg-gray-100',
  [ChargeStatus.CANCELLED]: 'text-slate-400 bg-slate-50',
};


export enum ExtraChargeType {
  FIXED = 'FIXED',
  RATE = 'RATE',
}

export enum ExtraChargeEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
}

export const ExtraChargeTypeLabels: Record<ExtraChargeType, string> = {
  [ExtraChargeType.FIXED]: 'Fixed Amount',
  [ExtraChargeType.RATE]: 'Rate Per Unit',
};

export const ExtraChargeEntryStatusLabels: Record<ExtraChargeEntryStatus, string> = {
  [ExtraChargeEntryStatus.DRAFT]: 'Draft',
  [ExtraChargeEntryStatus.POSTED]: 'Posted to tenant account',
};

export enum BillingFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
  ONE_TIME = 'ONE_TIME',
}


export const BillingFrequencyLabels: Record<BillingFrequency, string> = {
  [BillingFrequency.MONTHLY]: 'Monthly',
  [BillingFrequency.QUARTERLY]: 'Quarterly',
  [BillingFrequency.ANNUALLY]: 'Annually',
  [BillingFrequency.ONE_TIME]: 'One Time',
};

export enum VacationNoticeStatus {
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export const VacationNoticeStatusLabels: Record<VacationNoticeStatus, string> = {
  [VacationNoticeStatus.PENDING]: 'Pending',
  [VacationNoticeStatus.CANCELLED]: 'Cancelled',
  [VacationNoticeStatus.COMPLETED]: 'Completed',
};

export enum TenantPaymentLinkStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export const TenantPaymentLinkStatusLabels: Record<TenantPaymentLinkStatus, string> = {
  [TenantPaymentLinkStatus.PENDING]: 'Pending',
  [TenantPaymentLinkStatus.PROCESSING]: 'Processing',
  [TenantPaymentLinkStatus.EXPIRED]: 'Expired',
  [TenantPaymentLinkStatus.FAILED]: 'Failed',
};

export const TenantPaymentLinkStatusColors: Record<TenantPaymentLinkStatus, string> = {
  [TenantPaymentLinkStatus.PENDING]: 'text-amber-600 bg-amber-50',     // Waiting for user action
  [TenantPaymentLinkStatus.PROCESSING]: 'text-blue-600 bg-blue-50',    // Transaction in flight
  [TenantPaymentLinkStatus.EXPIRED]: 'text-gray-500 bg-gray-100',      // Link timed out
  [TenantPaymentLinkStatus.FAILED]: 'text-red-600 bg-red-50',          // Permanent error
};

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum MaintenanceStatus {
  NEW = 'NEW',
  TRIAGE = 'TRIAGE',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PayableStatus {
  NONE = 'NONE',
  DUE = 'DUE',
  PAID = 'PAID',
}

export enum MaintenanceCategory {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  HVAC = 'HVAC',
  SAFETY = 'SAFETY',
  APPLIANCE = 'APPLIANCE',
  STRUCTURAL = 'STRUCTURAL',
  FINISHES = 'FINISHES',
  OTHER = 'OTHER',
}

export const MaintenancePriorityLabels: Record<MaintenancePriority, string> = {
  [MaintenancePriority.LOW]: 'Low',
  [MaintenancePriority.MEDIUM]: 'Medium',
  [MaintenancePriority.HIGH]: 'High',
  [MaintenancePriority.CRITICAL]: 'Critical',
};

/** Priority Colors for Badges */
export const MaintenancePriorityColors: Record<MaintenancePriority, string> = {
  [MaintenancePriority.LOW]: 'text-blue-600 bg-blue-50',
  [MaintenancePriority.MEDIUM]: 'text-yellow-600 bg-yellow-50',
  [MaintenancePriority.HIGH]: 'text-orange-600 bg-orange-50',
  [MaintenancePriority.CRITICAL]: 'text-red-700 bg-red-100 font-bold animate-pulse',
};

export const MaintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.NEW]: 'New / Logged',
  [MaintenanceStatus.TRIAGE]: 'Triaged',
  [MaintenanceStatus.SCHEDULED]: 'Scheduled',
  [MaintenanceStatus.IN_PROGRESS]: 'In Progress',
  [MaintenanceStatus.ON_HOLD]: 'On Hold',
  [MaintenanceStatus.COMPLETED]: 'Completed',
  [MaintenanceStatus.CANCELLED]: 'Cancelled',
};

export const MaintenanceCategoryLabels: Record<MaintenanceCategory, string> = {
  [MaintenanceCategory.PLUMBING]: 'Plumbing',
  [MaintenanceCategory.ELECTRICAL]: 'Electrical',
  [MaintenanceCategory.HVAC]: 'HVAC / AC',
  [MaintenanceCategory.SAFETY]: 'Safety & Security',
  [MaintenanceCategory.APPLIANCE]: 'Appliance',
  [MaintenanceCategory.STRUCTURAL]: 'Structural',
  [MaintenanceCategory.FINISHES]: 'Finishes / Paint',
  [MaintenanceCategory.OTHER]: 'Other',
};
