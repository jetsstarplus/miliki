import { gql } from '@apollo/client';

export const CREATE_UPDATE_SMS_CREDENTIAL = gql`
  mutation CreateUpdateSmsReceiptCredential(
    $id: ID
    $name: String
    $messageKeyword: String
    $expectedSender: String
    $referenceKeyword: String
    $externalReferenceKeyword: String
    $amountKeyword: String
    $requiredKeywords: GenericScalar
    $matchRules: GenericScalar
    $readerConfig: GenericScalar
    $deviceIdentifier: String
    $isActive: Boolean
    $paymentModeId: ID
  ) {
    createUpdateSmsReceiptCredential(
      id: $id
      name: $name
      messageKeyword: $messageKeyword
      expectedSender: $expectedSender
      referenceKeyword: $referenceKeyword
      externalReferenceKeyword: $externalReferenceKeyword
      amountKeyword: $amountKeyword
      requiredKeywords: $requiredKeywords
      matchRules: $matchRules
      readerConfig: $readerConfig
      deviceIdentifier: $deviceIdentifier
      isActive: $isActive
      paymentModeId: $paymentModeId
    ) {
      success
      message
      smsReceiptCredential {
        id
        name
        isActive
        deviceIdentifier
        lastSyncedAt
      }
    }
  }
`;

export const SYNC_SMS_RECEIPT_MESSAGES_SUMMARY = gql`
  mutation SyncSmsReadMessages($input: SyncSMSReceiptMessagesSummaryMutationInput!) {
    syncSmsReceiptMessagesSummary(input: $input) {
      success
      message
      createdCount
      updatedCount
      skippedCount
      lastSyncedAt
      credential {
        id
        name
        lastSyncedAt
        lastMessageAt
        syncError
      }
      clientMutationId
    }
  }
`;

export const RE_EXTRACT_PENDING_SMS_RECEIPTS = gql`
  mutation ReExtractPendingSmsReceipts($input: ReExtractPendingSMSReceiptsMutationInput!) {
    reExtractPendingSmsReceipts(input: $input) {
      success
      message
      parsedCount
      bufferedCount
      skippedCount
      failedCount
      credential {
        id
        lastSyncedAt
        syncError
      }
      clientMutationId
    }
  }
`;

export const DELETE_SMS_CREDENTIAL = gql`
  mutation DeleteSmsReceiptCredential($id: ID!) {
    deleteSmsReceiptCredential(id: $id) {
      success
      message
    }
  }
`;

export const EXTRACT_SMS_TO_BUFFER = gql`
  mutation ExtractSmsReceiptToGatewayBuffer($id: ID!) {
    extractSmsReceiptToGatewayBuffer(id: $id) {
      success
      message
      gatewayBufferId
    }
  }
`;
