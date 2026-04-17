import { gql } from "@apollo/client";

export const TENANTS_DROPDOWN = gql`
  query TenantsDropdown($first: Int, $search: String) {
    tenants(first: $first, search: $search) {
      edges {
        node {
          id
          fullName
          firstName
          middleName
          lastName
          phone
          email
          occupancies(first: 1) {
            edges {
              node {
                id
                isCurrent
                unit {
                  id
                  unitNumber
                  accountNumber
                  building {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;


export const TENANTS_QUERY = gql`
query TENANTS($first: Int, $after: String, $search: String) {
  tenants(first: $first, after: $after, search: $search){
    edges{
      node{
        id
        createdAt
        modifiedAt
        firstName
        lastName
        middleName
        fullName
        idNumber
        phone
        alternativePhone
        email
        employer
        emergencyContactName
        emergencyContactPhone
        emergencyContactRelationship
        occupation
        permanentAddress
        isActive
        blockAutomaticNotifications
        defaultDueDay
        notes
        createdByCompany {
          id
          name
        }
        totalArrears
        occupancies(first: 1) {
          edges {
            node {
              isCurrent
              unit {
                unitNumber
                building {
                  name
                }
              }
            }
          }
        }
      }
    }
    
    pageInfo{
      hasNextPage
      startCursor
      endCursor
      hasPreviousPage
    }
	}
}`;

export const TENANT_DETAIL_QUERY = gql`
query TENANT_DETAIL($id: ID!){
  tenant(id: $id){
    id
    createdAt
    modifiedAt
    firstName
    middleName
    lastName
    fullName
    idNumber
    phone
    email
    alternativePhone
    emergencyContactName
    emergencyContactPhone
    emergencyContactRelationship
    occupation
    permanentAddress
    isActive
    blockAutomaticNotifications
    defaultDueDay
    notes
    createdBy{
      searchName
    }
    transactions{
      edges{
        node{
          id
          no
          reference
          status
          confirmationCode
          paymentMode
          amount
          excessAmount
          responseStatusCode
          paymentAccount
          paymentStatusCode
        }
      }
       pageInfo{
      hasNextPage
      startCursor
      endCursor
      hasPreviousPage
    }
    }
    occupancies{
      edges{
        node{
          unit{
          	id
            building{
              name
            }
            accountNumber
            unitNumber
            monthlyRent
            floor
            status
            depositAmount
            serviceCharge
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
       pageInfo{
      hasNextPage
      startCursor
      endCursor
      hasPreviousPage
    }
      
    }
    totalArrears
    rentSchedules{
      edges{
        node{
          id
          unit{
            accountNumber
            unitNumber
          }
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
  }
}`;
