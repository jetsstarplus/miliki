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

/**
 * Auth Context & Session Hydration (Section 1)
 * Call immediately after login to populate role, company, and permission state.
 */
export const AUTH_CONTEXT_QUERY = gql`
  query AuthContext {
    authContext
    companiesContext
    me {
      id
      email
      firstName
      lastName
    }
  }
`;
