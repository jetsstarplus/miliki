export enum CompanyType {
  LANDLORD = 'LANDLORD',
  AGENT = 'AGENT',
}

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export const CompanyTypeLabels: Record<CompanyType, string> = {
  [CompanyType.LANDLORD]: 'Landlord Organization',
  [CompanyType.AGENT]: 'Property Management Agent',
};

export const CompanyStatusLabels: Record<CompanyStatus, string> = {
  [CompanyStatus.ACTIVE]: 'Active',
  [CompanyStatus.INACTIVE]: 'Inactive',
  [CompanyStatus.SUSPENDED]: 'Suspended',
  [CompanyStatus.PENDING_VERIFICATION]: 'Pending Verification',
};

/**
 * Example helper for UI styling (Tailwind/CSS classes)
 */
export const CompanyStatusColors: Record<CompanyStatus, string> = {
  [CompanyStatus.ACTIVE]: 'text-green-700 bg-green-100',
  [CompanyStatus.INACTIVE]: 'text-gray-700 bg-gray-100',
  [CompanyStatus.SUSPENDED]: 'text-red-700 bg-red-100',
  [CompanyStatus.PENDING_VERIFICATION]: 'text-amber-700 bg-amber-100',
};

export enum CompanyMembershipRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  AGENT = 'AGENT',
  EMPLOYEE = 'EMPLOYEE',
}

export enum CompanyMembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_INVITATION = 'PENDING_INVITATION',
  INVITATION_DECLINED = 'INVITATION_DECLINED',
}

export const CompanyMembershipRoleLabels: Record<CompanyMembershipRole, string> = {
  [CompanyMembershipRole.OWNER]: 'Company Owner',
  [CompanyMembershipRole.ADMIN]: 'Administrator',
  [CompanyMembershipRole.MANAGER]: 'Property Manager',
  [CompanyMembershipRole.ACCOUNTANT]: 'Company Accountant',
  [CompanyMembershipRole.AGENT]: 'Field Agent',
  [CompanyMembershipRole.EMPLOYEE]: 'Employee',
};

export const CompanyMembershipStatusLabels: Record<CompanyMembershipStatus, string> = {
  [CompanyMembershipStatus.ACTIVE]: 'Active',
  [CompanyMembershipStatus.INACTIVE]: 'Inactive',
  [CompanyMembershipStatus.PENDING_INVITATION]: 'Pending Invitation',
  [CompanyMembershipStatus.INVITATION_DECLINED]: 'Invitation Declined',
};

/**
 * Example helper for UI styling (Tailwind/CSS classes)
 */
export const CompanyMembershipStatusColors: Record<CompanyMembershipStatus, string> = {
  [CompanyMembershipStatus.ACTIVE]: 'text-green-700 bg-green-100',
  [CompanyMembershipStatus.INACTIVE]: 'text-gray-600 bg-gray-100',
  [CompanyMembershipStatus.PENDING_INVITATION]: 'text-blue-700 bg-blue-100',
  [CompanyMembershipStatus.INVITATION_DECLINED]: 'text-red-700 bg-red-100',
};

export enum BuildingOwnershipType {
  OWNED = 'OWNED',
  MANAGED = 'MANAGED',
  DELEGATED = 'DELEGATED',
}

export enum ManagementFeeType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CollectionFlow {
  DIRECT_TO_OWNER = 'DIRECT_TO_OWNER',
  AGENT_COLLECTS = 'AGENT_COLLECTS',
}

export const BuildingOwnershipTypeLabels: Record<BuildingOwnershipType, string> = {
  [BuildingOwnershipType.OWNED]: 'Owned by Landlord',
  [BuildingOwnershipType.MANAGED]: 'Managed by Agent',
  [BuildingOwnershipType.DELEGATED]: 'Delegated Management',
};

export const ManagementFeeTypeLabels: Record<ManagementFeeType, string> = {
  [ManagementFeeType.PERCENTAGE]: 'Percentage Of Collections',
  [ManagementFeeType.FIXED]: 'Fixed Fee',
};

export const CollectionFlowLabels: Record<CollectionFlow, string> = {
  [CollectionFlow.DIRECT_TO_OWNER]: 'Owner Collects, Agent Receipts In System',
  [CollectionFlow.AGENT_COLLECTS]: 'Agent Collects And Remits Net Amount',
};

