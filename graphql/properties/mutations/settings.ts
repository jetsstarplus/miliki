import { gql } from '@apollo/client';

export const CREATE_UPDATE_CONFIG_PAYMENT_TYPE_MUTATION = gql`
  mutation CreateUpdateConfigPaymentType(
    $id: ID
    $code: String
    $name: String
    $category: String
    $description: String
    $revenueAccountId: ID
    $allocationAccountId: ID
    $isActive: Boolean
    $isDefault: Boolean
    $requiresUnit: Boolean
    $autoAllocate: Boolean
    $prepayment: Boolean
    $sortOrder: Int
  ) {
    createUpdateConfigPaymentType(
      id: $id
      code: $code
      name: $name
      category: $category
      description: $description
      revenueAccountId: $revenueAccountId
      allocationAccountId: $allocationAccountId
      isActive: $isActive
      isDefault: $isDefault
      requiresUnit: $requiresUnit
      autoAllocate: $autoAllocate
      prepayment: $prepayment
      sortOrder: $sortOrder
    ) {
      success
      message
      paymentType {
        id
      }
    }
  }
`;

export const DELETE_CONFIG_PAYMENT_TYPE_MUTATION = gql`
  mutation DeleteConfigPaymentType($id: ID!) {
    deleteConfigPaymentType(id: $id) {
      success
      message
    }
  }
`;

export const CREATE_UPDATE_CONFIG_PAYMENT_MODE_MUTATION = gql`
  mutation CreateUpdateConfigPaymentMode(
    $id: ID
    $code: String
    $name: String
    $category: String
    $description: String
    $paymentAccountId: ID
    $isActive: Boolean
    $isDefault: Boolean
    $requiresReference: Boolean
    $supportsAutoReconciliation: Boolean
    $sortOrder: Int
  ) {
    createUpdateConfigPaymentMode(
      id: $id
      code: $code
      name: $name
      category: $category
      description: $description
      paymentAccountId: $paymentAccountId
      isActive: $isActive
      isDefault: $isDefault
      requiresReference: $requiresReference
      supportsAutoReconciliation: $supportsAutoReconciliation
      sortOrder: $sortOrder
    ) {
      success
      message
      paymentMode {
        id
      }
    }
  }
`;

export const DELETE_CONFIG_PAYMENT_MODE_MUTATION = gql`
  mutation DeleteConfigPaymentMode($id: ID!) {
    deleteConfigPaymentMode(id: $id) {
      success
      message
    }
  }
`;

export const CREATE_UPDATE_UNIT_TYPE_MUTATION = gql`
  mutation CreateUpdateUnitType(
    $id: ID
    $code: String!
    $name: String!
    $description: String
    $defaultBedrooms: Int
    $defaultBathrooms: Int
    $defaultSquareFeet: Float
    $category: String
    $isActive: Boolean
    $sortOrder: Int
  ) {
    createUpdateUnitType(
      id: $id
      code: $code
      name: $name
      description: $description
      defaultBedrooms: $defaultBedrooms
      defaultBathrooms: $defaultBathrooms
      defaultSquareFeet: $defaultSquareFeet
      category: $category
      isActive: $isActive
      sortOrder: $sortOrder
    ) {
      success
      message
      unitType {
        id
      }
    }
  }
`;

export const DELETE_UNIT_TYPE_MUTATION = gql`
  mutation DeleteUnitType($id: ID!) {
    deleteUnitType(id: $id) {
      success
      message
      unitType {
        id
      }
    }
  }
`;
