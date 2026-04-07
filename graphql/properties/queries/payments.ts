import { gql } from '@apollo/client';

export const PAYMENT_RECEIPTS_QUERY = gql`
  query PaymentReceipts(
    $first: Int
    $after: String
    $buildingId: ID
    $unitId: ID
    $tenantId: ID
    $search: String
  ) {
    paymentReceipts(
      first: $first
      after: $after
      buildingId: $buildingId
      unitId: $unitId
      tenantId: $tenantId
      search: $search
    ) {
      edges {
        node {
          id
          amount
          status
          reference
          confirmationCode
          transactionDate
          paymentMode
          tenant {
            fullName
          }
          unit {
            unitNumber
            building {
              name
            }
          }
          transactionLines {
            amount
            paymentType {
              name
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
      }
    }
  }
`;