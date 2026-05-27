import { gql } from '@apollo/client';

export const INVITE_COMPANY_MEMBER = gql`
  mutation InviteCompanyMember($companyId: ID!, $email: String!, $role: String!, $message: String) {
    inviteCompanyMember(companyId: $companyId, email: $email, role: $role, message: $message) {
      success
      message
      invitation {
        id
      }
    }
  }
`;

export const BULK_INVITE_COMPANY_MEMBERS = gql`
  mutation BulkInviteCompanyMembers($companyId: ID!, $emails: [String]!, $role: String!) {
    bulkInviteCompanyMembers(companyId: $companyId, emails: $emails, role: $role) {
      success
      message
      invitedCount
    }
  }
`;

export const ASSIGN_USER_ROLE = gql`
  mutation AssignUserRole(
    $companyId: ID!
    $userId: ID!
    $role: String!
    $buildingId: ID
    $notes: String
  ) {
    assignUserRole(
      companyId: $companyId
      userId: $userId
      role: $role
      buildingId: $buildingId
      notes: $notes
    ) {
      success
      message
      userRole {
        id
        role
        building {
          id
          name
        }
      }
    }
  }
`;

export const REMOVE_USER_ROLE = gql`
  mutation RemoveUserRole($roleId: ID!) {
    removeUserRole(roleId: $roleId) {
      success
      message
    }
  }
`;

export const UPDATE_MEMBER_PERMISSIONS = gql`
  mutation UpdateMemberPermissions(
    $membershipId: ID!
    $canManageProperties: Boolean
    $canManageTenants: Boolean
    $canManagePayments: Boolean
    $canValidatePayments: Boolean
    $canViewAccounting: Boolean
    $canManageMembers: Boolean
    $canViewReports: Boolean
    $canModifyCompany: Boolean
    $canInviteUsers: Boolean
  ) {
    updateMemberPermissions(
      membershipId: $membershipId
      canManageProperties: $canManageProperties
      canManageTenants: $canManageTenants
      canManagePayments: $canManagePayments
      canValidatePayments: $canValidatePayments
      canViewAccounting: $canViewAccounting
      canManageMembers: $canManageMembers
      canViewReports: $canViewReports
      canModifyCompany: $canModifyCompany
      canInviteUsers: $canInviteUsers
    ) {
      success
      message
      membership {
        id
        role
      }
    }
  }
`;
