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
