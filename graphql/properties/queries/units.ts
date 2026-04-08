import { gql } from "@apollo/client";

export const UNITS_DROPDOWN = gql`
  query UnitsDropdown($first: Int, $search: String, $buildingId: ID) {
    units(first: $first, search: $search, buildingId: $buildingId) {
      edges {
        node {
          id
          unitNumber
          accountNumber
          building {
            id
            name
          }
          occupancies(first: 1) {
            edges {
              node {
                id
                isCurrent
                tenant {
                  id
                  fullName
                }
              }
            }
          }
        }
      }
    }
  }
`;


export const UNITS_QUERY = gql`
query UNITS($first: Int, $offset: Int, $before: String, $after: String, $last: Int, $buildingId: ID, $status: PropertiesUnitStatusChoices, $isAvailableForRent: Boolean, $isAvailableForPurchase: Boolean, $unitType: ID, $search: String) {
  units(
    first: $first
    offset: $offset
    before: $before
    after: $after
    last: $last
    buildingId: $buildingId
    status: $status
    isAvailableForRent: $isAvailableForRent
    isAvailableForPurchase: $isAvailableForPurchase
    unitType: $unitType
    search: $search
  ) {
    edges {
      node {
        unitNumber
        createdAt
        id
        modifiedAt
        createdBy {
          id
          no
        }
        createdAt
        modifiedBy {
          searchName
        }
        building {
          name
        }
        unitNumber
        accountNumber
        uniqueAccountNumber
        floor
        unitTypeLegacy
        bedrooms
        bathrooms
        squareFeet
        monthlyRent
        serviceCharge
        depositAmount
        description
        purchasePrice
        paymentPeriod
        status
        isAvailableForRent
        isAvailableForPurchase
        advancePayment
        arrears
        occupancies(first: 1) {
          edges {
            node {
              isCurrent
              tenant {
                fullName
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}`;

export const UNIT_DETAIL_QUERY = gql`
query UNIT_DETAIL($id: ID!) {
  unit(id: $id) {
    unitNumber
    createdAt
    id
    modifiedAt
    createdBy {
      id
      no
    }
    createdAt
    modifiedBy {
      searchName
    }
    building {
      name
    }
    unitNumber
    accountNumber
    uniqueAccountNumber
    floor
    unitTypeLegacy
    bedrooms
    bathrooms
    squareFeet
    monthlyRent
    serviceCharge
    depositAmount
    description
    purchasePrice
    paymentPeriod
    status
    isAvailableForRent
    isAvailableForPurchase
    advancePayment
    arrears
    currentBalance
    rentSchedules {
      edges {
        node {
          id
          periodStart
          periodEnd
          dueDate
          rentAmount
          serviceCharge
          penalty
          expectedAmount
          paidAmount
          status
          notes
          balance
          isOverdue
        }
      }
    }
    occupancies {
      edges {
        node {
          tenant {
            fullName
            idNumber
            phone
          }
          startDate
          endDate
          depositPaid
          depositRefunded
          dueDayOfPeriod
          isCurrent
          moveOutReason
          finalBalance
          durationMonths
          dueDayOfPeriod
          skipDepositCharge
          notes
        }
      }
      pageInfo {
        hasNextPage
        startCursor
        endCursor
        hasPreviousPage
      }
    }
    purchaseAgreements {
      edges {
        node {
          id
          buyer {
            fullName
          }
          agreementNumber
          agreementDate
          totalPrice
          downPayment
          installmentAmount
          installmentPeriod
          interestRate
          totalPaid
          balanceRemaining
          paymentProgress
          notes
          status
        }
      }
    }
  }
}`;


export const UNIT_TYPES_QUERY = gql`
query UnitTypes{
  unitTypes{
    edges{
      node{
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
  }
}`;
