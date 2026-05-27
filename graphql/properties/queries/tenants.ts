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
          totalArrears
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
          transactionDate
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
          id
          unit{
          	id
            building{
              id
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
    notificationLogs(first: 20) {
      edges {
        node {
          id
          sentAt
          smsSent
          emailSent
          whatsappSent
          messageContent
        }
      }
    }
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

export const TENANT_CHARGES_HISTORY_QUERY = gql`
  query TenantChargesHistory(
    $tenantId: ID!
    $search: String
    $status: String
    $serviceTypeId: Int
    $fromDate: Date
    $toDate: Date
    $page: Int
  ) {
    tenantChargesHistory(
      tenantId: $tenantId
      search: $search
      status: $status
      serviceTypeId: $serviceTypeId
      fromDate: $fromDate
      toDate: $toDate
      page: $page
    )
  }
`;

export const TENANT_MANUAL_RECEIPTS_QUERY = gql`
  query TenantManualReceipts($tenantNodeId: ID!, $first: Int!, $after: String) {
    manualReceipts(tenant: $tenantNodeId, first: $first, after: $after) {
      edges {
        node {
          id
          receiptNumber
          amount
          paymentDate
          state
          stateLabel
          canValidate
          canCreatePayment
          paymentTransaction {
            id
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const TENANT_VACATION_NOTICES_QUERY = gql`
  query TenantVacationNotices($tenantId: ID!, $status: String, $limit: Int) {
    tenantVacationNotices(tenantId: $tenantId, status: $status, limit: $limit)
  }
`;

export const TENANT_STATEMENT_DATA_QUERY = gql`
  query TenantStatementData(
    $tenantId: ID!
    $dateFrom: Date
    $dateTo: Date
    $buildingId: Int
    $unitId: Int
    $page: Int
    $pageSize: Int
  ) {
    tenantStatementData(
      tenantId: $tenantId
      dateFrom: $dateFrom
      dateTo: $dateTo
      buildingId: $buildingId
      unitId: $unitId
      page: $page
      pageSize: $pageSize
    )
  }
`;
