import { gql } from '@apollo/client';

export const CREATE_GATEWAY_CREDENTIAL = gql`
  mutation CreateGatewayCredential($input: CreateGatewayCredentialInput!) {
    createGatewayCredential(input: $input) {
      success
      message
      gatewayCredential {
        id
        gatewayCode
        name
      }
    }
  }
`;

export const UPDATE_GATEWAY_CREDENTIAL = gql`
  mutation UpdateGatewayCredential($input: UpdateGatewayCredentialInput!) {
    updateGatewayCredential(input: $input) {
      success
      message
      gatewayCredential {
        id
        gatewayCode
        name
      }
    }
  }
`;

export const DELETE_GATEWAY_CREDENTIAL_RELAY = gql`
  mutation DeleteGatewayCredentialRelay($input: DeleteGatewayCredentialRelayInput!) {
    deleteGatewayCredentialRelay(input: $input) {
      success
      message
      credentialId
    }
  }
`;

export const ROTATE_GATEWAY_WEBHOOK_CREDENTIALS = gql`
  mutation RotateGatewayWebhookCredentials($input: RotateGatewayWebhookCredentialsInput!) {
    rotateGatewayWebhookCredentials(input: $input) {
      success
      message
      credentialId
      webhookClientKey
      webhookClientSecret
      webhookBasicAuthHeader
    }
  }
`;
