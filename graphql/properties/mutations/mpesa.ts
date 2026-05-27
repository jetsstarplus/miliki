import { gql } from '@apollo/client';

export const CREATE_MPESA_SETUP = gql`
  mutation CreateMpesaSetup($input: CreateMpesaSetupInput!) {
    createMpesaSetup(input: $input) {
      success
      message
      setupId
      encryptedId
    }
  }
`;

export const UPDATE_MPESA_SETUP = gql`
  mutation UpdateMpesaSetup($input: UpdateMpesaSetupInput!) {
    updateMpesaSetup(input: $input) {
      success
      message
      setupId
      encryptedId
    }
  }
`;

export const DELETE_MPESA_SETUP = gql`
  mutation DeleteMpesaSetup($input: DeleteMpesaSetupInput!) {
    deleteMpesaSetup(input: $input) {
      success
      message
      setupId
    }
  }
`;

export const TOGGLE_MPESA_SETUP_ACTIVE = gql`
  mutation ToggleMpesaSetupActive($input: ToggleMpesaSetupActiveInput!) {
    toggleMpesaSetupActive(input: $input) {
      success
      message
      setupId
      active
    }
  }
`;

export const REGISTER_MPESA_SETUP_C2B = gql`
  mutation RegisterMpesaSetupC2B($input: RegisterMpesaSetupC2BInput!) {
    registerMpesaSetupC2b(input: $input) {
      success
      message
      response
    }
  }
`;

export const REGISTER_MPESA_SETUP_PULL = gql`
  mutation RegisterMpesaSetupPull($input: RegisterMpesaSetupPullInput!) {
    registerMpesaSetupPull(input: $input) {
      success
      message
      response
    }
  }
`;

export const CHECK_MPESA_SETUP_BALANCE = gql`
  mutation CheckMpesaSetupBalance($input: CheckMpesaSetupBalanceInput!) {
    checkMpesaSetupBalance(input: $input) {
      success
      message
      response
    }
  }
`;

export const FETCH_MPESA_SETUP_PULL = gql`
  mutation FetchMpesaSetupPull($input: FetchMpesaSetupPullInput!) {
    fetchMpesaSetupPull(input: $input) {
      success
      message
      response
    }
  }
`;
