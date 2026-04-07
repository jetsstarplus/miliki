import { gql } from '@apollo/client';

/**
 * Building Extra Charges (Section 12)
 */

export const BUILDING_EXTRA_CHARGES_DATA_QUERY = gql`
  query BuildingExtraChargesData(
    $buildingId: Int!, $historyMonth: String, $historySearch: String, $page: Int
  ) {
    buildingExtraChargesData(
      buildingId: $buildingId, historyMonth: $historyMonth,
      historySearch: $historySearch, page: $page
    )
  }
`;
