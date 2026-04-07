import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { PAYMENT_RECEIPTS_QUERY } from '@/graphql/properties/queries/payments';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TransactionLine {
  amount: number;
  paymentType: { name: string };
}

interface PaymentReceipt {
  id: string;
  amount: number;
  status: string;
  reference: string;
  confirmationCode: string;
  transactionDate: string;
  paymentMode: string;
  tenant: { fullName: string };
  unit: { unitNumber: string; building: { name: string } };
  transactionLines: TransactionLine[];
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: Colors.success,
  PENDING: Colors.warning,
  FAILED: Colors.error,
  REVERSED: Colors.error,
  UNMATCHED: '#6B7280',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function PaymentCard({ item }: { item: PaymentReceipt }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusColor = STATUS_COLORS[item.status] ?? colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reference} numberOfLines={1}>
            {item.reference ?? item.confirmationCode ?? `Payment #${item.id}`}
          </Text>
          {item.tenant?.fullName ? (
            <Text style={styles.tenantName} numberOfLines={1}>{item.tenant.fullName}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>KES {Number(item.amount ?? 0).toLocaleString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.unit?.unitNumber ? (
          <View style={styles.metaItem}>
            <Ionicons name="home-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>
              Unit {item.unit.unitNumber}
              {item.unit.building?.name ? ` · ${item.unit.building.name}` : ''}
            </Text>
          </View>
        ) : null}
        {item.transactionDate ? (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.transactionDate)}</Text>
          </View>
        ) : null}
        {item.paymentMode ? (
          <View style={styles.metaItem}>
            <Ionicons name="card-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.paymentMode.replace(/_/g, ' ')}</Text>
          </View>
        ) : null}
      </View>

      {item.transactionLines && item.transactionLines.length > 0 && (
        <View style={styles.linesRow}>
          {item.transactionLines.slice(0, 3).map((line, idx) => (
            <View key={idx} style={styles.lineItem}>
              <Text style={styles.lineType} numberOfLines={1}>{line.paymentType?.name ?? '—'}</Text>
              <Text style={styles.lineAmount}>KES {Number(line.amount ?? 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function Payments() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text.trim()), 400);
  }, []);

  const queryVars = useMemo(
    () => (debouncedSearch ? { search: debouncedSearch } : {}),
    [debouncedSearch],
  );

  const { nodes: payments, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<PaymentReceipt>(PAYMENT_RECEIPTS_QUERY, 'paymentReceipts', 50, queryVars);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Payments" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by reference, tenant…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && payments.length === 0 && <LoadingState />}

      {error && payments.length === 0 && (
        <ErrorState
          title="Failed to load payments"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <PaymentCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            hasMore && payments.length > 0
              ? <ActivityIndicator color={colors.primary} style={styles.footer} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="card-outline"
                title={debouncedSearch ? 'No payments found' : 'No payments yet'}
                description={debouncedSearch ? 'Try a different search term.' : 'Payment receipts will appear here once recorded.'}
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
    footer: { paddingVertical: Spacing.md },

    searchWrap: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: Spacing.md,
      height: 42,
    },
    searchInput: { flex: 1, fontSize: Typography.fontSizeSm, color: c.text, paddingVertical: 0 },

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
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: Radius.sm,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reference: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    tenantName: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    amount: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
      marginBottom: 3,
    },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
    statusText: { fontSize: 10, fontWeight: Typography.fontWeightSemibold },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xs },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },

    linesRow: {
      paddingTop: Spacing.xs,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      gap: 3,
    },
    lineItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    lineType: { fontSize: Typography.fontSizeXs, color: c.textSecondary, flex: 1 },
    lineAmount: { fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium, color: c.text },
  });
}
