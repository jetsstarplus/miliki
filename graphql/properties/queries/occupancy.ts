import { gql } from '@apollo/client';

/**
 * Occupancy Management (Section 8)
 */

export const ALL_OCCUPANCIES_QUERY = gql`
  query AllOccupancies($unitId: ID, $tenantId: ID, $isCurrent: Boolean) {
    allOccupancies(unitId: $unitId, tenantId: $tenantId, isCurrent: $isCurrent) {
      id
      startDate
      endDate
      rentAmount
      deposit
      tenant { fullName phone }
      unit {
        unitNumber
        building { name }
      }
    }
  }
`;
