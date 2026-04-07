import { gql } from "@apollo/client";

export const CREATEUPDATE_TENANT_MUTATION = gql`
mutation CreateUpdateLease($id: ID, $occupancyId: ID!, $leaseType: String!, $rentAmount: Decimal!, $paymentFrequency: String!, $startDate: Date!, $endDate: Date, $breakClause: Boolean, $breakClauseDetails: String, $internalNotes: String, $latePaymentPenalty: Boolean, $nextEscalationDate: Date, $paymentDueDay: Int, $penaltyFlatAmount: Decimal, $penaltyGraceDays: Int, $penaltyRatePct: Decimal, $renewalNoticeDays: Int, $renewalOption: Boolean, $renewalTerms: String, $rentEscalationRate: Decimal, $serviceCharge: Decimal, $signedDate: Date, $specialConditions: String, $depositAmount:Decimal!) {
  createUpdateLease(
    id: $id
    breakClause: $breakClause
    breakClauseDetails: $breakClauseDetails
    depositAmount: $depositAmount
    endDate: $endDate
    internalNotes: $internalNotes
    latePaymentPenalty: $latePaymentPenalty
    leaseType: $leaseType
    nextEscalationDate: $nextEscalationDate
    occupancyId: $occupancyId
    paymentDueDay: $paymentDueDay
    paymentFrequency: $paymentFrequency
    penaltyFlatAmount: $penaltyFlatAmount
    penaltyGraceDays: $penaltyGraceDays
    penaltyRatePct: $penaltyRatePct
    renewalNoticeDays: $renewalNoticeDays
    renewalOption: $renewalOption
    renewalTerms: $renewalTerms
    rentAmount: $rentAmount
    rentEscalationRate: $rentEscalationRate
    serviceCharge: $serviceCharge
    signedDate: $signedDate
    specialConditions: $specialConditions
    startDate: $startDate
  ) {
    lease {
      id
      leaseNumber
    }
    success
    message
  }
}`;

export const DELETE_LEASE = gql`
mutation DeleteLease($id: ID!){
  deleteLease(id: $id){
    success
    message
  }
}`;

export const REMOVE_LEASE_DOCUMENT = gql`
mutation RemoveLeaseDocument($id: ID!){
  removeLeaseDocument(id: $id){
    success
    message
  }
}`;

export const ACTIVATE_LEASE = gql`
    mutation ActivateLease($id: ID!){
        activateLease(id:$id){
            success
            message
        }
    }
`;

export const TERMINATE_LEASE = gql`
    mutation TerminateLease($id: ID!){
        terminateLease(id:$id){
            success
            message
        }
    }
`;

export const RENEW_LEASE = gql`
    mutation RenewLease($id: ID!, $breakClause: Boolean, $breakClauseDetails: String, $depositAmount: Decimal, $endDate: Date, $internalNotes: String, $latePaymentPenalty: Boolean, $leaseType: String, $nextEscalationDate: Date, $paymentFrequency: String, $renewalOption: Boolean, $renewalTerms: String, $rentAmount: Decimal, $rentEscalationRate: Decimal, $serviceCharge: Decimal, $specialConditions: String, $startDate: Date!) {
  renewLease(
    id: $id
    breakClause: $breakClause,
    breakClauseDetails: $breakClauseDetails,
    depositAmount: $depositAmount,
    endDate: $endDate,
    internalNotes: $internalNotes,
    latePaymentPenalty: $latePaymentPenalty,
    leaseType: $leaseType,
    nextEscalationDate: $nextEscalationDate,
    paymentFrequency: $paymentFrequency,
    renewalOption: $renewalOption,
    renewalTerms: $renewalTerms,
    rentAmount: $rentAmount,
    rentEscalationRate: $rentEscalationRate,
    serviceCharge: $serviceCharge,
    specialConditions: $specialConditions,
    startDate: $startDate,
  ) {
    success
    message
  }
}
`;

// export const UPLOAD_LEASE_DOCUMENT = gql`
// mutation UploadLeaseDocument($leaseId: ID!, $file: Upload!) {
//   uploadLeaseDocument(leaseId: $leaseId, file: $file) {
//     success
//     message
//     document {
//       id
//       fileName
//       url
//     }
//     }
// }`;

export const MARK_LEASE_EXPIRED = gql`
mutation MarkLeaseExpired($id: ID!){
  markLeaseExpired(id:$id){
    success
    message
  }
}
`;

