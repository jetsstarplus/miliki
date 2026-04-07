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

// ─── Company Management (Section 2) ──────────────────────────────────────────

export const SWITCH_COMPANY_MUTATION = gql`
  mutation SwitchCompany($companyId: UUID!) {
    switchCompany(companyId: $companyId) {
      success
      message
      company { id name email phone }
    }
  }
`;

export const CREATE_COMPANY_MUTATION = gql`
  mutation CreateCompany(
    $name: String!, $companyType: String!, $email: String!,
    $phone: String!, $physicalAddress: String!, $currencyId: Int!
  ) {
    createCompany(
      name: $name, companyType: $companyType, email: $email,
      phone: $phone, physicalAddress: $physicalAddress, currencyId: $currencyId
    ) {
      success
      message
      company { id name }
    }
  }
`;

export const UPDATE_COMPANY_MUTATION = gql`
  mutation UpdateCompany(
    $companyId: UUID!, $name: String, $email: String, $phone: String,
    $city: String, $county: String, $country: String
  ) {
    updateCompany(
      companyId: $companyId, name: $name, email: $email, phone: $phone,
      city: $city, county: $county, country: $country
    ) {
      success
      message
      company { id name }
    }
  }
`;

export const ADD_COMPANY_MEMBER_MUTATION = gql`
  mutation AddMember(
    $companyId: UUID!, $email: String!, $firstName: String!,
    $lastName: String!, $role: String!
  ) {
    addCompanyMember(
      companyId: $companyId, email: $email, firstName: $firstName,
      lastName: $lastName, role: $role
    ) {
      success
      message
      membership { id role }
    }
  }
`;

export const INVITE_COMPANY_MEMBER_MUTATION = gql`
  mutation InviteCompanyMember(
    $companyId: UUID!, $email: String!, $role: String!, $message: String
  ) {
    inviteCompanyMember(
      companyId: $companyId, email: $email, role: $role, message: $message
    ) {
      success
      message
    }
  }
`;

// ─── Subscription Management (Section 3) ─────────────────────────────────────

export const INITIATE_MPESA_PAYMENT_MUTATION = gql`
  mutation InitiateMpesaPayment(
    $subscriptionId: Int!, $phoneNumber: String!, $paymentFor: String
  ) {
    initiateMpesaPayment(
      subscriptionId: $subscriptionId, phoneNumber: $phoneNumber, paymentFor: $paymentFor
    ) {
      success
      message
      payment { id status amount }
    }
  }
`;

export const INITIATE_CARD_PAYMENT_MUTATION = gql`
  mutation InitiateCardPayment(
    $subscriptionId: Int!, $customerEmail: String,
    $setupStandingOrder: Boolean, $paymentFor: String
  ) {
    initiateCardPayment(
      subscriptionId: $subscriptionId, customerEmail: $customerEmail,
      setupStandingOrder: $setupStandingOrder, paymentFor: $paymentFor
    ) {
      success
      message
      authorizationUrl
      payment { id status }
    }
  }
`;

export const VERIFY_PAYSTACK_PAYMENT_MUTATION = gql`
  mutation VerifyPayment($reference: String!) {
    verifyPaystackPayment(reference: $reference) {
      success
      message
      payment { id status }
    }
  }
`;

// ─── Occupancy Management (Section 8) ────────────────────────────────────────

export const CREATE_OCCUPANCY_MUTATION = gql`
  mutation CreateOccupancy(
    $unitId: Int!, $tenantId: Int!, $startDate: Date!,
    $rentAmount: Decimal!, $deposit: Decimal!, $notes: String
  ) {
    createOccupancy(
      unitId: $unitId, tenantId: $tenantId, startDate: $startDate,
      rentAmount: $rentAmount, deposit: $deposit, notes: $notes
    ) {
      success
      message
      occupancy {
        id
        startDate
        tenant { fullName }
        unit { unitNumber }
      }
    }
  }
`;

export const CREATE_VACATION_NOTICE_MUTATION = gql`
  mutation CreateVacationNotice(
    $occupancyId: Int!, $noticeDate: Date!,
    $expectedVacationDate: Date!, $reason: String
  ) {
    createVacationNotice(
      occupancyId: $occupancyId, noticeDate: $noticeDate,
      expectedVacationDate: $expectedVacationDate, reason: $reason
    ) {
      success
      message
      vacationNotice { id status expectedVacationDate }
    }
  }
`;

// ─── Rent Schedules (Section 9) ───────────────────────────────────────────────

export const VOID_RENT_SCHEDULE_MUTATION = gql`
  mutation VoidRentSchedule($rentScheduleId: Int!, $voidReason: String) {
    voidRentSchedule(rentScheduleId: $rentScheduleId, voidReason: $voidReason) {
      success
      message
    }
  }
`;

export const BULK_GENERATE_RENT_SCHEDULES_MUTATION = gql`
  mutation BulkGenerateRentSchedules(
    $buildingId: Int!, $fromDate: Date!, $toDate: Date!
  ) {
    bulkGenerateRentSchedules(
      buildingId: $buildingId, fromDate: $fromDate, toDate: $toDate
    ) {
      success
      message
      queued
    }
  }
`;

// ─── Tenant Charges (Section 10) ──────────────────────────────────────────────

export const POST_TENANT_EXTRA_CHARGE_MUTATION = gql`
  mutation PostTenantExtraCharge(
    $tenantId: Int!, $unitId: Int!, $description: String!,
    $amount: Decimal!, $chargeDate: Date!, $serviceTypeId: Int
  ) {
    postTenantExtraCharge(
      tenantId: $tenantId, unitId: $unitId, description: $description,
      amount: $amount, chargeDate: $chargeDate, serviceTypeId: $serviceTypeId
    ) {
      success
      message
      charge { id amount status description }
    }
  }
`;

export const VOID_TENANT_CHARGE_MUTATION = gql`
  mutation VoidTenantCharge($chargeId: Int!, $voidReason: String) {
    voidTenantCharge(chargeId: $chargeId, voidReason: $voidReason) {
      success
      message
    }
  }
`;

// ─── Payments & Allocation (Section 11) ───────────────────────────────────────

export const ALLOCATE_PAYMENT_MUTATION = gql`
  mutation AllocatePayment(
    $transactionId: ID!, $unitId: Int!, $tenantId: Int
  ) {
    allocatePayment(
      transactionId: $transactionId, unitId: $unitId, tenantId: $tenantId
    ) {
      success
      message
      allocatedAmount
      remainingAmount
    }
  }
`;

export const INITIATE_UNIT_PAYMENT_MUTATION = gql`
  mutation InitiateUnitPayment(
    $phone: String!, $accountNumber: String!, $amount: String!,
    $email: String, $name: String
  ) {
    initiateUnitPayment(
      input: { phone: $phone, accountNumber: $accountNumber, amount: $amount, email: $email, name: $name }
    ) {
      initiate { id amount phone reference status }
    }
  }
`;

export const VALIDATE_C2B_PAYMENT_MUTATION = gql`
  mutation ValidateC2BPayment($paymentId: Int!, $unitId: Int!, $amount: Decimal) {
    validateC2bPayment(paymentId: $paymentId, unitId: $unitId, amount: $amount) {
      success
      message
    }
  }
`;

// ─── Building Extra Charges (Section 12) ──────────────────────────────────────

export const CREATE_EXTRA_CHARGE_DEFINITION_MUTATION = gql`
  mutation CreateExtraChargeDefinition(
    $buildingId: Int!, $name: String!, $chargeType: String!,
    $fixedAmount: Decimal, $ratePerUnit: Decimal, $unitLabel: String,
    $description: String, $serviceTypeId: Int
  ) {
    createExtraChargeDefinition(
      buildingId: $buildingId, name: $name, chargeType: $chargeType,
      fixedAmount: $fixedAmount, ratePerUnit: $ratePerUnit, unitLabel: $unitLabel,
      description: $description, serviceTypeId: $serviceTypeId
    ) {
      success
      message
      definition { id name chargeType }
    }
  }
`;

export const APPLY_BUILDING_EXTRA_CHARGES_MUTATION = gql`
  mutation ApplyBuildingExtraCharges(
    $buildingId: Int!, $definitionId: Int!,
    $billingPeriodStart: Date!, $rows: [ExtraChargeRowInput!]!
  ) {
    applyBuildingExtraCharges(
      buildingId: $buildingId, definitionId: $definitionId,
      billingPeriodStart: $billingPeriodStart, rows: $rows
    ) {
      success
      message
      appliedCount
    }
  }
`;

// ─── Notifications (Section 16) ───────────────────────────────────────────────

export const MARK_USER_NOTIFICATION_READ_MUTATION = gql`
  mutation MarkRead($notificationId: Int!, $isRead: Boolean!) {
    markUserNotificationRead(notificationId: $notificationId, isRead: $isRead) {
      success
    }
  }
`;

export const CREATE_UPDATE_CAMPAIGN_MUTATION = gql`
  mutation CreateUpdateCampaign(
    $id: Int, $name: String!, $subject: String!, $message: String!,
    $buildingId: Int, $filterType: String, $minBalanceAmount: Decimal,
    $sendEmail: Boolean, $sendSms: Boolean, $sendWhatsapp: Boolean,
    $frequency: String, $scheduledDatetime: DateTime
  ) {
    createUpdateNotificationCampaign(
      id: $id, name: $name, subject: $subject, message: $message,
      buildingId: $buildingId, filterType: $filterType, minBalanceAmount: $minBalanceAmount,
      sendEmail: $sendEmail, sendSms: $sendSms, sendWhatsapp: $sendWhatsapp,
      frequency: $frequency, scheduledDatetime: $scheduledDatetime
    ) {
      result { success message payload }
    }
  }
`;

export const SEND_NOTIFICATION_CAMPAIGN_MUTATION = gql`
  mutation SendNotificationCampaign($campaignId: Int!) {
    sendNotificationCampaign(campaignId: $campaignId) {
      success
      message
    }
  }
`;

export const DELETE_NOTIFICATION_CAMPAIGN_MUTATION = gql`
  mutation DeleteNotificationCampaign($campaignId: Int!) {
    deleteNotificationCampaign(campaignId: $campaignId) {
      success
      message
    }
  }
`;

// ─── Accounting (Section 17) ──────────────────────────────────────────────────

export const CREATE_JOURNAL_ENTRY_MUTATION = gql`
  mutation CreateJournalEntry(
    $companyId: UUID!, $entryNumber: String!, $entryDate: Date!,
    $entryType: String!, $description: String, $reference: String
  ) {
    createJournalEntry(
      companyId: $companyId, entryNumber: $entryNumber, entryDate: $entryDate,
      entryType: $entryType, description: $description, reference: $reference
    ) {
      success
      message
      entry { id entryNumber }
    }
  }
`;

export const CREATE_TENANT_CREDIT_MUTATION = gql`
  mutation CreateTenantCredit(
    $tenantId: Int!, $companyId: UUID!, $amount: Decimal!,
    $description: String!, $creditDate: Date!
  ) {
    createTenantCredit(
      tenantId: $tenantId, companyId: $companyId, amount: $amount,
      description: $description, creditDate: $creditDate
    ) {
      success
      message
    }
  }
`;

export const CREATE_TENANT_REFUND_MUTATION = gql`
  mutation CreateTenantRefund(
    $tenantId: Int!, $companyId: UUID!, $amount: Decimal!,
    $description: String!, $refundDate: Date!
  ) {
    createTenantRefund(
      tenantId: $tenantId, companyId: $companyId, amount: $amount,
      description: $description, refundDate: $refundDate
    ) {
      success
      message
    }
  }
`;

// ─── Rent Schedule Config & Penalties (Section 14) ────────────────────────────

export const CREATE_PENALTY_RULE_MUTATION = gql`
  mutation CreatePenaltyRule(
    $buildingId: Int!, $name: String!, $priority: Int!,
    $penaltyType: String!, $amount: Decimal, $rate: Decimal,
    $gracePeriodDays: Int, $isActive: Boolean
  ) {
    createPenaltyRule(
      buildingId: $buildingId, name: $name, priority: $priority,
      penaltyType: $penaltyType, amount: $amount, rate: $rate,
      gracePeriodDays: $gracePeriodDays, isActive: $isActive
    ) {
      success
      message
      rule { id name }
    }
  }
`;

export const DELETE_PENALTY_RULE_MUTATION = gql`
  mutation DeletePenaltyRule($ruleId: Int!) {
    deletePenaltyRule(ruleId: $ruleId) {
      success
      message
    }
  }
`;

