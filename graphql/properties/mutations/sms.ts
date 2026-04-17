import { gql } from '@apollo/client';

export const CREATE_UPDATE_SMS_CREDENTIAL = gql`
  mutation CreateUpdateSmsReceiptCredential(
    $id: ID
    $name: String
    $sourcePhoneNumber: String
    $sourceShortcode: String
    $expectedSender: String
    $referenceKeyword: String
    $amountKeyword: String
    $requiredKeywords: GenericScalar
    $matchRules: GenericScalar
    $readerConfig: GenericScalar
    $syncEndpoint: String
    $deviceIdentifier: String
    $isActive: Boolean
    $paymentModeId: ID
  ) {
    createUpdateSmsReceiptCredential(
      id: $id
      name: $name
      sourcePhoneNumber: $sourcePhoneNumber
      sourceShortcode: $sourceShortcode
      expectedSender: $expectedSender
      referenceKeyword: $referenceKeyword
      amountKeyword: $amountKeyword
      requiredKeywords: $requiredKeywords
      matchRules: $matchRules
      readerConfig: $readerConfig
      syncEndpoint: $syncEndpoint
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
