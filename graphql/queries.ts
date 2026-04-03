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
