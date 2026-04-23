import { gql } from '@apollo/client';

export const REGISTER_MUTATION = gql`
  mutation Register(
    $firstName: String
    $lastName: String
    $email: String!
    $username: String!
    $password1: String!
    $password2: String!
  ) {
    register(
      input: {
        firstName: $firstName
        lastName: $lastName
        email: $email
        username: $username
        password1: $password1
        password2: $password2
      }
    ) {
      success
      errors
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($email: String, $password: String!) {
    tokenAuth(input: {email: $email, password: $password}) {
      success
      errors
      token
      refreshToken
      user {
        id
        username
        email
        firstName
        lastName
        verified
        phoneNumber
        preferences{
          lastCompanyId
          currentRole
          theme
          itemsPerPage
          emailNotifications
          smsNotifications
        }
        companyMemberships {
          edges {
            node {
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
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(input: { refreshToken: $refreshToken }) {
      success
      errors
      token
      refreshToken
    }
  }
`;

export const VERIFY_ACCOUNT_MUTATION = gql`
  mutation VerifyAccount($token: String!) {
    verifyAccount(input: { token: $token }) {
      success
      errors
    }
  }
`;

export const RESEND_ACTIVATION_EMAIL_MUTATION = gql`
  mutation ResendActivationEmail($email: String!) {
    resendActivationEmail(input: { email: $email }) {
      success
      errors
    }
  }
`;

export const SEND_PASSWORD_RESET_EMAIL_MUTATION = gql`
  mutation SendPasswordResetEmail($email: String!) {
    sendPasswordResetEmail(input: { email: $email }) {
      success
      errors
    }
  }
`;

export const PASSWORD_RESET_MUTATION = gql`
  mutation PasswordReset($token: String!, $newPassword1: String!, $newPassword2: String!) {
    passwordReset(input: { token: $token, newPassword1: $newPassword1, newPassword2: $newPassword2 }) {
      success
      errors
    }
  }
`;

export const PASSWORD_CHANGE_MUTATION = gql`
  mutation PasswordChange($oldPassword: String!, $newPassword1: String!, $newPassword2: String!) {
    passwordChange(input: { oldPassword: $oldPassword, newPassword1: $newPassword1, newPassword2: $newPassword2 }) {
      success
      errors
      refreshToken
    }
  }
`;

