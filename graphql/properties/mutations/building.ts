import { gql } from "@apollo/client";

export const DELETE_BUILDING = gql`
  mutation DeleteBuilding($id: ID!) {
    deleteBuilding(id: $id) {
      success
      message
    }
  }
`;

export const CREATE_BUILDING_MUTATION = gql`
  mutation CreateUpdateBuilding(
    $id: ID
    $name: String!
    $code: String!
    $buildingType: String!
    $address: String!
    $city: String!
    $county: String
    $numberOfFloors: Int!
    $totalUnits: Int!
    $yearBuilt: Int
    $managerName: String
    $managerPhone: String
    $managerEmail: String
    $description: String
  ) {
    createUpdateBuilding(
      id: $id
      name: $name
      code: $code
      buildingType: $buildingType
      address: $address
      city: $city
      county: $county
      numberOfFloors: $numberOfFloors
      totalUnits: $totalUnits
      yearBuilt: $yearBuilt
      managerName: $managerName
      managerPhone: $managerPhone
      managerEmail: $managerEmail
      description: $description
    ) {
      success
      message
      building {
        id
        name
        code
        buildingType
      }
    }
  }
`;

export const COPY_BUILDING_MUTATION = gql`
  mutation CopyBuilding($buildingId: ID!, $newName: String!, $newCode: String!, $copyUnits: Boolean) {
    copyBuilding(
      buildingId: $buildingId
      newName: $newName
      newCode: $newCode
      copyUnits: $copyUnits
    ) {
      success
      message
      newBuildingId
      unitsCreated
    }
  }
`;

export const BULK_GENERATE_UNITS_MUTATION = gql`
  mutation BulkGenerateUnits(
    $buildingId: ID!
    $unitTypeId: ID!
    $monthlyRent: Decimal!
    $depositAmount: Decimal!
    $floorSequence: [String]!
    $unitsPerFloor: Int!
    $startingNumber: String!
    $numberingPattern: String
    $bedrooms: Int
    $bathrooms: Int
    $serviceCharge: Decimal
  ) {
    bulkGenerateUnits(
      buildingId: $buildingId
      unitTypeId: $unitTypeId
      monthlyRent: $monthlyRent
      depositAmount: $depositAmount
      floorSequence: $floorSequence
      unitsPerFloor: $unitsPerFloor
      startingNumber: $startingNumber
      numberingPattern: $numberingPattern
      bedrooms: $bedrooms
      bathrooms: $bathrooms
      serviceCharge: $serviceCharge
    ) {
      success
      message
      createdCount
      duplicates
    }
  }
`;

export const UPDATE_BUILDING_NOTIFICATION_PREFERENCES_MUTATION = gql`
  mutation UpdateBuildingNotificationPreferences(
    $buildingId: ID!
    $blockAll: Boolean
    $notificationPreferences: GenericScalar
  ) {
    updateBuildingNotificationPreferences(
      buildingId: $buildingId
      blockAll: $blockAll
      notificationPreferences: $notificationPreferences
    ) {
      success
      message
      status
      blockAll
      preferences
      blockedLabels
    }
  }
`;

export const UPLOAD_BUILDING_IMAGE_MUTATION = gql`
  mutation UploadBuildingImage($buildingId: ID!, $image: Upload!, $caption: String, $isPrimary: Boolean) {
    uploadBuildingImage(buildingId: $buildingId, image: $image, caption: $caption, isPrimary: $isPrimary) {
      success
      message
      image {
        id
        imageUrl
        thumbnailUrl
        isPrimary
        caption
      }
    }
  }
`;

export const DELETE_BUILDING_IMAGE_MUTATION = gql`
  mutation DeleteBuildingImage($imageId: ID!) {
    deleteBuildingImage(imageId: $imageId) {
      success
      message
    }
  }
`;

export const MAKE_PRIMARY_BUILDING_IMAGE_MUTATION = gql`
  mutation MakePrimaryBuildingImage($imageId: ID!) {
    makePrimaryBuildingImage(imageId: $imageId) {
      success
      message
      image {
        id
        isPrimary
      }
    }
  }
`;

export const UPLOAD_BUILDING_DOCUMENT_MUTATION = gql`
  mutation UploadBuildingDocument($buildingId: ID!, $file: Upload!, $name: String) {
    uploadBuildingDocument(buildingId: $buildingId, file: $file, name: $name) {
      success
      message
      document {
        id
        fileUrl
        name
      }
    }
  }
`;

export const DELETE_BUILDING_DOCUMENT_MUTATION = gql`
  mutation DeleteBuildingDocument($documentId: ID!) {
    deleteBuildingDocument(documentId: $documentId) {
      success
      message
    }
  }
`;

export const CREATE_UPDATE_PENALTY_RULE_MUTATION = gql`
  mutation CreateUpdatePenaltyRule(
    $id: ID
    $buildingId: ID
    $name: String!
    $description: String
    $calculationType: String
    $fixedAmount: Decimal
    $percentage: Decimal
    $dailyRate: Decimal
    $gracePeriodDays: Int
    $maxPenaltyAmount: Decimal
    $maxPenaltyPercentage: Decimal
    $sendNotification: Boolean
    $notificationMessage: String
    $priority: Int
    $isActive: Boolean
    $applyOnce: Boolean
  ) {
    createUpdatePenaltyRule(
      id: $id
      buildingId: $buildingId
      name: $name
      description: $description
      calculationType: $calculationType
      fixedAmount: $fixedAmount
      percentage: $percentage
      dailyRate: $dailyRate
      gracePeriodDays: $gracePeriodDays
      maxPenaltyAmount: $maxPenaltyAmount
      maxPenaltyPercentage: $maxPenaltyPercentage
      sendNotification: $sendNotification
      notificationMessage: $notificationMessage
      priority: $priority
      isActive: $isActive
      applyOnce: $applyOnce
    ) {
      success
      message
      penaltyRule {
        id
        name
        isActive
        calculationType
      }
    }
  }
`;

export const UPDATE_PENALTY_RULE_MUTATION = gql`
  mutation UpdatePenaltyRule(
    $ruleId: ID!
    $buildingId: ID
    $name: String
    $description: String
    $calculationType: String
    $fixedAmount: Decimal
    $percentage: Decimal
    $dailyRate: Decimal
    $gracePeriodDays: Int
    $maxPenaltyAmount: Decimal
    $maxPenaltyPercentage: Decimal
    $sendNotification: Boolean
    $notificationMessage: String
    $priority: Int
    $isActive: Boolean
    $applyOnce: Boolean
  ) {
    updatePenaltyRule(
      ruleId: $ruleId
      buildingId: $buildingId
      name: $name
      description: $description
      calculationType: $calculationType
      fixedAmount: $fixedAmount
      percentage: $percentage
      dailyRate: $dailyRate
      gracePeriodDays: $gracePeriodDays
      maxPenaltyAmount: $maxPenaltyAmount
      maxPenaltyPercentage: $maxPenaltyPercentage
      sendNotification: $sendNotification
      notificationMessage: $notificationMessage
      priority: $priority
      isActive: $isActive
      applyOnce: $applyOnce
    ) {
      success
      message
      penaltyRule {
        id
        name
        isActive
      }
    }
  }
`;

export const TOGGLE_PENALTY_RULE_MUTATION = gql`
  mutation TogglePenaltyRule($ruleId: ID!) {
    togglePenaltyRule(ruleId: $ruleId) {
      success
      message
      penaltyRule {
        id
        isActive
      }
    }
  }
`;

export const DELETE_PENALTY_RULE_MUTATION = gql`
  mutation DeletePenaltyRule($ruleId: ID!) {
    deletePenaltyRule(ruleId: $ruleId) {
      success
      message
    }
  }
`;

export const TEST_PENALTY_CALCULATION_MUTATION = gql`
  mutation TestPenaltyCalculation($ruleId: ID!, $rentAmount: Decimal!, $daysOverdue: Int!) {
    testPenaltyCalculation(ruleId: $ruleId, rentAmount: $rentAmount, daysOverdue: $daysOverdue) {
      success
      message
      penaltyAmount
      breakdown
    }
  }
`;

export const CREATE_EXTRA_CHARGE_DEFINITION_MUTATION = gql`
  mutation CreateExtraChargeDefinition(
    $buildingId: ID!
    $serviceTypeId: Int!
    $name: String!
    $chargeType: String!
    $description: String
    $fixedAmount: Decimal
    $ratePerUnit: Decimal
    $unitLabel: String
    $isActive: Boolean
  ) {
    createExtraChargeDefinition(
      buildingId: $buildingId
      serviceTypeId: $serviceTypeId
      name: $name
      chargeType: $chargeType
      description: $description
      fixedAmount: $fixedAmount
      ratePerUnit: $ratePerUnit
      unitLabel: $unitLabel
      isActive: $isActive
    ) {
      success
      message
      definition {
        id
        name
        chargeType
        isActive
      }
    }
  }
`;

export const UPDATE_EXTRA_CHARGE_DEFINITION_MUTATION = gql`
  mutation UpdateExtraChargeDefinition(
    $definitionId: ID!
    $serviceTypeId: ID
    $name: String
    $chargeType: String
    $description: String
    $fixedAmount: Decimal
    $ratePerUnit: Decimal
    $unitLabel: String
    $isActive: Boolean
  ) {
    updateExtraChargeDefinition(
      definitionId: $definitionId
      serviceTypeId: $serviceTypeId
      name: $name
      chargeType: $chargeType
      description: $description
      fixedAmount: $fixedAmount
      ratePerUnit: $ratePerUnit
      unitLabel: $unitLabel
      isActive: $isActive
    ) {
      success
      message
      definition {
        id
        name
        chargeType
        isActive
      }
    }
  }
`;

export const DELETE_EXTRA_CHARGE_DEFINITION_MUTATION = gql`
  mutation DeleteExtraChargeDefinition($definitionId: ID!) {
    deleteExtraChargeDefinition(definitionId: $definitionId) {
      success
      message
    }
  }
`;

export const APPLY_BUILDING_EXTRA_CHARGES_MUTATION = gql`
  mutation ApplyBuildingExtraCharges(
    $definitionId: ID!
    $billingMonth: String!
    $chargeDate: Date!
    $dueDate: Date!
    $rows: [ExtraChargeRowInput]!
    $notes: String
  ) {
    applyBuildingExtraCharges(
      definitionId: $definitionId
      billingMonth: $billingMonth
      chargeDate: $chargeDate
      dueDate: $dueDate
      rows: $rows
      notes: $notes
    ) {
      success
      message
      postedCount
      skippedCount
    }
  }
`;

export const POST_TENANT_EXTRA_CHARGE_MUTATION = gql`
  mutation PostTenantExtraCharge(
    $definitionId: ID!
    $occupancyId: ID!
    $billingMonth: String!
    $chargeDate: Date!
    $dueDate: Date!
    $amount: Decimal
    $unitsUsed: Decimal
    $notes: String
  ) {
    postTenantExtraCharge(
      definitionId: $definitionId
      occupancyId: $occupancyId
      billingMonth: $billingMonth
      chargeDate: $chargeDate
      dueDate: $dueDate
      amount: $amount
      unitsUsed: $unitsUsed
      notes: $notes
    ) {
      success
      message
      entry {
        id
      }
    }
  }
`;

export const UPDATE_EXTRA_CHARGE_ENTRY_MUTATION = gql`
  mutation UpdateExtraChargeEntry(
    $entryId: ID!
    $amount: Decimal
    $unitsUsed: Decimal
    $chargeDate: Date
    $dueDate: Date
    $notes: String
  ) {
    updateExtraChargeEntry(
      entryId: $entryId
      amount: $amount
      unitsUsed: $unitsUsed
      chargeDate: $chargeDate
      dueDate: $dueDate
      notes: $notes
    ) {
      success
      message
      entry {
        id
      }
    }
  }
`;

export const VOID_TENANT_CHARGE_MUTATION = gql`
  mutation VoidTenantCharge($chargeId: ID!) {
    voidTenantCharge(chargeId: $chargeId) {
      success
      message
    }
  }
`;

export const VOID_RENT_SCHEDULE_MUTATION = gql`
  mutation VoidRentSchedule($scheduleId: ID!) {
    voidRentSchedule(scheduleId: $scheduleId) {
      success
      message
    }
  }
`;
