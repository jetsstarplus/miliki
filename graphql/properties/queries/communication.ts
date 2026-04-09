import { gql } from "@apollo/client";

export const CAMPAIGN_LIST_DATA = gql`
  query CampaignListData($search: String, $status: String, $frequency: String, $buildingId: ID, $first: Int, $after: String) {
    notificationCampaignListData(
      search: $search
      status: $status
      frequency: $frequency
      buildingId: $buildingId
      first: $first
      after: $after
    )
  }
`;

export const NOTIFICATION_LOGS = gql`
  query NotificationLogs($search: String, $first: Int, $after: String) {
    notificationLogsListData(
      search: $search
      first: $first
      after: $after
    )
  }
`;

