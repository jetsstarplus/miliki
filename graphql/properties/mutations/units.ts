import { gql } from "@apollo/client";

export const DELETE_UNIT = gql`
  mutation DeleteUnit($id: ID!) {
    deleteUnit(id: $id) {
      success
      message
    }
  }
`;

export const CREATE_UPDATE_UNIT = gql`
mutation CreateUpdateUnit(
  $unitId: ID,
  $buildingId: ID!,
  $accountNumber: String!,
  $bathrooms: Int,
  $bedrooms: Int,
  $depositAmount: Decimal!,
  $description: String,
  $floor: String,
  $isAvailableForPurchase: Boolean,
  $isAvailableForRent: Boolean,
  $monthlyRent: Decimal!,
  $paymentPeriod: String,
  $purchasePrice: Decimal,
  $serviceCharge: Decimal,
  $squareFeet: Float,
  $unitNumber: String!,
  $unitType: ID!
) {
  createUpdateUnit(
    id: $unitId,
    accountNumber: $accountNumber,
    bathrooms: $bathrooms,
    bedrooms: $bedrooms,
    buildingId: $buildingId,
    depositAmount: $depositAmount,
    description: $description,
    floor: $floor,
    isAvailableForPurchase: $isAvailableForPurchase,
    isAvailableForRent: $isAvailableForRent,
    monthlyRent: $monthlyRent,
    paymentPeriod: $paymentPeriod,
    purchasePrice: $purchasePrice,
    serviceCharge: $serviceCharge,
    squareFeet: $squareFeet,
    unitNumber: $unitNumber,
    unitType: $unitType
  ) {
    unit {
      id
      description
      accountNumber
      unitNumber
    }
    success
    message
  }
}`;

export const COPY_UNIT_MUTATION = gql`
  mutation CopyUnit(
    $unitId: ID!
    $copyCount: Int!
    $startingUnitNumber: String!
    $numberingPattern: String
    $incrementFloor: Boolean
  ) {
    copyUnit(
      unitId: $unitId
      copyCount: $copyCount
      startingUnitNumber: $startingUnitNumber
      numberingPattern: $numberingPattern
      incrementFloor: $incrementFloor
    ) {
      success
      message
      createdCount
      duplicates
    }
  }
`;

export const PROCESS_MOVE_OUT_MUTATION = gql`
  mutation ProcessMoveOut(
    $occupancyId: Int!
    $endDate: Date!
    $moveOutReason: String
    $damageAmount: Decimal
    $damageNotes: String
  ) {
    processMoveOut(
      occupancyId: $occupancyId
      endDate: $endDate
      moveOutReason: $moveOutReason
      damageAmount: $damageAmount
      damageNotes: $damageNotes
    ) {
      success
      message
      finalBalance
      depositRefund
      occupancy {
        id
        isCurrent
        endDate
      }
    }
  }
`;
