import { gql } from "@apollo/client";

export const LEASE_LIST = gql`
query LeaseList($first: Int, $after: String, $search:String) {
  leases(first: $first, after: $after, search: $search) {
    edges{
      node{
        createdAt
        modifiedAt
        id
        status
        leaseNumber
        leaseType
        startDate
        endDate
        signedDate
        rentAmount
        serviceCharge
        depositAmount
        paymentFrequency
        paymentDueDay
        rentEscalationRate
        nextEscalationDate
        renewalOption
        renewalNoticeDays
        renewalTerms
        breakClause
        breakClauseDetails
        latePaymentPenalty
        penaltyGraceDays
        penaltyFlatAmount
        penaltyRatePct
        signedCopy
        specialConditions
        internalNotes
        signedCopyUrl
        
        occupancy{
          id
          notes
          dueDayOfPeriod
          tenant{
            id
            fullName
          }
          unit{
            id
            accountNumber
            unitNumber
            unitType{
              name
              id
            }
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
}`;

export const LEASE_DETAIL = gql`
query LeaseDetail($id: ID!) {
  lease(id: $id) {
    createdAt
    modifiedAt
    id
    status
    leaseNumber
    leaseType
    startDate
    endDate
    signedDate
    rentAmount
    serviceCharge
    depositAmount
    paymentFrequency
    paymentDueDay
    rentEscalationRate
    nextEscalationDate
    renewalOption
    renewalNoticeDays
    renewalTerms
    breakClause
    breakClauseDetails
    latePaymentPenalty
    penaltyGraceDays
    penaltyFlatAmount
    penaltyRatePct
    signedCopy
    specialConditions
    internalNotes
    signedCopyUrl
    
    occupancy{
        id
        startDate
        endDate
        depositPaid
        depositRefunded
        isCurrent
        moveOutReason
        finalBalance
        skipDepositCharge
        notes
        dueDayOfPeriod
        tenant{
        id
        fullName
        }
        unit{
        id
        accountNumber
        unitNumber
        unitType{
            name
            id
        }
        }
    }
  }
}`;


