import { gql } from '@apollo/client';

export const GATEWAY_CREDENTIAL_LIST_DATA = gql`
  query GatewayCredentialListData($companyId: ID!) {
    gatewayCredentialListData(companyId: $companyId)
  }
`;

export const GATEWAY_CREDENTIAL_FORM_DATA = gql`
  query GatewayCredentialFormData($credentialId: ID) {
    gatewayCredentialFormData(credentialId: $credentialId)
  }
`;

export const GATEWAY_CREDENTIAL_DELETE_DATA = gql`
  query GatewayCredentialDeleteData($credentialId: ID!) {
    gatewayCredentialDeleteData(credentialId: $credentialId)
  }
`;

export const GATEWAY_CREDENTIAL_CALLBACK_HISTORY_DATA = gql`
  query GatewayCredentialCallbackHistoryData($credentialId: ID!) {
    gatewayCredentialCallbackHistoryData(credentialId: $credentialId)
  }
`;
