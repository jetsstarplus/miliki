import { gql } from "@apollo/client";

export const MAINTENANCES = gql`
  query BuildingList($first: Int, $after: String, $search:String) {
  maintenanceRequests(first: $first, after: $after, search: $search) {
    edges{
      node{
        createdAt
        modifiedAt
        id
        building{
          name
          id
        }
        unit{
          description
          id
        }
        tenant{
        	id
          fullName
        }
        title
        description
        category
        priority
        status
        requestedDate
        scheduledDate
        resolvedDate
        slaHours
        assignedTo{
          id
          no
          searchName
        }
        vendorName
        estimatedCost
        actualCost
        attachment
        tenantImpact
        itemsUsed
        
      }
    }
    pageInfo {
      hasNextPage
      endCursor
      hasPreviousPage
      startCursor
    }
  }
}`;


export const MAINTENANCE = gql`
query Maintenance($id: ID!) {
  maintenanceRequest(id: $id) {
    createdAt
    modifiedAt
    id
    building{
        name
        id
    }
    unit{
        description
        id
        unitNumber
        building{
            id
            name
        }
    }
    tenant{
        id
        fullName
    }
    title
    description
    category
    priority
    status
    requestedDate
    scheduledDate
    resolvedDate
    slaHours
    assignedTo{
        id
        no
        searchName
    }
    vendorName
    estimatedCost
    actualCost
    attachment
    tenantImpact
    itemsUsed
    expenseAccount{
        name
        code
    }
    payableAccount{
        name
        code
    }
    payableStatus
    payablePaidDate
    expenseJournalEntry{
        id
        entryNumber
    }
  }
}`;
