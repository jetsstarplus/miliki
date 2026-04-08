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
