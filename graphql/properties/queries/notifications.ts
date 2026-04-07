import { gql } from '@apollo/client';

/**
 * Notifications (Section 16)
 */

export const NOTIFICATIONS_CONTEXT_QUERY = gql`
  query NotificationsContext {
    notificationsContext
  }
`;

export const USER_NOTIFICATIONS_QUERY = gql`
  query UserNotifications($isRead: Boolean) {
    userNotifications(isRead: $isRead) {
      edges {
        node {
          id
          title
          message
          isRead
          createdAt
        }
      }
    }
  }
`;

export const CAMPAIGN_LIST_QUERY = gql`
  query CampaignListData(
    $search: String, $status: String, $buildingId: Int,
    $first: Int, $after: String
  ) {
    notificationCampaignListData(
      search: $search, status: $status, buildingId: $buildingId,
      first: $first, after: $after
    )
  }
`;
