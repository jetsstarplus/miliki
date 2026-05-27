import { gql } from '@apollo/client';

export const MPESA_SETUP_LIST_DATA = gql`
  query MpesaSetupListData($companyId: ID!) {
    mpesaSetupListData(companyId: $companyId)
  }
`;

export const MPESA_SETUP_DETAIL_DATA = gql`
  query MpesaSetupDetailData($setupId: ID!) {
    mpesaSetupDetailData(setupId: $setupId)
  }
`;

export const MPESA_SETUP_FORM_DATA = gql`
  query MpesaSetupFormData($setupId: ID) {
    mpesaSetupFormData(setupId: $setupId)
  }
`;

export const MPESA_SETUP_DELETE_DATA = gql`
  query MpesaSetupDeleteData($setupId: ID!) {
    mpesaSetupDeleteData(setupId: $setupId)
  }
`;
