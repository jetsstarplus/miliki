import { gql } from '@apollo/client';

export const INITIATE_MPESA_TOPUP = gql`
  mutation InitiateMpesaTopup($subscriptionId: ID!, $phoneNumber: String!, $paymentFor: String!, $amountOverride: Decimal) {
    initiateMpesaPayment(
      subscriptionId: $subscriptionId
      phoneNumber: $phoneNumber
      paymentFor: $paymentFor
      amountOverride: $amountOverride
    ) {
      success
      message
      payment {
        id
        status
        amount
      }
    }
  }
`;

export const INITIATE_CARD_PAYMENT = gql`
  mutation InitiateCardPayment(
    $subscriptionId: ID!
    $customerEmail: String
    $setupStandingOrder: Boolean
    $paymentFor: String
    $amountOverride: Decimal
  ) {
    initiateCardPayment(
      subscriptionId: $subscriptionId
      customerEmail: $customerEmail
      setupStandingOrder: $setupStandingOrder
      paymentFor: $paymentFor
      amountOverride: $amountOverride
    ) {
      success
      message
      authorizationUrl
      payment {
        id
        status
      }
    }
  }
`;

export const VERIFY_PAYSTACK_PAYMENT = gql`
  mutation VerifyPaystackPayment($reference: String!) {
    verifyPaystackPayment(reference: $reference) {
      success
      message
      payment {
        id
        status
      }
    }
  }
`;
