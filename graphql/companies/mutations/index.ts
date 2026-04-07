import { gql } from "@apollo/client";

export const CREATE_COMPANY_MUTATION = gql`
  mutation CreateCompany(
    $name: String!,
    $companyType: String!,
    $email: String!,
    $phone: String!,
    $city: String,
    $country: String,
    $county: String,
    $physicalAddress: String!,
    $registrationNumber: String,
    $taxNumber: String,
    $currencyId: Int!
  ) {
    createCompany(
      name: $name,
      companyType: $companyType,
      email: $email,
      phone: $phone,
      city: $city,
      country: $country,
      county: $county,
      physicalAddress: $physicalAddress,
      registrationNumber: $registrationNumber,
      taxNumber: $taxNumber,
      currencyId: $currencyId
    ) {
      success
      message
      company {
        id
        name
        companyType
        status
        email
      }
    }
  }
`;

export const UPDATE_COMPANY_MUTATION = gql`
  mutation UpdateCompany(
    $companyId: ID!,
    $name: String,
    $email: String,
    $phone: String,
    $city: String,
    $county: String,
    $country: String,
    $physicalAddress: String,
    $registrationNumber: String,
    $taxNumber: String
  ) {
    updateCompany(
      companyId: $companyId,
      name: $name,
      email: $email,
      phone: $phone,
      city: $city,
      county: $county,
      country: $country,
      physicalAddress: $physicalAddress,
      registrationNumber: $registrationNumber,
      taxNumber: $taxNumber
    ) {
      success
      message
      company {
        id
        name
        companyType
        status
        email
      }
    }
  }
`;

export const SWITCH_COMPANY_MUTATION = gql`
  mutation SwitchCompany($companyId: ID!) {
    switchCompany(companyId: $companyId) {
      success
      message
      company {
        id
        name
        companyType
        status
        email
      }
    }
  }
`;
