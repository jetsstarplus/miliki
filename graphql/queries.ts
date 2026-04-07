import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      firstName
      lastName
      verified
      companies {
        edges {
          node {
            id
            name
            companyType
            status
            email
          }
        }
      }
    }
  }
`;

export const COMPANIES_QUERY = gql`
  query Companies {
    companies {
      edges {
        node {
          id
          name
          companyType
          status
          email
          city
          country
          logo
        }
      }
    }
  }
`;

export const USER_ROLES_QUERY = gql`
  query UserRoles {
    userRoles {
      edges {
        node {
          id
          role
          isPrimary
          isActive
          company {
            id
            name
            companyType
            status
            email
          }
        }
      }
    }
  }
`;

export const COMPANY_MEMBERSHIPS_QUERY = gql`
  query CompanyMemberships {
    companyMemberships {
      edges {
        node {
          id
          role
          status
          company {
            id
            name
            companyType
            status
            email
          }
        }
      }
    }
  }
`;

export const COMPANY_DETAIL_QUERY = gql`
  query CompanyDetail($id: ID!) {
    company(id: $id) {
      id
      name
      email
      phone
      city
      county
      country
      physicalAddress
      registrationNumber
      taxNumber
      companyType
      status
    }
  }
`;
