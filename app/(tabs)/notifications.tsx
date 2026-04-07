import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { AppColors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';
import {
  USER_NOTIFICATIONS_QUERY,
} from '../../graphql/properties/queries/notifications';
import { MARK_USER_NOTIFICATION_READ_MUTATION } from '../../graphql/mutations';

interface UserNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function NotificationCard({
  item,
  onMarkRead,
}: {
  item: UserNotification;
  onMarkRead: (id: string, isRead: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.unreadCard]}
      activeOpacity={0.8}
      onPress={() => !item.isRead && onMarkRead(item.id, true)}
    >
      <View style={styles.cardRow}>
        <View style={[styles.dot, item.isRead ? styles.dotRead : styles.dotUnread]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
          <Text style={styles.date}>{item.createdAt}</Text>
        </View>
        {!item.isRead && (
          <TouchableOpacity
            style={styles.markBtn}
            onPress={() => onMarkRead(item.id, true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function Notifications() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery(USER_NOTIFICATIONS_QUERY, {
    variables: { isRead: showUnreadOnly ? false : undefined },
    fetchPolicy: 'cache-and-network',
  });

  const [markRead] = useMutation(MARK_USER_NOTIFICATION_READ_MUTATION, {
    refetchQueries: [{ query: USER_NOTIFICATIONS_QUERY, variables: { isRead: showUnreadOnly ? false : undefined } }],
  });

  const notifications: UserNotification[] =
    data?.userNotifications?.edges?.map((e: any) => e.node) ?? [];

  async function handleMarkRead(notificationId: string, isRead: boolean) {
    await markRead({ variables: { notificationId: Number(notificationId), isRead } });
  }

  async function onRefresh() {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Notifications" />

      {/* Filter toggle */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, !showUnreadOnly && styles.filterBtnActive]}
          onPress={() => setShowUnreadOnly(false)}
        >
          <Text style={[styles.filterLabel, !showUnreadOnly && { color: colors.primary }]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, showUnreadOnly && styles.filterBtnActive]}
          onPress={() => setShowUnreadOnly(true)}
        >
          <Text style={[styles.filterLabel, showUnreadOnly && { color: colors.primary }]}>Unread</Text>
        </TouchableOpacity>
      </View>

      {loading && !data ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationCard item={item} onMarkRead={handleMarkRead} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title={showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    filterRow: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      gap: 8,
    },
    filterBtn: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 5,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    filterBtnActive: { borderColor: c.primary, backgroundColor: c.overlay },
    filterLabel: { fontSize: 12, fontWeight: Typography.fontWeightMedium, color: c.textMuted },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    unreadCard: { borderLeftWidth: 3, borderLeftColor: c.primary },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    dotUnread: { backgroundColor: c.primary },
    dotRead: { backgroundColor: c.borderLight },
    title: { fontSize: Typography.fontSizeSm, color: c.textSecondary, marginBottom: 2 },
    titleUnread: { fontWeight: Typography.fontWeightSemibold, color: c.text },
    message: { fontSize: 12, color: c.textSecondary, lineHeight: 18, marginBottom: 4 },
    date: { fontSize: 10, color: c.textMuted },
    markBtn: { paddingLeft: 4 },
  });
}
