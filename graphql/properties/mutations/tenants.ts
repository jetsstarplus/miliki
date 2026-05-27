import { gql } from "@apollo/client";

export const DELETE_TENANT = gql`
  mutation DeleteTenant($id: ID!) {
    deleteTenant(id: $id) {
      success
      message
    }
  }
`;

export const CREATE_UPDATE_TENANT_MUTATION = gql`
mutation CreateUpdateTenant($id:ID, $firstName: String!, $middleName: String, $lastName: String!, $email: String!, $phone: String!, $emergencyContactName: String, $emergencyContactPhone: String, $emergencyContactRelationship: String, $employer: String, $idNumber: String!, $occupation: String) {
  createUpdateTenant(
    id: $id
    firstName: $firstName
    middleName: $middleName
    lastName: $lastName
    email: $email
    phone: $phone
    emergencyContactName: $emergencyContactName
    emergencyContactPhone: $emergencyContactPhone
    emergencyContactRelationship: $emergencyContactRelationship
    employer: $employer
    idNumber: $idNumber
    occupation: $occupation
  ) {
    tenant {
      id
      createdAt
      modifiedAt
      firstName
      middleName
      lastName
      fullName
      idNumber
      phone
      email
      alternativePhone
      emergencyContactName
      emergencyContactPhone
      emergencyContactRelationship
      occupation
      permanentAddress
      isActive
      blockAutomaticNotifications
      defaultDueDay
      notes
    }
    success
    message
  }
}`;

export const CREATE_OCCUPANCY_MUTATION = gql`
  mutation CreateOccupancy(
    $tenantId: ID!
    $unitId: ID!
    $startDate: Date!
    $paymentPeriod: String
    $scheduleGenerationMode: String
    $skipDepositCharge: Boolean
    $depositPaid: Decimal
    $depositRefunded: Decimal
  ) {
    createOccupancy(
      tenantId: $tenantId
      unitId: $unitId
      startDate: $startDate
      paymentPeriod: $paymentPeriod
      scheduleGenerationMode: $scheduleGenerationMode
      skipDepositCharge: $skipDepositCharge
      depositPaid: $depositPaid
      depositRefunded: $depositRefunded
    ) {
      success
      message
      occupancy {
        id
        isCurrent
        startDate
        unit {
          id
          unitNumber
        }
      }
    }
  }
`;

export const TRANSFER_OCCUPANCY_MUTATION = gql`
  mutation TransferOccupancy(
    $occupancyId: ID!
    $targetUnitId: ID!
    $transferDate: Date!
    $voidPendingCharges: Boolean
    $generateDepositCharge: Boolean
    $scheduleGenerationMode: String
  ) {
    transferOccupancy(
      occupancyId: $occupancyId
      targetUnitId: $targetUnitId
      transferDate: $transferDate
      voidPendingCharges: $voidPendingCharges
      generateDepositCharge: $generateDepositCharge
      scheduleGenerationMode: $scheduleGenerationMode
    ) {
      success
      message
      voidedCount
      voidedTotal
      depositChargeCreated
      newOccupancy {
        id
        startDate
        isCurrent
        unit {
          id
          unitNumber
        }
      }
    }
  }
`;

export const CREATE_VACATION_NOTICE_MUTATION = gql`
  mutation CreateVacationNotice(
    $occupancyId: ID!
    $vacationDate: Date!
    $balanceToPay: Decimal
    $message: String
  ) {
    createVacationNotice(
      occupancyId: $occupancyId
      vacationDate: $vacationDate
      balanceToPay: $balanceToPay
      message: $message
    ) {
      success
      message
      noticeId
      vacationDateOut
    }
  }
`;

export const CANCEL_VACATION_NOTICE_MUTATION = gql`
  mutation CancelVacationNotice($noticeId: ID!, $reason: String) {
    cancelVacationNotice(noticeId: $noticeId, reason: $reason) {
      success
      message
    }
  }
`;

export const SEND_TENANT_CUSTOM_MESSAGE_MUTATION = gql`
  mutation SendTenantCustomMessage(
    $tenantId: ID!
    $subject: String
    $message: String!
    $sendEmail: Boolean
    $sendSms: Boolean
    $sendInApp: Boolean
    $sendWhatsapp: Boolean
  ) {
    sendTenantCustomMessage(
      tenantId: $tenantId
      subject: $subject
      message: $message
      sendEmail: $sendEmail
      sendSms: $sendSms
      sendInApp: $sendInApp
      sendWhatsapp: $sendWhatsapp
    ) {
      success
      message
      sent
      details
    }
  }
`;

export const GENERATE_TENANT_RENT_SCHEDULE_MUTATION = gql`
  mutation GenerateTenantRentSchedule(
    $tenantId: ID!
    $month: Int!
    $year: Int!
    $dueDay: Int
    $skipExisting: Boolean
  ) {
    generateTenantRentSchedule(
      tenantId: $tenantId
      month: $month
      year: $year
      dueDay: $dueDay
      skipExisting: $skipExisting
    ) {
      success
      message
      queued
    }
  }
`;
