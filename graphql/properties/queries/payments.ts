import { gql } from '@apollo/client';

/**
 * Payments & Allocation (Section 11)
 */

export const PAYMENT_RECEIPTS_QUERY = gql`
  query PaymentReceipts(
    $buildingId: ID, $unitId: ID, $tenantId: ID,
    $dateFrom: Date, $dateTo: Date, $allocationStatus: String
  ) {
    paymentReceipts(
      buildingId: $buildingId, unitId: $unitId, tenantId: $tenantId,
      dateFrom: $dateFrom, dateTo: $dateTo, allocationStatus: $allocationStatus
    ) {
      id
      amount
      status
      reference
      confirmationCode
      transactionDate
      tenant { fullName }
      unit { unitNumber }
      transactionLines { amount paymentType { name } }
    }
  }
`;

export const PAYMENT_RECEIPT_PDF_QUERY = gql`
  query PaymentReceiptPdf($paymentId: Int!) {
    paymentReceiptPdf(paymentId: $paymentId) {
      success
      filename
      pdfBase64
    }
  }
`;

export const PAYMENT_ALLOCATION_BREAKDOWN_QUERY = gql`
  query PaymentAllocationBreakdown($unitId: Int!) {
    paymentAllocationBreakdown(unitId: $unitId)
  }
`;

export const PREVIEW_PAYMENT_ALLOCATION_QUERY = gql`
  query PreviewPaymentAllocation($unitId: Int!, $amount: Decimal!) {
    previewPaymentAllocation(unitId: $unitId, amount: $amount)
  }
`;

export const UNMATCHED_PAYMENTS_QUERY = gql`
  query UnmatchedPayments {
    unmatchedPayments
  }
`;
