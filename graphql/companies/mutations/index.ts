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
