# Mobile App GraphQL API Guide

This document covers all available GraphQL operations for building an Expo React Native mobile app against the Kituo property management API.

**Endpoint:** `POST /graphql/`  
**WebSocket:** `ws://<host>/graphql/`  
**Schema file:** `schema.graphql` (root of repo)  
**Auth header:** `Authorization: JWT <token>`

> **Update:** Mobile-first onboarding and OTP flows are now available in GraphQL (registration OTP, resend OTP, OTP password reset, improved company/subscription onboarding).

---

## Table of Contents

1. [Auth Context & Session Hydration](#1-auth-context--session-hydration)
2. [Mobile OTP Auth & Registration](#2-mobile-otp-auth--registration)
3. [Company Management & Switching](#3-company-management--switching)
4. [Subscription Management](#4-subscription-management)
5. [Dashboard](#4-dashboard)
6. [Buildings](#5-buildings)
7. [Units](#6-units)
8. [Tenants](#7-tenants)
9. [Occupancy Management](#8-occupancy-management)
10. [Rent Schedules](#9-rent-schedules)
11. [Tenant Charges](#10-tenant-charges)
12. [Payments & Allocation](#11-payments--allocation)
13. [Building Extra Charges](#12-building-extra-charges)
14. [Leases](#13-leases)
15. [Rent Schedule Config & Penalties](#14-rent-schedule-config--penalties)
16. [Maintenance](#15-maintenance)
17. [Notifications](#16-notifications)
18. [Accounting](#17-accounting)
19. [Payment Configuration](#18-payment-configuration)
20. [Tenant Payment Link (Public)](#19-tenant-payment-link-public)
21. [Real-Time WebSocket Subscriptions](#20-real-time-websocket-subscriptions)
22. [Technical Requirements](#21-technical-requirements)

---

## 1. Auth Context & Session Hydration

Call immediately after login to populate role, company, and permission state across the app.

```graphql
query AuthContext {
  authContext
  companiesContext
  me { id email firstName lastName }
}
```

**`authContext`** returns:

```json
{
  "currentRole": "ADMINISTRATOR",
  "currentRoleDisplay": "Administrator",
  "hasMultipleRoles": false,
  "flags": {
    "isAdministrator": true,
    "isLandlord": false,
    "isAgent": false,
    "isTenant": false,
    "isAccountant": false,
    "isMaintenance": false
  },
  "availableRoles": [{ "id": 1, "role": "ADMINISTRATOR", "isPrimary": true, "tenantId": null, "buildingId": null }]
}
```

**`companiesContext`** returns:

```json
{
  "hasCompanies": true,
  "currentCompany": { "id": "uuid", "name": "Acme Properties" },
  "userCompanies": [{ "companyId": "uuid", "companyName": "Acme", "role": "OWNER" }],
  "permissions": {
    "isCompanyOwner": true,
    "canManageProperties": true,
    "canManagePayments": true,
    "canValidatePayments": true,
    "canViewAccounting": true,
    "canManageMembers": true
  },
  "subscription": {
    "lockedBuildingIds": [],
    "lockedUnitIds": [],
    "overPropertiesLimit": false,
    "overUnitsLimit": false
  }
}
```

---

## 2. Mobile OTP Auth & Registration

These flows are designed for mobile onboarding and do not rely on web email links.

### Register Member (Mobile)

```graphql
mutation RegisterMemberMobile($inputFirstName: String!, $inputLastName: String!, $inputEmail: String!, $inputPhone: String, $inputPassword1: String!, $inputPassword2: String!, $inputRole: String!) {
  registerMemberMobile(
    firstName: $inputFirstName,
    lastName: $inputLastName,
    email: $inputEmail,
    phoneNumber: $inputPhone,
    password1: $inputPassword1,
    password2: $inputPassword2,
    role: $inputRole
  ) {
    success
    message
    otpChannels
    otpExpiresInSeconds
    user { id email firstName lastName verified }
  }
}
```

`otpChannels` is driven by Setup configuration:

- `setup.otpViaEmailEnabled`
- `setup.otpViaSmsEnabled`

### Verify Registration OTP

```graphql
mutation VerifyRegistrationOtp($email: String!, $code: String!) {
  verifyRegistrationOtp(email: $email, code: $code) {
    success
    message
    user { id email verified }
  }
}
```

### Resend Registration OTP

```graphql
mutation ResendRegistrationOtp($email: String!) {
  resendRegistrationOtp(email: $email) {
    success
    message
    otpChannels
    otpExpiresInSeconds
  }
}
```

### Request Password Reset OTP

```graphql
mutation SendPasswordResetOtp($email: String, $phoneNumber: String) {
  sendPasswordResetOtp(email: $email, phoneNumber: $phoneNumber) {
    success
    message
    otpChannels
    otpExpiresInSeconds
  }
}
```

### Reset Password with OTP

```graphql
mutation ResetPasswordWithOtp($email: String, $phoneNumber: String, $code: String!, $newPassword1: String!, $newPassword2: String!) {
  resetPasswordWithOtp(
    email: $email,
    phoneNumber: $phoneNumber,
    code: $code,
    newPassword1: $newPassword1,
    newPassword2: $newPassword2
  ) {
    success
    message
  }
}
```

## 3. Company Management & Switching

### Switch Active Company

```graphql
mutation SwitchCompany($companyId: UUID!) {
  switchCompany(companyId: $companyId) {
    success
    message
    company { id name email phone }
  }
}
```

After switching, refetch `authContext` + `companiesContext` and reset the Apollo cache.

### Create Company

This mutation now mirrors webpage onboarding behavior by automatically assigning the logged-in creator as an active OWNER membership with full owner permissions.

```graphql
mutation CreateCompany(
  $name: String!, $companyType: String!, $email: String!,
  $phone: String!, $physicalAddress: String!, $currencyId: Int!
) {
  createCompany(
    name: $name, companyType: $companyType, email: $email,
    phone: $phone, physicalAddress: $physicalAddress, currencyId: $currencyId
  ) {
    success message
    company { id name }
  }
}
```

### Update Company

```graphql
mutation UpdateCompany($companyId: UUID!, $name: String, $email: String, $phone: String, $city: String, $county: String, $country: String) {
  updateCompany(companyId: $companyId, name: $name, email: $email, phone: $phone, city: $city, county: $county, country: $country) {
    success message company { id name }
  }
}
```

### Members

**List:** `companyMemberships` connection — fields: `user { email firstName lastName }`, `role`, `status`, permission flags.

**Add directly:**

```graphql
mutation AddMember($companyId: UUID!, $email: String!, $firstName: String!, $lastName: String!, $role: String!) {
  addCompanyMember(companyId: $companyId, email: $email, firstName: $firstName, lastName: $lastName, role: $role) {
    success message membership { id role }
  }
}
```

**Invite by email:** `inviteCompanyMember(companyId, email, role, message)`

**Bulk invite:** `bulkInviteCompanyMembers(companyId, emails: [String!]!, role)`

**Resend invitation:** `resendCompanyInvitation(invitationId)`

**Accept invitation:** `acceptCompanyInvitation(invitationToken)` — returns `membership`

**Decline invitation:** `declineCompanyInvitation(invitationToken)`

### Join Existing Company (If Invited)

After login/registration, the app should check invitations sent to the user email and offer a "Join Existing Company" option.

1. Fetch invitations for the logged-in user email:

```graphql
query MyCompanyInvitations {
  companyInvitations(isAccepted: false, isDeclined: false) {
    edges {
      node {
        id
        invitationToken
        email
        expiresAt
        company { id name }
        role
      }
    }
  }
}
```

1. Accept invitation and join the company:

```graphql
mutation AcceptCompanyInvitation($invitationToken: UUID!) {
  acceptCompanyInvitation(invitationToken: $invitationToken) {
    success
    message
    membership {
      id
      role
      status
      company { id name }
    }
  }
}
```

Behavior notes:

- Invite acceptance is allowed only for the user whose email matches the invitation email.
- On success, the backend sets the accepted company as the current active company context.
- If the membership already exists, it is reactivated/updated from invitation permissions.

### User Roles

**List:** `userRoles` connection  
**Assign:** `assignUserRole(companyId, userId, role, buildingId?)`  
**Update:** `updateUserRole(roleId, permissions...)`  
**Deactivate:** `deactivateUserRole(roleId)`

---

## 4. Subscription Management

### Current Subscription Status

```graphql
query SubscriptionStatus($companyId: UUID!) {
  subscriptionStatus(companyId: $companyId) {
    subscription { id status billingCycle nextBillingDate }
    metrics { activeUnitsCount activeBuildingsCount activeTenantsCount activeUsersCount }
    usageStats
    hasStandingOrder
    amounts { baseAmount finalAmount discountAmount discountName }
  }
}
```

### Available Plans

```graphql
query SubscriptionPlans {
  subscriptionPlans {
    edges { node { id name priceMonthly priceAnnually maxUnits maxProperties maxTenants features isActive } }
  }
}
```

### Plan & Billing Operations

| Operation | Mutation | Key Args |
|---|---|---|
| Select / upgrade plan | `selectSubscriptionPlan` | `companyId`, `planId`, `billingCycle` |
| Change billing cycle | `changeBillingCycle` | `subscriptionId`, `newCycle` |
| Cancel subscription | `cancelCompanySubscription` | `subscriptionId` |
| Apply discount code | `applySubscriptionDiscount` | `subscriptionId`, `discountCode` |
| Cancel standing order | `cancelStandingOrder` | `subscriptionId`, `reason?` |
| Reactivate standing order | `reactivateStandingOrder` | `subscriptionId` |
| Request refund | `requestSubscriptionRefund` | `paymentId`, `refundAmount?`, `refundType`, `reason` |

### Select Plan (Mobile Onboarding-Aware)

`selectSubscriptionPlan` now returns onboarding context for mobile routing decisions.

```graphql
mutation SelectPlan($companyId: UUID!, $planId: UUID!, $billingCycle: String) {
  selectSubscriptionPlan(companyId: $companyId, planId: $planId, billingCycle: $billingCycle) {
    success
    message
    requiresGettingStarted
    gettingStartedData
    subscription { id status billingCycle plan { id name planType } }
  }
}
```

Use `requiresGettingStarted` to decide whether to route users to setup checklist screens immediately after plan selection.

### Getting Started Workflow State

Use these mutations to persist onboarding guidance state per user/company:

```graphql
mutation SkipGettingStarted($companyId: UUID!) {
  skipGettingStarted(companyId: $companyId) {
    success
    message
  }
}
```

```graphql
mutation ResumeGettingStarted($companyId: UUID!) {
  resumeGettingStarted(companyId: $companyId) {
    success
    message
  }
}
```

### Pay for Subscription via M-Pesa

```graphql
mutation InitiateMpesaPayment($subscriptionId: Int!, $phoneNumber: String!, $paymentFor: String) {
  initiateMpesaPayment(subscriptionId: $subscriptionId, phoneNumber: $phoneNumber, paymentFor: $paymentFor) {
    success message
    payment { id status amount }
  }
}
```

`paymentFor` values: `SUBSCRIPTION`, `SMS_CREDITS`, `WHATSAPP_CREDITS`

### Pay via Card (Paystack)

```graphql
mutation InitiateCardPayment($subscriptionId: Int!, $customerEmail: String, $setupStandingOrder: Boolean, $paymentFor: String) {
  initiateCardPayment(subscriptionId: $subscriptionId, customerEmail: $customerEmail, setupStandingOrder: $setupStandingOrder, paymentFor: $paymentFor) {
    success message authorizationUrl
    payment { id status }
  }
}
```

Open `authorizationUrl` in `WebBrowser`. Then verify:

```graphql
mutation VerifyPayment($reference: String!) {
  verifyPaystackPayment(reference: $reference) {
    success message payment { id status }
  }
}
```

### Payment History

```graphql
query PaymentHistory($companyId: UUID!, $limit: Int) {
  paymentHistory(companyId: $companyId, limit: $limit) {
    id amount status createdAt reference
  }
}
```

### Messaging Balances (SMS + WhatsApp Credits)

```graphql
query MessagingBalances($companyId: UUID!) {
  messagingBalances(companyId: $companyId) {
    smsBalance smsCreditsBalance smsCreditValue smsCostPerSms
    whatsappBalance whatsappCreditsBalance whatsappCreditValue
  }
}
```

### Payment Page Context

```graphql
query PaymentContext($companyId: UUID!, $paymentFor: String) {
  subscriptionInitiatePaymentData(companyId: $companyId, paymentFor: $paymentFor)
}
```

Returns amounts, balances, and waiver info — fetch before showing payment UI.

### Onboarding Checklist

```graphql
query GettingStarted($companyId: UUID!) {
  subscriptionGettingStartedData(companyId: $companyId)
}
```

Dismiss with `skipGettingStarted(companyId)` mutation.

---

## 4. Dashboard

```graphql
query Dashboard {
  dashboard {
    currentRole
    stats {
      totalBuildings totalUnits occupiedUnits vacantUnits
      maintenanceUnits reservedUnits activeTenantsActive totalArrears
    }
    recentPayments { id amount tenantName unitNumber buildingName createdAt status reference }
    overdueSchedules { id tenantName unitNumber buildingName amount dueDate status }
    buildingOccupancy { id name occupied vacant }
    companyContext { showSetupGuide showResumeGuide isTrial trialEndDate hasSubscription }
    adminSection { unmatchedPaymentsCount totalRevenue agentsCount landlordsCount accountantsCount tenantsCount }
    landlordSection { myUnitsCount monthlyRevenue }
    agentSection { managedUnits vacantUnitsCount pendingMoveIns }
    tenantSection {
      myBalance
      myUnits { id unitNumber building { name } }
      mpesaPaymentInstructions { shortCode setupName unitNumber buildingName }
      myPayments { id amount status reference }
      myCharges { id amount status }
    }
    accountantSection { totalCollected pendingReconciliation arrearsbyBuilding { id name buildingArrears } }
  }
}
```

Render only the section matching the current role. Tenant section includes M-Pesa instructions (short code + account number).

---

## 5. Buildings

### List Buildings

```graphql
query AllBuildings {
  allBuildings { id name address city status }
}
```

### Create / Update Building

```graphql
mutation CreateBuilding($name: String!, $buildingType: String!, $physicalAddress: String!) {
  createBuilding(name: $name, buildingType: $buildingType, physicalAddress: $physicalAddress) {
    success message building { id name }
  }
}
```

`updateBuilding(buildingId, ...fields)` — same field set.

### Delete Building

```graphql
mutation DeleteBuilding($buildingId: Int!) {
  deleteBuilding(buildingId: $buildingId) { success message }
}
```

If `success=false`, display `message` (e.g., "Building has active units").

### Copy Building

```graphql
mutation CopyBuilding($buildingId: Int!) {
  copyBuilding(buildingId: $buildingId) { success message building { id name } }
}
```

### Occupancy Report (Chart Data)

```graphql
query OccupancyReport {
  occupancyReport { id name occupied vacant }
}
```

Use as data source for a bar/pie chart per building.

### Building Media

- **Documents:** `buildingDocuments(buildingId)` — upload via `createBuildingDocument` (`Upload` scalar)
- **Images:** `buildingImages(buildingId)` — upload via `createBuildingImage`

Use `createUploadLink` from `apollo-upload-client` for file mutation support.

---

## 6. Units

### List Units

```graphql
query AllUnits($buildingId: ID, $status: String) {
  allUnits(buildingId: $buildingId, status: $status) {
    id unitNumber status rentAmount deposit
    building { name }
    currentTenant { id fullName phone }
  }
}
```

Status values: `VACANT`, `OCCUPIED`, `MAINTENANCE`, `RESERVED`

### Create / Update Unit

```graphql
mutation CreateUnit($buildingId: ID!, $unitNumber: String!, $rentAmount: Decimal!, $deposit: Decimal!) {
  createUnit(buildingId: $buildingId, unitNumber: $unitNumber, rentAmount: $rentAmount, deposit: $deposit) {
    success message unit { id unitNumber }
  }
}
```

`updateUnit(unitId, ...fields)` — fields include `status`, `bedrooms`, `bathrooms`, `size`, `floorNumber`.

### Delete Unit

```graphql
mutation DeleteUnit($unitId: Int!) {
  deleteUnit(unitId: $unitId) { success message blockers }
}
```

`blockers` is a list of reason strings — show them before confirming delete.

### Copy Unit

```graphql
mutation CopyUnit($unitId: Int!, $targetBuildingId: Int) {
  copyUnit(unitId: $unitId, targetBuildingId: $targetBuildingId) { success message unit { id unitNumber } }
}
```

### Bulk Generate Units

```graphql
mutation BulkGenerateUnits($buildingId: Int!, $prefix: String!, $count: Int!, $rentAmount: Decimal!, $deposit: Decimal!) {
  bulkGenerateUnits(buildingId: $buildingId, prefix: $prefix, count: $count, rentAmount: $rentAmount, deposit: $deposit) {
    success message generatedCount
  }
}
```

### Find Unit by Account Number

```graphql
query UnitByAccount($accountNumber: String!) {
  unitByAccount(accountNumber: $accountNumber) {
    id unitNumber building { name } currentTenant { fullName }
  }
}
```

---

## 7. Tenants

### List Tenants

```graphql
query AllTenants {
  allTenants {
    id fullName email phone idNumber isActive
    currentUnits { id unitNumber building { name } }
  }
}
```

### Create / Update Tenant

```graphql
mutation CreateTenant($firstName: String!, $lastName: String!, $email: String!, $phone: String!) {
  createTenant(firstName: $firstName, lastName: $lastName, email: $email, phone: $phone) {
    success message tenant { id fullName }
  }
}
```

`updateTenant(tenantId, ...fields)` — fields include `idNumber`, `dateOfBirth`, `gender`, `nationality`, `emergencyContactName`, `emergencyContactPhone`.

### Delete Tenant

```graphql
mutation DeleteTenant($tenantId: Int!) {
  deleteTenant(tenantId: $tenantId) { success message blockers }
}
```

---

## 8. Occupancy Management

### Assign Tenant (Move-In)

```graphql
mutation CreateOccupancy(
  $unitId: Int!, $tenantId: Int!, $startDate: Date!,
  $rentAmount: Decimal!, $deposit: Decimal!, $notes: String
) {
  createOccupancy(
    unitId: $unitId, tenantId: $tenantId, startDate: $startDate,
    rentAmount: $rentAmount, deposit: $deposit, notes: $notes
  ) {
    success message
    occupancy { id startDate tenant { fullName } unit { unitNumber } }
  }
}
```

Auto-creates a deposit charge and queues rent schedule generation.

### List Occupancies

```graphql
query AllOccupancies($unitId: ID, $tenantId: ID, $isCurrent: Boolean) {
  allOccupancies(unitId: $unitId, tenantId: $tenantId, isCurrent: $isCurrent) {
    id startDate endDate rentAmount deposit
    tenant { fullName phone }
    unit { unitNumber building { name } }
  }
}
```

### Issue Move-Out / Vacation Notice

```graphql
mutation CreateVacationNotice($occupancyId: Int!, $noticeDate: Date!, $expectedVacationDate: Date!, $reason: String) {
  createVacationNotice(occupancyId: $occupancyId, noticeDate: $noticeDate, expectedVacationDate: $expectedVacationDate, reason: $reason) {
    success message
    vacationNotice { id status expectedVacationDate }
  }
}
```

---

## 9. Rent Schedules

### List Schedules

```graphql
query AllRentSchedules($unitId: ID, $tenantId: ID, $status: String) {
  allRentSchedules(unitId: $unitId, tenantId: $tenantId, status: $status) {
    id expectedAmount paidAmount dueDate status daysOverdue
    unit { unitNumber } tenant { fullName }
  }
}
```

Status values: `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `VOID`

### Void a Schedule

```graphql
mutation VoidRentSchedule($rentScheduleId: Int!, $voidReason: String) {
  voidRentSchedule(rentScheduleId: $rentScheduleId, voidReason: $voidReason) {
    success message
  }
}
```

### Bulk Generate Schedules

```graphql
mutation BulkGenerateRentSchedules($buildingId: Int!, $fromDate: Date!, $toDate: Date!) {
  bulkGenerateRentSchedules(buildingId: $buildingId, fromDate: $fromDate, toDate: $toDate) {
    success message queued
  }
}
```

`queued: true` means it runs async via Celery — show a "Schedules are being generated" toast.

### Arrears Report

```graphql
query ArrearsReport($statuses: [String]) {
  arrearsReport(statuses: $statuses) {
    summary { totalExpected totalPaid totalArrears }
    schedules { id tenant { fullName } unit { unitNumber } expectedAmount paidAmount dueDate status daysOverdue }
  }
}
```

Default `statuses`: `["OVERDUE", "PARTIAL"]`

---

## 10. Tenant Charges

### Tenant Charges History (Paginated)

```graphql
query TenantChargesHistory(
  $tenantId: Int!, $search: String, $status: String,
  $fromDate: Date, $toDate: Date, $page: Int
) {
  tenantChargesHistory(tenantId: $tenantId, search: $search, status: $status, fromDate: $fromDate, toDate: $toDate, page: $page)
}
```

Returns `GenericScalar`:

```json
{
  "charges": [{ "id": 1, "description": "Rent", "amount": "15000.00", "balance": "0.00", "status": "PAID" }],
  "totalAmount": "15000.00",
  "totalPaid": "15000.00",
  "totalOutstanding": "0.00",
  "numPages": 3,
  "currentPage": 1
}
```

### Unit Charges History

```graphql
query UnitChargesHistory(
  $unitId: Int!, $search: String, $status: String,
  $fromDate: Date, $toDate: Date, $page: Int
) {
  unitChargesHistory(unitId: $unitId, search: $search, status: $status, fromDate: $fromDate, toDate: $toDate, page: $page)
}
```

Same response shape as tenant charges.

### Building Charges Report

```graphql
query BuildingChargesReport(
  $buildingId: Int!, $search: String, $unitId: Int, $tenantId: Int,
  $status: String, $fromDate: Date, $toDate: Date, $page: Int
) {
  buildingChargesReport(buildingId: $buildingId, search: $search, unitId: $unitId, tenantId: $tenantId, status: $status, fromDate: $fromDate, toDate: $toDate, page: $page)
}
```

Returns charges + `statusBreakdown: { PENDING: { count, total, paid }, PAID: {...} }`.

### Post Extra Charge on Tenant

```graphql
mutation PostTenantExtraCharge(
  $tenantId: Int!, $unitId: Int!, $description: String!,
  $amount: Decimal!, $chargeDate: Date!, $serviceTypeId: Int
) {
  postTenantExtraCharge(tenantId: $tenantId, unitId: $unitId, description: $description, amount: $amount, chargeDate: $chargeDate, serviceTypeId: $serviceTypeId) {
    success message charge { id amount status description }
  }
}
```

### Void a Charge

```graphql
mutation VoidTenantCharge($chargeId: Int!, $voidReason: String) {
  voidTenantCharge(chargeId: $chargeId, voidReason: $voidReason) { success message }
}
```

---

## 11. Payments & Allocation

### List Payment Receipts

```graphql
query PaymentReceipts($buildingId: ID, $unitId: ID, $tenantId: ID, $dateFrom: Date, $dateTo: Date, $allocationStatus: String) {
  paymentReceipts(buildingId: $buildingId, unitId: $unitId, tenantId: $tenantId, dateFrom: $dateFrom, dateTo: $dateTo, allocationStatus: $allocationStatus) {
    id amount status reference confirmationCode transactionDate
    tenant { fullName }
    unit { unitNumber }
    transactionLines { amount paymentType { name } }
  }
}
```

### Download Receipt PDF

```graphql
query PaymentReceiptPdf($paymentId: Int!) {
  paymentReceiptPdf(paymentId: $paymentId) { success filename pdfBase64 }
}
```

Decode `pdfBase64` with `expo-file-system` and open with `expo-sharing`.

### Verify Receipt (QR Code)

```graphql
query VerifyReceipt($paymentId: Int!, $issuedAt: String!, $signature: String!) {
  verifyPaymentReceipt(paymentId: $paymentId, issuedAt: $issuedAt, signature: $signature) {
    success message
    receipt { reference amount status transactionDate tenant unit verificationCode }
  }
}
```

### Payment Allocation Breakdown

```graphql
query PaymentAllocationBreakdown($unitId: Int!) {
  paymentAllocationBreakdown(unitId: $unitId)
}
```

Returns `{ outstandingByType[], totalOutstanding, hasOutstanding }`.

### Preview Allocation Before Paying

```graphql
query PreviewPaymentAllocation($unitId: Int!, $amount: Decimal!) {
  previewPaymentAllocation(unitId: $unitId, amount: $amount)
}
```

Shows the allocation plan by payment type — display to user before confirming.

### Allocate a Payment Manually

```graphql
mutation AllocatePayment($transactionId: ID!, $unitId: Int!, $tenantId: Int) {
  allocatePayment(transactionId: $transactionId, unitId: $unitId, tenantId: $tenantId) {
    success message allocatedAmount remainingAmount
  }
}
```

### Initiate M-Pesa STK Push (Unit Payment)

```graphql
mutation InitiateUnitPayment($phone: String!, $accountNumber: String!, $amount: String!, $email: String, $name: String) {
  initiateUnitPayment(input: { phone: $phone, accountNumber: $accountNumber, amount: $amount, email: $email, name: $name }) {
    initiate { id amount phone reference status }
  }
}
```

### Unmatched M-Pesa Payments

```graphql
query UnmatchedPayments {
  unmatchedPayments
}
```

Returns:

```json
[{
  "id": 1, "transactionId": "MP123", "amount": "5000.00",
  "phone": "2547XXXXXXXX", "billRefNumber": "BLD001A",
  "firstName": "John", "potentialUnit": { "id": 1, "unitNumber": "A1", "building": "Block A" }
}]
```

### Validate / Match a C2B Payment

```graphql
mutation ValidateC2BPayment($paymentId: Int!, $unitId: Int!, $amount: Decimal) {
  validateC2bPayment(paymentId: $paymentId, unitId: $unitId, amount: $amount) {
    success message
  }
}
```

---

## 12. Building Extra Charges

### Fetch Definitions + History

```graphql
query BuildingExtraChargesData($buildingId: Int!, $historyMonth: String, $historySearch: String, $page: Int) {
  buildingExtraChargesData(buildingId: $buildingId, historyMonth: $historyMonth, historySearch: $historySearch, page: $page)
}
```

Returns `{ definitions[], entries[], totalEntries, numPages, currentPage, historyMonth }`.

`historyMonth` format: `"YYYY-MM"` (defaults to current month).

### Create Definition

```graphql
mutation CreateExtraChargeDefinition(
  $buildingId: Int!, $name: String!, $chargeType: String!,
  $fixedAmount: Decimal, $ratePerUnit: Decimal, $unitLabel: String,
  $description: String, $serviceTypeId: Int
) {
  createExtraChargeDefinition(buildingId: $buildingId, name: $name, chargeType: $chargeType, fixedAmount: $fixedAmount, ratePerUnit: $ratePerUnit, unitLabel: $unitLabel, description: $description, serviceTypeId: $serviceTypeId) {
    success message definition { id name chargeType }
  }
}
```

`chargeType` values: `FIXED`, `PER_UNIT`

**Update:** `updateExtraChargeDefinition(definitionId, ...fields)`  
**Delete:** `deleteExtraChargeDefinition(definitionId)`

### Apply Charges to All Units

```graphql
mutation ApplyBuildingExtraCharges(
  $buildingId: Int!, $definitionId: Int!,
  $billingPeriodStart: Date!, $rows: [ExtraChargeRowInput!]!
) {
  applyBuildingExtraCharges(buildingId: $buildingId, definitionId: $definitionId, billingPeriodStart: $billingPeriodStart, rows: $rows) {
    success message appliedCount
  }
}
```

`ExtraChargeRowInput`: `{ unitId, tenantId, quantity, amount }`

### Update a Charge Entry

```graphql
mutation UpdateExtraChargeEntry($entryId: Int!, $amount: Decimal, $quantity: Decimal) {
  updateExtraChargeEntry(entryId: $entryId, amount: $amount, quantity: $quantity) {
    success message
  }
}
```

---

## 13. Leases

### List Leases

```graphql
query AllLeases($status: String, $buildingId: ID, $occupancyId: ID, $search: String) {
  allLeases(status: $status, buildingId: $buildingId, occupancyId: $occupancyId, search: $search) {
    id leaseNumber status startDate endDate
    occupancy { tenant { fullName } unit { unitNumber building { name } } }
  }
}
```

### Create / Update Lease

```graphql
mutation CreateLease($occupancyId: ID!, $startDate: Date!, $endDate: Date, $terms: String) {
  createLease(occupancyId: $occupancyId, startDate: $startDate, endDate: $endDate, terms: $terms) {
    success message lease { id leaseNumber status }
  }
}
```

`updateLease(leaseId, ...fields)` — fields include `status`, `rentAmount`, `deposit`, `terms`.

---

## 14. Rent Schedule Config & Penalties

### Rent Schedule Configs

```graphql
query RentScheduleConfigs($buildingId: ID) {
  rentScheduleConfigs(buildingId: $buildingId) {
    id building { name } dayOfMonth gracePeriodDays isActive
  }
}
```

CRUD: `createBuildingRentScheduleConfig`, `updateBuildingRentScheduleConfig(configId, ...fields)`

### Penalty Rules

```graphql
query PenaltyRules($buildingId: ID, $isActive: Boolean, $search: String) {
  penaltyRules(buildingId: $buildingId, isActive: $isActive, search: $search) {
    id name priority penaltyType amount rate gracePeriodDays isActive building { name }
  }
}
```

CRUD: `createPenaltyRule`, `updatePenaltyRule(ruleId, ...fields)`, `deletePenaltyRule(ruleId)`

### Applied Penalties

```graphql
query AppliedPenalties($buildingId: ID, $notificationSent: Boolean, $search: String, $limit: Int) {
  appliedPenalties(buildingId: $buildingId, notificationSent: $notificationSent, search: $search, limit: $limit) {
    id appliedAt penaltyAmount notificationSent
    rentSchedule { tenant { fullName } unit { unitNumber } }
    penaltyRule { name }
  }
}
```

---

## 15. Maintenance

### Dashboard Data (Paginated with Stats)

```graphql
query MaintenanceDashboard($status: String, $priority: String, $buildingId: ID, $first: Int, $after: String) {
  maintenanceDashboardData(status: $status, priority: $priority, buildingId: $buildingId, first: $first, after: $after)
}
```

Returns stats + Relay-paginated request list. Uses cursor-based pagination — pass `after` from previous page's `endCursor`.

### Create / Update Maintenance Request

```graphql
mutation CreateUpdateMaintenance(
  $id: ID, $buildingId: ID, $unitId: ID, $tenantId: ID,
  $title: String!, $description: String, $category: String,
  $priority: String, $status: String, $scheduledDate: Date,
  $resolvedDate: Date, $estimatedCost: Decimal, $actualCost: Decimal,
  $vendorName: String, $payableStatus: String, $payableAmount: Decimal
) {
  createUpdateMaintenanceRequest(
    id: $id, buildingId: $buildingId, unitId: $unitId, tenantId: $tenantId,
    title: $title, description: $description, category: $category,
    priority: $priority, status: $status, scheduledDate: $scheduledDate,
    resolvedDate: $resolvedDate, estimatedCost: $estimatedCost, actualCost: $actualCost,
    vendorName: $vendorName, payableStatus: $payableStatus, payableAmount: $payableAmount
  ) {
    success message request { id title status priority }
  }
}
```

**Priority values:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`  
**Status values:** `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`

Omit `id` to create, include `id` to update.

---

## 16. Notifications

### Notifications Context (Badge Counts)

```graphql
query NotificationsContext {
  notificationsContext
}
```

### In-App User Notifications

```graphql
query UserNotifications($isRead: Boolean) {
  userNotifications(isRead: $isRead) {
    edges { node { id title message isRead createdAt } }
  }
}

mutation MarkRead($notificationId: Int!, $isRead: Boolean!) {
  markUserNotificationRead(notificationId: $notificationId, isRead: $isRead) { success }
}
```

### Campaign Management

**List (paginated):**

```graphql
query CampaignListData($search: String, $status: String, $buildingId: Int, $first: Int, $after: String) {
  notificationCampaignListData(search: $search, status: $status, buildingId: $buildingId, first: $first, after: $after)
}
```

**Create / Update:**

```graphql
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
```

**Send now:** `sendNotificationCampaign(campaignId)` — async, Celery-backed.

**Preview recipients:** `previewCampaignRecipients(campaignId)` — returns count + sample list.

**Toggle active/inactive:** `toggleNotificationCampaign(campaignId)`

**Delete:** `deleteNotificationCampaign(campaignId)`

---

## 17. Accounting

### Chart of Accounts

```graphql
query Accounts($companyId: UUID!, $isActive: Boolean, $search: String) {
  accounts(companyId: $companyId, isActive: $isActive, search: $search) {
    id code name accountType isActive cashAccount
  }
}
```

**Create:** `createAccount(companyId, code, name, accountType, parentId?, description?, cashAccount?)`  
**Update:** `updateAccount(accountId, ...fields)`

### Journal Entries

```graphql
query JournalEntries($companyId: UUID!, $status: String, $entryType: String) {
  journalEntries(companyId: $companyId, status: $status, entryType: $entryType) {
    id entryNumber entryDate entryType status description
  }
}
```

**Create entry:** `createJournalEntry(companyId, entryNumber, entryDate, entryType, description, reference?)`

**Add line to entry:** `addJournalLine(journalEntryId, accountId, amount, debitCredit, description?)`

### Tenant Credits & Refunds

```graphql
query TenantCreditsRefunds($tenantId: Int, $companyId: UUID!) {
  tenantCredits(tenantId: $tenantId, companyId: $companyId) { id amount description creditDate }
  tenantRefunds(tenantId: $tenantId, companyId: $companyId) { id amount description refundDate }
}
```

**Create credit:** `createTenantCredit(tenantId, companyId, amount, description, creditDate)`  
**Create refund:** `createTenantRefund(tenantId, companyId, amount, description, refundDate)`

---

## 18. Payment Configuration

### Dashboard Data

```graphql
query PaymentConfigDashboard {
  paymentConfigDashboardData
}
```

Returns configurable payment types, modes, and category/mode choices for the company.

### Configurable Payment Types

CRUD: `createConfigurablePaymentType`, `updateConfigurablePaymentType(id, ...fields)`, `deleteConfigurablePaymentType(id)`

### Configurable Payment Modes

CRUD: `createConfigurablePaymentMode`, `updateConfigurablePaymentMode(id, ...fields)`, `deleteConfigurablePaymentMode(id)`

### Type–Mode Association

`createConfigurablePaymentTypeMode(paymentTypeId, paymentModeId)`  
`deleteConfigurablePaymentTypeMode(id)`

---

## 19. Tenant Payment Link (Public)

This screen requires no authentication. Handle via deep link: `yourapp://pay?token=xxx`

```graphql
query TenantPaymentLinkData($token: String!) {
  tenantPaymentLinkData(token: $token)
}
```

Returns:

```json
{
  "unit": { "id": 1, "unitNumber": "A1" },
  "tenant": { "fullName": "Jane Doe" },
  "building": { "name": "Block A" },
  "mpesaSetup": { "shortCode": "123456", "name": "Lipa Na Mpesa" },
  "outstanding": [{ "amount": "15000.00", "type": "Rent" }]
}
```

Show payment instructions and STK Push button (using `initiateUnitPayment`).

---

## 20. Real-Time WebSocket Subscriptions

Use `graphql-ws` with Apollo Client's `GraphQLWsLink`.

| Data | WebSocket Group |
|---|---|
| Building changes | `buildings_company_{companyId}` |
| Unit changes | `units_building_{buildingId}` |
| Tenant changes | `tenants_company_{companyId}` |
| Rent schedule changes | `rent_schedules_unit_{unitId}` |
| Lease changes | `leases_company_{companyId}` |
| Payment events | `payments_company_{companyId}` |
| Maintenance updates | `maintenance_company_{companyId}` |
| Notification campaigns | `notification_campaigns_company_{companyId}` |
| In-app user notifications | `user_notifications_{userId}` |
| Subscription payments | `subscription_company_{companyId}` |
| Company membership | `company_memberships_{companyId}` |
| Accounting journal entries | `journal_entries_company_{companyId}` |
| Unit balance updates | `balance_unit_{unitId}` |

On subscription event, update the Apollo cache via `cache.modify()` or trigger a targeted refetch.

---

## 21. Technical Requirements

### Apollo Client Setup

```ts
import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'
import { setContext } from '@apollo/client/link/context'
import { createUploadLink } from 'apollo-upload-client'
import * as SecureStore from 'expo-secure-store'

const httpLink = createUploadLink({ uri: 'https://your-api/graphql/' })

const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync('jwt_token')
  return { headers: { ...headers, Authorization: token ? `JWT ${token}` : '' } }
})

const wsLink = new GraphQLWsLink(createClient({
  url: 'wss://your-api/graphql/',
  connectionParams: async () => {
    const token = await SecureStore.getItemAsync('jwt_token')
    return { Authorization: token ? `JWT ${token}` : '' }
  },
}))

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  wsLink,
  authLink.concat(httpLink),
)

export const client = new ApolloClient({ link: splitLink, cache: new InMemoryCache() })
```

### Token Refresh

Use `TokenRefreshLink` or a polling mechanism to call `refreshToken` mutation every ~4 min 30 sec. Store both `token` and `refreshToken` in `expo-secure-store`.

### Error Handling

Parse `extensions.code` on GraphQL errors:

| Code | Action |
|---|---|
| `UNAUTHENTICATED` | Clear tokens, redirect to login |
| `NO_SUBSCRIPTION` | Redirect to subscription plan selection screen |
| `SUBSCRIPTION_INACTIVE` | Show persistent banner with contact support link |
| `SUBSCRIPTION_PAST_DUE` | Redirect to subscription payment screen |
| `COMPANY_REQUIRED` | Prompt company selection / switch |

### Role-Based Navigation

Use a tab navigator with tabs conditionally rendered by `authContext.currentRole`:

| Tab | Roles |
|---|---|
| Dashboard | All |
| Buildings / Units | Administrator, Landlord, Agent |
| Tenants | Administrator, Landlord, Agent |
| Payments | Administrator, Landlord, Accountant |
| Charges | Administrator, Accountant, Agent |
| Maintenance | Administrator, Agent, Maintenance |
| Accounting | Administrator, Accountant |
| Notifications | Administrator, Agent, Landlord |
| Subscription | Administrator (company owner) |
| My Account | Tenant |

### Offline Support

```ts
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist'
import AsyncStorage from '@react-native-async-storage/async-storage'

await persistCache({ cache, storage: new AsyncStorageWrapper(AsyncStorage) })
```

### Schema Codegen

Regenerate `schema.graphql` from the running server:

```bash
python manage.py graphql_schema --schema kituo.schema.schema --out schema.graphql
```

Then run Apollo codegen to generate typed hooks:

```bash
npx @graphql-codegen/cli generate
```
