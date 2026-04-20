import { gql } from '@apollo/client';

export const ALLOCATE_PAYMENT = gql`
  mutation AllocatePayment($paymentId: ID!) {
    allocatePayment(paymentId: $paymentId) {
      success
      message
      allocatedAmount
      remainingAmount
    }
  }
`;

export const CREATE_MANUAL_RECEIPT = gql`
  mutation CreateManualReceipt($input: CreateManualReceiptInput!) {
    createManualReceipt(input: $input) {
      manualReceipt {
        id
        receiptNumber
        state
        stateLabel
      }
    }
  }
`;

export const VALIDATE_MANUAL_RECEIPT = gql`
  mutation ValidateManualReceipt($receiptId: ID!) {
    validateManualReceipt(input: { receiptId: $receiptId }) {
      manualReceipt {
        id
        state
        stateLabel
        paymentTransaction {
          id
        }
      }
      paymentId
      message
    }
  }
`;

export const REJECT_MANUAL_RECEIPT = gql`
  mutation RejectManualReceipt($receiptId: ID!, $reason: String!) {
    rejectManualReceipt(input: { receiptId: $receiptId, reason: $reason }) {
      manualReceipt {
        id
        state
        stateLabel
        rejectionReason
      }
      message
    }
  }
`;

export const DELETE_MANUAL_RECEIPT = gql`
  mutation DeleteManualReceipt($receiptId: ID!) {
    deleteManualReceipt(input: { receiptId: $receiptId }) {
      success
      message
    }
  }
`;

export const CREATE_MANUAL_RECEIPT_PAYMENT = gql`
  mutation CreateManualReceiptPayment($receiptId: ID!) {
    createManualReceiptPayment(input: { receiptId: $receiptId }) {
      manualReceipt {
        id
        state
        stateLabel
        paymentTransaction {
          id
        }
      }
      paymentId
      message
    }
  }
`;

export const RECONCILE_GATEWAY_BUFFER = gql`
  mutation ReconcileGatewayBuffer($gatewayBufferId: ID!, $unitId: ID, $tenantId: ID) {
    reconcileGatewayBuffer(
      input: { gatewayBufferId: $gatewayBufferId, unitId: $unitId, tenantId: $tenantId }
    ) {
      gatewayBuffer {
        id
        reference
        externalReference
        matchedTransactionId
        canReconcile
      }
      transaction {
        id
        no
        amount
        status
      }
      message
    }
  }
`;
