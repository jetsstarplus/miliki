import { gql } from "@apollo/client";

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
