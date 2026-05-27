import { gql } from '@apollo/client';

export const CONFIG_PAYMENT_TYPES_QUERY = gql`
  query ConfigPaymentTypes($first: Int, $after: String) {
    configPaymentTypes(first: $first, after: $after) {
      edges {
        node {
          id
          code
          name
          category
          description
          revenueAccount {
            id
            code
            name
          }
          allocationAccount {
            id
            code
            name
          }
          isActive
          isDefault
          requiresUnit
          autoAllocate
          prepayment
          sortOrder
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const CHART_OF_ACCOUNTS_QUERY = gql`
  query ChartOfAccounts($first: Int, $search: String, $isActive: Boolean) {
    accountsConnection(first: $first, name: $search, isActive: $isActive) {
      edges {
        node {
          id
          code
          name
          accountType
        }
      }
    }
  }
`;

export const CONFIG_PAYMENT_MODES_SETTINGS_QUERY = gql`
  query ConfigPaymentModesSettings($first: Int, $after: String) {
    configPaymentModes(first: $first, after: $after) {
      edges {
        node {
          id
          code
          name
          category
          description
          paymentAccount {
            id
            code
            name
          }
          isActive
          isDefault
          requiresReference
          supportsAutoReconciliation
          sortOrder
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const UNIT_TYPES_SETTINGS_QUERY = gql`
  query UnitTypesSettings($first: Int, $after: String) {
    unitTypes(first: $first, after: $after) {
      edges {
        node {
          id
          code
          name
          description
          defaultBedrooms
          defaultBathrooms
          defaultSquareFeet
          category
          isActive
          sortOrder
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
