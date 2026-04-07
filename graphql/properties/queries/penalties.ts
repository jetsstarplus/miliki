import { gql } from '@apollo/client';

/**
 * Rent Schedule Config & Penalties (Section 14)
 */

export const RENT_SCHEDULE_CONFIGS_QUERY = gql`
  query RentScheduleConfigs($buildingId: ID) {
    rentScheduleConfigs(buildingId: $buildingId) {
      id
      building { name }
      dayOfMonth
      gracePeriodDays
      isActive
    }
  }
`;

export const PENALTY_RULES_QUERY = gql`
  query PenaltyRules($buildingId: ID, $isActive: Boolean, $search: String) {
    penaltyRules(buildingId: $buildingId, isActive: $isActive, search: $search) {
      id
      name
      priority
      penaltyType
      amount
      rate
      gracePeriodDays
      isActive
      building { name }
    }
  }
`;

export const APPLIED_PENALTIES_QUERY = gql`
  query AppliedPenalties(
    $buildingId: ID, $notificationSent: Boolean, $search: String, $limit: Int
  ) {
    appliedPenalties(
      buildingId: $buildingId, notificationSent: $notificationSent,
      search: $search, limit: $limit
    ) {
      id
      appliedAt
      penaltyAmount
      notificationSent
      rentSchedule {
        tenant { fullName }
        unit { unitNumber }
      }
      penaltyRule { name }
    }
  }
`;
