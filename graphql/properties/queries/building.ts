import { gql } from '@apollo/client';

export const BUILDINGS_DROPDOWN = gql`
  query BuildingsDropdown($first: Int, $search: String) {
    buildings(first: $first, search: $search) {
      edges {
        node {
          id
          name
          code
        }
      }
    }
  }
`;

export const DASHBOARD = gql`
query DASHBOARD{
  dashboard{
    
    currentRole
    stats{
      totalBuildings
      totalUnits
      totalArrears
    	vacantUnits
      occupiedUnits
      activeTenants
      reservedUnits
      
    }
    adminSection{
      unmatchedPaymentsCount
      totalRevenue
      pendingValidations
      agentsCount
      landlordsCount
      accountantsCount
      tenantsCount
    }
    accountantSection{
      totalCollected
      pendingReconciliation
    }
  }
}`;

export const BUILDING_LIST = gql`
  query BuildingList($first: Int, $after: String, $search:String) {
  buildings(first: $first, after: $after, search: $search) {
    edges{
      node{
        id
        name
        numberOfFloors
        createdAt
        modifiedAt
        code
        buildingType
        address
        city
        county
        latitude
        longitude
        totalUnits
        yearBuilt
        managerName
        occupancyRate
        vacantUnitsCount
        totalUnits
        occupiedUnitsCount
        registeredUnitsCount
        images{
          edges{
            node{
              id
              imageUrl
              thumbnailUrl
              isPrimary
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
      hasPreviousPage
      startCursor
    }
  }
}
`;


export const BUILDING_DETAIL = gql`
query BuildingDetail($id: ID!) {
  oneBuilding(id: $id) {
    id
    createdAt
    modifiedAt
    createdBy{
      searchName    
    }
    name
    code
    buildingType
    yearBuilt
    address
    city
    county
    latitude
    longitude
    numberOfFloors
    totalUnits
    yearBuilt
    yearBuilt
    managerName
    managerPhone
    managerEmail
    description
    isActive
    images{
      edges{
        node{
          id
          modifiedAt
          imageUrl
          isPrimary
        }
      }
    }
    documents{
      edges{
        node{
          id
          modifiedAt
          fileUrl
        }
      }
    }
    thumbnailUrl
    occupancyRate
    occupiedUnitsCount
    vacantUnitsCount
    totalMonthlyRent
    blockAutomaticNotifications
    notificationPreferences
    
  }
}`;

export const BUILDINGS_FOR_DROPDOWN = gql`
query BuildingsForDropdown {
  buildings(first: 200) {
    edges {
      node {
        id
        name
      }
    }
  }
}
`;

export const BUILDING_IMAGES_QUERY = gql`
  query BuildingImages($buildingId: Int) {
    buildingImages(buildingId: $buildingId) {
      id
      imageUrl
      thumbnailUrl
      isPrimary
      caption
      createdAt
    }
  }
`;

export const BUILDING_DOCUMENTS_QUERY = gql`
  query BuildingDocuments($buildingId: Int) {
    buildingDocuments(buildingId: $buildingId) {
      id
      fileUrl
      name
      createdAt
    }
  }
`;

export const PENALTY_RULES_QUERY = gql`
  query PenaltyRules($buildingId: Int, $isActive: Boolean, $search: String) {
    penaltyRules(buildingId: $buildingId, isActive: $isActive, search: $search) {
      id
      name
      calculationType
      isActive
      gracePeriodDays
      priority
    }
  }
`;

export const APPLIED_PENALTIES_QUERY = gql`
  query AppliedPenalties($buildingId: Int, $notificationSent: Boolean, $search: String, $limit: Int) {
    appliedPenalties(
      buildingId: $buildingId
      notificationSent: $notificationSent
      search: $search
      limit: $limit
    ) {
      id
      rentSchedule {
        id
      }
      penaltyRule {
        id
        name
      }
      amount
      notificationSent
      createdAt
    }
  }
`;

export const BUILDING_CHARGES_REPORT_QUERY = gql`
  query BuildingChargesReport(
    $buildingId: Int!
    $search: String
    $unitId: Int
    $tenantId: Int
    $status: String
    $serviceTypeId: Int
    $fromDate: Date
    $toDate: Date
    $page: Int
  ) {
    buildingChargesReport(
      buildingId: $buildingId
      search: $search
      unitId: $unitId
      tenantId: $tenantId
      status: $status
      serviceTypeId: $serviceTypeId
      fromDate: $fromDate
      toDate: $toDate
      page: $page
    )
  }
`;

export const BUILDING_EXTRA_CHARGES_DATA_QUERY = gql`
  query BuildingExtraChargesData($buildingId: Int!, $historyMonth: String, $historySearch: String, $page: Int) {
    buildingExtraChargesData(
      buildingId: $buildingId
      historyMonth: $historyMonth
      historySearch: $historySearch
      page: $page
    )
  }
`;

export const TENANT_CHARGES_HISTORY_QUERY = gql`
  query TenantChargesHistory(
    $tenantId: Int!
    $search: String
    $status: String
    $serviceTypeId: Int
    $fromDate: Date
    $toDate: Date
    $page: Int
  ) {
    tenantChargesHistory(
      tenantId: $tenantId
      search: $search
      status: $status
      serviceTypeId: $serviceTypeId
      fromDate: $fromDate
      toDate: $toDate
      page: $page
    )
  }
`;

export const UNIT_CHARGES_HISTORY_QUERY = gql`
  query UnitChargesHistory(
    $unitId: Int!
    $search: String
    $status: String
    $serviceTypeId: Int
    $fromDate: Date
    $toDate: Date
    $page: Int
  ) {
    unitChargesHistory(
      unitId: $unitId
      search: $search
      status: $status
      serviceTypeId: $serviceTypeId
      fromDate: $fromDate
      toDate: $toDate
      page: $page
    )
  }
`;
