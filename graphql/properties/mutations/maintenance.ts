import { gql } from "@apollo/client";

export const CREATEUPDATEMAINTENANCE = gql`
mutation CreateUpdateMaintenance($id: ID, $buildingId: ID!, $unitId: ID, $tenantId: ID, $title: String!, $description: String, $category: String, $priority: String, $status: String, $requestedDate: Date, $scheduledDate: Date, $resolvedDate: Date, $slaHours: Int, $assignedToId: ID, $vendorName: String, $estimatedCost: Decimal, $actualCost: Decimal, $tenantImpact: Boolean, $payableAmount: Decimal, $payableStatus: String) {
  createUpdateMaintenanceRequest(
    actualCost: $actualCost,
    assignedToId: $assignedToId,
    buildingId: $buildingId,
    category: $category,
    description:$description,
    estimatedCost:$estimatedCost,
    id:$id,
    payableAmount: $payableAmount,
    payableStatus: $payableStatus,
    priority: $priority,
    requestedDate:$requestedDate,
    resolvedDate: $resolvedDate,
    scheduledDate:$scheduledDate,
    status:$status,
    tenantId: $tenantId,
    tenantImpact:$tenantImpact,
    title:$title,
    unitId:$unitId,
    vendorName:$vendorName,
    slaHours: $slaHours,
  ) {
     request{
      id
      description
    }
    success
    message
  }
}`;

export const DELETEMAINTENANCE = gql`
    mutation DeleteMaintenance($id: ID!){
        deleteMaintenanceRequest(id: $id){
            success
            message
        }
    }`;


