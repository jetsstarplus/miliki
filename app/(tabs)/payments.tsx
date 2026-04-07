import { useQuery } from '@apollo/client';
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
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';
import { PAYMENT_RECEIPTS_QUERY, UNMATCHED_PAYMENTS_QUERY } from '../../graphql/properties/queries/payments';

type TabKey = 'receipts' | 'unmatched';

interface PaymentReceipt {
  id: string;
  amount: string;
  status: string;
  reference: string;
  confirmationCode: string;
  transactionDate: string;
  tenant: { fullName: string } | null;
  unit: { unitNumber: string } | null;
}

interface UnmatchedPayment {
  id: number;
  transactionId: string;
  amount: string;
  phone: string;
  billRefNumber: string;
  firstName: string;
  potentialUnit: { id: number; unitNumber: string; building: string } | null;
}

function paymentStatusColor(s: string): 'success' | 'warning' | 'error' | 'info' {
  if (s === 'CONFIRMED' || s === 'ALLOCATED') return 'success';
  if (s === 'PENDING') return 'warning';
  if (s === 'FAILED') return 'error';
  return 'info';
}

function ReceiptCard({ item }: { item: PaymentReceipt }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.refText}>{item.reference ?? item.confirmationCode ?? '—'}</Text>
          <Text style={styles.subText}>{item.tenant?.fullName ?? '—'} · Unit {item.unit?.unitNumber ?? '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amountText}>KES {Number(item.amount ?? 0).toLocaleString()}</Text>
          <StatusBadge label={item.status} color={paymentStatusColor(item.status)} style={{ marginTop: 4 }} />
        </View>
      </View>
      {item.transactionDate && (
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
          <Text style={styles.dateText}>{item.transactionDate}</Text>
        </View>
      )}
    </View>
  );
}

function UnmatchedCard({ item }: { item: UnmatchedPayment }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.card, styles.unmatchedCard]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.refText}>{item.transactionId ?? '—'}</Text>
          <Text style={styles.subText}>{item.firstName ?? '—'} · {item.phone ?? '—'}</Text>
        </View>
        <Text style={[styles.amountText, { color: Colors.warning }]}>
          KES {Number(item.amount ?? 0).toLocaleString()}
        </Text>
      </View>
      {item.billRefNumber && (
        <Text style={styles.refNumber}>Ref: {item.billRefNumber}</Text>
      )}
      {item.potentialUnit && (
        <View style={styles.matchHint}>
          <Ionicons name="home-outline" size={12} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.primary }]}>
            Possible match: Unit {item.potentialUnit.unitNumber} · {item.potentialUnit.building}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function Payments() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<TabKey>('receipts');
  const [refreshing, setRefreshing] = useState(false);

  const receiptsQuery = useQuery(PAYMENT_RECEIPTS_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: activeTab !== 'receipts',
  });

  const unmatchedQuery = useQuery(UNMATCHED_PAYMENTS_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: activeTab !== 'unmatched',
  });

  const activeQuery = activeTab === 'receipts' ? receiptsQuery : unmatchedQuery;
  const receipts: PaymentReceipt[] = receiptsQuery.data?.paymentReceipts ?? [];
  const unmatched: UnmatchedPayment[] = Array.isArray(unmatchedQuery.data?.unmatchedPayments)
    ? unmatchedQuery.data.unmatchedPayments
    : [];

  async function onRefresh() {
    setRefreshing(true);
    try { await activeQuery.refetch(); } finally { setRefreshing(false); }
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'receipts', label: 'Receipts', icon: 'receipt-outline' },
    { key: 'unmatched', label: 'Unmatched', icon: 'alert-circle-outline' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Payments" />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && { color: colors.primary }]}>
              {tab.label}
            </Text>
            {tab.key === 'unmatched' && unmatched.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unmatched.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeQuery.loading && !activeQuery.data ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
      ) : activeQuery.error ? (
        <ErrorState message={activeQuery.error.message} onRetry={activeQuery.refetch} />
      ) : activeTab === 'receipts' ? (
        <FlatList
          data={receipts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ReceiptCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No receipts" description="No payment receipts found." />}
        />
      ) : (
        <FlatList
          data={unmatched}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <UnmatchedCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="No unmatched payments" description="All payments are allocated." />}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    tabBar: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      gap: 6,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: c.primary },
    tabLabel: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: c.textMuted },
    badge: { backgroundColor: Colors.warning, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    badgeText: { fontSize: 10, color: '#fff', fontWeight: Typography.fontWeightBold },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    unmatchedCard: { borderLeftWidth: 3, borderLeftColor: Colors.warning },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
    iconWrap: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center',
    },
    refText: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },
    subText: { fontSize: 11, color: c.textSecondary, marginTop: 1 },
    amountText: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightBold, color: c.text },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    dateText: { fontSize: 11, color: c.textMuted },
    refNumber: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
    matchHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  });
}
