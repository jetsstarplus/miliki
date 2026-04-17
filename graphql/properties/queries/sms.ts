import { gql } from '@apollo/client';

export const SMS_CREDENTIALS_QUERY = gql`
  query SmsReceiptCredentials($first: Int, $after: String, $isActive: Boolean, $search: String) {
    smsReceiptCredentials(first: $first, after: $after, isActive: $isActive, search: $search) {
      edges {
        node {
          id
          name
          sourcePhoneNumber
          sourceShortcode
          expectedSender
          referenceKeyword
          amountKeyword
          requiredKeywords
          matchRules
          readerConfig
          syncEndpoint
          deviceIdentifier
          isActive
          lastSyncedAt
          lastMessageAt
          syncError
          paymentMode {
            id
            name
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

export const SMS_CREDENTIAL_DETAIL = gql`
  query SmsReceiptCredential($id: ID!) {
    smsReceiptCredential(id: $id) {
      id
      name
      sourcePhoneNumber
      sourceShortcode
      expectedSender
      referenceKeyword
      amountKeyword
      requiredKeywords
      matchRules
      readerConfig
      syncEndpoint
      deviceIdentifier
      isActive
      lastSyncedAt
      lastMessageAt
      syncError
      paymentMode {
        id
        name
      }
    }
  }
`;

export const SMS_MESSAGE_LOGS_QUERY = gql`
  query SmsReceiptMessageLogs(
    $credentialId: ID
    $first: Int
    $after: String
    $extractionStatus: PaymentGatewaysSMSReceiptMessageLogExtractionStatusChoices
  ) {
    smsReceiptMessageLogs(
      credential: $credentialId
      first: $first
      after: $after
      extractionStatus: $extractionStatus
    ) {
      edges {
        node {
          id
          sender
          senderPhone
          messageBody
          messageDate
          isCandidate
          extractionStatus
          matchedAmount
          matchedReference
          payerName
          payerPhone
          syncedAt
          canExtract
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
