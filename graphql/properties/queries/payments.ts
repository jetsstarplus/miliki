import { gql } from '@apollo/client';

export const CONFIG_PAYMENT_MODES_QUERY = gql`
  query ConfigPaymentModes {
    configPaymentModes(first: 100) {
      edges {
        node {
          id
          name
          code
          category
          isActive
          requiresReference
        }
      }
    }
  }
`;

export const PAYMENT_RECEIPTS_QUERY = gql`
  query transactions(
    $first: Int
    $after: String
    $buildingId: ID
    $unitId: ID
    $tenantId: ID
    $search: String
    $allocationStatus: String
  ) {
    transactions(
      first: $first
      after: $after
      buildingId: $buildingId
      unitId: $unitId
      tenantId: $tenantId
      search: $search
      allocationStatus: $allocationStatus
    ) {
      edges {
        node {
          id
          paymentId
          amount
          status
          reference
          confirmationCode
          transactionDate
          paymentMode
          allocationStatus
          canAllocate
          transactionLinesCount
          allocationAction {
            label
          }
          tenant {
            id
            fullName
          }
          unit {
            id
            unitNumber
            building {
              name
            }
          }
          transactionLines {
            edges {
              node {
                amount
                paymentType {
                  name
                }
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
  }
`;

export const MANUAL_RECEIPTS_QUERY = gql`
  query ManualReceipts(
    $first: Int!
    $after: String
    $state: DarajaManualReceiptStateChoices
    $search: String
  ) {
    manualReceipts(
      first: $first
      after: $after
      state: $state
      search: $search
    ) {
      edges {
        node {
          id
          receiptNumber
          payerName
          amount
          paymentDate
          state
          stateLabel
          paymentMethod
          canValidate
          canReject
          canDelete
          canCreatePayment
          tenant {
            id
            fullName
          }
          unit {
            id
            unitNumber
            building {
              id
              name
            }
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

export const MANUAL_RECEIPT_DETAIL = gql`
  query ManualReceiptDetail($id: ID!) {
    manualReceipt(id: $id) {
      id
      receiptNumber
      firstName
      middleName
      lastName
      payerName
      phoneNumber
      email
      amount
      paymentDate
      paymentMethod
      paymentMethodConfig {
        id
        name
        code
        requiresReference
      }
      referenceNumber
      notes
      state
      stateLabel
      validatedAt
      validatedBy { id firstName lastName }
      rejectionReason
      canValidate
      canReject
      canDelete
      canCreatePayment
      tenant {
        id
        fullName
      }
      unit {
        id
        unitNumber
        building {
          id
          name
        }
      }
      paymentTransaction {
        id
        no
        amount
        status
        transactionDate
      }
      paymentTransactionLines {
        description
        amount
      }
    }
  }
`;

export const UNRECONCILED_GATEWAY_BUFFERS_QUERY = gql`
  query UnreconciledGatewayBuffers(
    $first: Int!
    $after: String
    $search: String
    $paymentDate_Gte: DateTime
    $paymentDate_Lte: DateTime
  ) {
    unreconciledGatewayBuffers(
      first: $first
      after: $after
      search: $search
      paymentDate_Gte: $paymentDate_Gte
      paymentDate_Lte: $paymentDate_Lte
    ) {
      edges {
        node {
          id
          reference
          amount
          currency
          payerName
          payerPhone
          paymentDate
          source
          externalReference
          invoiceNumber
          canReconcile
          matchedTransactionId
          lineCount
          linesTotalAmount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GATEWAY_BUFFER_DETAIL = gql`
  query GatewayBufferDetail($id: ID!) {
    gatewayBuffer(id: $id) {
      id
      reference
      amount
      currency
      payerName
      payerPhone
      paymentDate
      source
      externalReference
      invoiceNumber
      sourceDocumentNumber
      extraData
      matchedTransactionId
      canReconcile
      lineCount
      linesTotalAmount
      lines(first: 20) {
        edges {
          node {
            id
            amount
            paymentTypeName
          }
        }
      }
    }
  }
`;

