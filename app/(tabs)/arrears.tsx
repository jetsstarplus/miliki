import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { ARREARS_REPORT_QUERY } from '@/graphql/properties/queries/arrears';
import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ArrearSchedule {
  id: string;
  unit: { unitNumber: string; accountNumber: string };
  building: { name: string };
  tenant: { fullName: string };
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  daysOverdue: number;
}

interface Summary {
  totalExpected: number;
  totalPaid: number;
  totalArrears: number;
}

function ArrearCard({ item }: { item: ArrearSchedule }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isOverdue = item.daysOverdue > 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tenantAvatar}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tenantName} numberOfLines={1}>{item.tenant?.fullName ?? '—'}</Text>
          <Text style={styles.unitLabel} numberOfLines={1}>
            Unit {item.unit?.unitNumber} · {item.building?.name}
          </Text>
        </View>
        <View style={[styles.statusBadge, isOverdue ? styles.badgeError : styles.badgeWarning]}>
          <Text style={[styles.statusText, { color: isOverdue ? Colors.error : Colors.warning }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.amounts}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Expected</Text>
          <Text style={styles.amountValue}>KES {Number(item.expectedAmount ?? 0).toLocaleString()}</Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, { color: Colors.success }]}>
            KES {Number(item.paidAmount ?? 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, { color: Colors.error }]}>
            KES {Number(item.balance ?? 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {isOverdue && (
        <View style={styles.overdueRow}>
          <Ionicons name="time-outline" size={12} color={Colors.error} />
          <Text style={styles.overdueText}>{item.daysOverdue} days overdue</Text>
        </View>
      )}
    </View>
  );
}

function SummaryCard({ summary }: { summary: Summary }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Arrears Summary</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>KES {Number(summary.totalExpected ?? 0).toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total Expected</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            KES {Number(summary.totalPaid ?? 0).toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>Total Paid</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.error }]}>
            KES {Number(summary.totalArrears ?? 0).toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>Total Arrears</Text>
        </View>
      </View>
    </View>
  );
}

export default function Arrears() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, loading, error, refetch } = useQuery(ARREARS_REPORT_QUERY, {
    fetchPolicy: 'cache-and-network',
    variables: { first: 100 },
  });

  const summary: Summary = data?.arrearsReport?.summary ?? { totalExpected: 0, totalPaid: 0, totalArrears: 0 };
  const schedules: ArrearSchedule[] =
    data?.arrearsReport?.schedules?.edges?.map((e: any) => e.node) ?? [];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Arrears" />

      {loading && schedules.length === 0 && <LoadingState />}

      {error && schedules.length === 0 && (
        <ErrorState
          title="Failed to load arrears"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <FlatList
          data={schedules}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ArrearCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            data?.arrearsReport ? <SummaryCard summary={summary} /> : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="checkmark-circle-outline"
                title="No arrears"
                description="All rent schedules are up to date."
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: 80 },

    summaryCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      ...Shadow.sm,
    },
    summaryTitle: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      marginBottom: Spacing.sm,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryValue: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
    },
    summaryLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 2 },
    summaryDivider: { width: 1, height: 30, backgroundColor: c.borderLight },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    tenantAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tenantName: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    unitLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    statusBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.sm,
    },
    badgeError: { backgroundColor: 'rgba(239,68,68,0.1)' },
    badgeWarning: { backgroundColor: 'rgba(245,158,11,0.1)' },
    statusText: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },

    amounts: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    amountItem: { flex: 1, alignItems: 'center' },
    amountLabel: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginBottom: 2 },
    amountValue: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    amountDivider: { width: 1, height: 30, backgroundColor: c.borderLight },

    overdueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: Spacing.xs,
      backgroundColor: 'rgba(239,68,68,0.06)',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.sm,
    },
    overdueText: {
      fontSize: Typography.fontSizeXs,
      color: Colors.error,
      fontWeight: Typography.fontWeightMedium,
    },
  });
}
