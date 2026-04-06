export enum SubscriptionPlanType {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export const SubscriptionPlanLabels: Record<SubscriptionPlanType, string> = {
  [SubscriptionPlanType.FREE]: 'Free Plan',
  [SubscriptionPlanType.STARTER]: 'Starter Plan',
  [SubscriptionPlanType.PROFESSIONAL]: 'Professional Plan',
  [SubscriptionPlanType.ENTERPRISE]: 'Enterprise Plan',
  [SubscriptionPlanType.CUSTOM]: 'Custom Pricing',
};

export const SubscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.TRIAL]: 'Trial',
  [SubscriptionStatus.ACTIVE]: 'Active',
  [SubscriptionStatus.PAST_DUE]: 'Past Due',
  [SubscriptionStatus.SUSPENDED]: 'Suspended',
  [SubscriptionStatus.CANCELLED]: 'Cancelled',
  [SubscriptionStatus.EXPIRED]: 'Expired',
};

/** Status Colors for Account Dashboards */
export const SubscriptionStatusColors: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.TRIAL]: 'text-blue-600 bg-blue-50',
  [SubscriptionStatus.ACTIVE]: 'text-green-600 bg-green-50',
  [SubscriptionStatus.PAST_DUE]: 'text-orange-600 bg-orange-50', // Warning state
  [SubscriptionStatus.SUSPENDED]: 'text-red-600 bg-red-50',      // Access restricted
  [SubscriptionStatus.CANCELLED]: 'text-gray-500 bg-gray-100',   // User-initiated end
  [SubscriptionStatus.EXPIRED]: 'text-slate-600 bg-slate-200',   // Natural end
};

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  WAIVER = 'WAIVER',
}

export const DiscountTypeLabels: Record<DiscountType, string> = {
  [DiscountType.PERCENTAGE]: 'Percentage Discount',
  [DiscountType.FIXED_AMOUNT]: 'Fixed Amount Discount',
  [DiscountType.WAIVER]: 'Full Waiver (100% Off)',
};
