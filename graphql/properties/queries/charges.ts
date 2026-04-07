import { gql } from '@apollo/client';

/**
 * Tenant Charges (Section 10)
 */

export const TENANT_CHARGES_HISTORY_QUERY = gql`
  query TenantChargesHistory(
    $tenantId: Int!, $search: String, $status: String,
    $fromDate: Date, $toDate: Date, $page: Int
  ) {
    tenantChargesHistory(
      tenantId: $tenantId, search: $search, status: $status,
      fromDate: $fromDate, toDate: $toDate, page: $page
    )
  }
`;

export const UNIT_CHARGES_HISTORY_QUERY = gql`
  query UnitChargesHistory(
    $unitId: Int!, $search: String, $status: String,
    $fromDate: Date, $toDate: Date, $page: Int
  ) {
    unitChargesHistory(
      unitId: $unitId, search: $search, status: $status,
      fromDate: $fromDate, toDate: $toDate, page: $page
    )
  }
`;

export const BUILDING_CHARGES_REPORT_QUERY = gql`
  query BuildingChargesReport(
    $buildingId: Int!, $search: String, $unitId: Int, $tenantId: Int,
    $status: String, $fromDate: Date, $toDate: Date, $page: Int
  ) {
    buildingChargesReport(
      buildingId: $buildingId, search: $search, unitId: $unitId, tenantId: $tenantId,
      status: $status, fromDate: $fromDate, toDate: $toDate, page: $page
    )
  }
`;
