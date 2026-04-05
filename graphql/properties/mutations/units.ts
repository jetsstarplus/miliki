import { gql } from "@apollo/client";


export const CREATE_UPDATE_UNIT = gql`
mutation CreateUpdateUnit(
  $unitId: ID,
  $buildingId: ID,
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
  $unitType: ID
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
