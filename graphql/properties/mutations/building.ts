import { gql } from "@apollo/client";

export const CREATE_BUILDING_MUTATION = gql`
  mutation CreateBuilding(
    $name: String!
    $code: String
    $buildingType: String!
    $address: String!
    $city: String!
    $county: String
    $numberOfFloors: Int
    $yearBuilt: Int
    $managerName: String
    $managerPhone: String
    $managerEmail: String
    $description: String
  ) {
    createBuilding(
      name: $name
      code: $code
      buildingType: $buildingType
      address: $address
      city: $city
      county: $county
      numberOfFloors: $numberOfFloors
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
