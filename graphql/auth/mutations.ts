import { gql } from '@apollo/client';

export const REGISTER_MEMBER_MOBILE_MUTATION = gql`
  mutation RegisterMemberMobile(
    $firstName: String!
    $lastName: String!
    $email: String!
    $phone: String
    $password1: String!
    $password2: String!
    $role: String!
  ) {
    registerMemberMobile(
      firstName: $firstName
      lastName: $lastName
      email: $email
      phoneNumber: $phone
      password1: $password1
      password2: $password2
      role: $role
    ) {
      success
      message
      otpChannels
      otpExpiresInSeconds
      user {
        id
        email
        firstName
        lastName
        verified
      }
    }
  }
`;

export const VERIFY_REGISTRATION_OTP_MUTATION = gql`
  mutation VerifyRegistrationOtp($email: String!, $code: String!) {
    verifyRegistrationOtp(email: $email, code: $code) {
      success
      message
      user {
        id
        email
        verified
      }
    }
  }
`;

export const RESEND_REGISTRATION_OTP_MUTATION = gql`
  mutation ResendRegistrationOtp($email: String!) {
    resendRegistrationOtp(email: $email) {
      success
      message
      otpChannels
      otpExpiresInSeconds
    }
  }
`;

export const SEND_PASSWORD_RESET_OTP_MUTATION = gql`
  mutation SendPasswordResetOtp($email: String, $phoneNumber: String) {
    sendPasswordResetOtp(email: $email, phoneNumber: $phoneNumber) {
      success
      message
      otpChannels
      otpExpiresInSeconds
    }
  }
`;

export const RESET_PASSWORD_WITH_OTP_MUTATION = gql`
  mutation ResetPasswordWithOtp(
    $email: String
    $phoneNumber: String
    $code: String!
    $newPassword1: String!
    $newPassword2: String!
  ) {
    resetPasswordWithOtp(
      email: $email
      phoneNumber: $phoneNumber
      code: $code
      newPassword1: $newPassword1
      newPassword2: $newPassword2
    ) {
      success
      message
    }
  }
`;
