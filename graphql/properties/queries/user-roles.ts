import { gql } from '@apollo/client';

export const USER_ROLES_PAGE_DATA = gql`
  query UserRolesPageData($companyId: ID!) {
    userRolesPageData(companyId: $companyId)
  }
`;

export const ASSIGN_ROLE_FORM_DATA = gql`
  query AssignRoleFormData($companyId: ID!) {
    assignRoleFormData(companyId: $companyId)
  }
`;

export const MEMBER_PERMISSIONS_FORM_DATA = gql`
  query MemberPermissionsFormData($companyId: ID!, $membershipId: ID!) {
    memberPermissionsFormData(companyId: $companyId, membershipId: $membershipId)
  }
`;
