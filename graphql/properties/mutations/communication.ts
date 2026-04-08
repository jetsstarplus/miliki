import { gql } from "@apollo/client";

export const CREATE_UPDATE_CAMPAIGN = gql`
  mutation CreateUpdateCampaign(
    $id: Int
    $name: String!
    $subject: String!
    $message: String!
    $buildingId: Int
    $filterType: String
    $minBalanceAmount: Decimal
    $tenantIds: [Int]
    $sendEmail: Boolean
    $sendSms: Boolean
    $sendWhatsapp: Boolean
    $frequency: String
    $scheduledDatetime: DateTime
  ) {
    createUpdateNotificationCampaignView(
      id: $id
      name: $name
      subject: $subject
      message: $message
      buildingId: $buildingId
      filterType: $filterType
      minBalanceAmount: $minBalanceAmount
      tenantIds: $tenantIds
      sendEmail: $sendEmail
      sendSms: $sendSms
      sendWhatsapp: $sendWhatsapp
      frequency: $frequency
      scheduledDatetime: $scheduledDatetime
    ) {
      result {
        success
        message
        payload
      }
    }
  }
`;

export const SEND_CAMPAIGN = gql`
  mutation SendCampaign($campaignId: Int!) {
    sendNotificationCampaignView(campaignId: $campaignId) {
      result {
        success
        message
      }
    }
  }
`;

export const DELETE_CAMPAIGN = gql`
  mutation DeleteCampaign($campaignId: Int!) {
    deleteNotificationCampaignView(campaignId: $campaignId) {
      result {
        success
        message
      }
    }
  }
`;

export const TOGGLE_CAMPAIGN = gql`
  mutation ToggleCampaign($campaignId: Int!) {
    toggleNotificationCampaignView(campaignId: $campaignId) {
      result {
        success
        message
      }
    }
  }
`;

export const INITIATE_MPESA_TOPUP = gql`
  mutation InitiateMpesaTopup($subscriptionId: Int!, $phoneNumber: String!, $paymentFor: String!, $amountOverride: Decimal) {
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
