import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { MANUAL_RECEIPTS_QUERY } from '@/graphql/properties/queries/payments';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StateFilter = '' | 'PENDING' | 'VALIDATED' | 'PAID' | 'REJECTED';

interface ManualReceiptNode {
  id: string;
  receiptNumber: string;
  payerName: string;
  amount: number;
  paymentDate: string;
  state: string;
  stateLabel: string;
  paymentMethod: string;
  canValidate: boolean;
  canReject: boolean;
  canDelete: boolean;
  canCreatePayment: boolean;
  tenant: { id: string; fullName: string } | null;
  unit: { id: string; unitNumber: string; building: { id: string; name: string } } | null;
}

const STATE_TABS: { label: string; value: StateFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Validated', value: 'VALIDATED' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Rejected', value: 'REJECTED' },
];

const STATE_COLORS: Record<string, string> = {
  PENDING: Colors.warning,
  VALIDATED: '#3B82F6',
  PAID: Colors.success,
  REJECTED: Colors.error,
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function ReceiptCard({ item, onPress }: { item: ManualReceiptNode; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const stateColor = STATE_COLORS[item.state] ?? colors.textMuted;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.receiptNum} numberOfLines={1}>
            {item.receiptNumber ?? `Receipt #${item.id}`}
          </Text>
          <Text style={styles.payerName} numberOfLines={1}>{item.payerName ?? '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>KES {Number(item.amount ?? 0).toLocaleString()}</Text>
          <View style={[styles.stateBadge, { backgroundColor: stateColor + '18' }]}>
            <Text style={[styles.stateText, { color: stateColor }]}>{item.stateLabel ?? item.state}</Text>
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
        {item.paymentDate ? (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.paymentDate)}</Text>
          </View>
        ) : null}
        {item.paymentMethod ? (
          <View style={styles.metaItem}>
            <Ionicons name="card-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.paymentMethod.replace(/_/g, ' ')}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ManualReceiptsList() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeState, setActiveState] = useState<StateFilter>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text.trim()), 400);
  }, []);

  const queryVars = useMemo(
    () => ({
      state: activeState || undefined,
      search: debouncedSearch || undefined,
    }),
    [activeState, debouncedSearch]
  );

  const { nodes, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<ManualReceiptNode>(MANUAL_RECEIPTS_QUERY, 'manualReceipts', 20, queryVars);

  const renderItem = useCallback(
    ({ item }: { item: ManualReceiptNode }) => (
      <ReceiptCard
        item={item}
        onPress={() =>
          router.push({ pathname: '/(tabs)/payments/manual/[id]', params: { id: item.id } } as any)
        }
      />
    ),
    [router]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [hasMore, colors.primary, styles.footerLoader]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Receipts</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Search receipts…"
            placeholderTextColor={colors.textMuted}
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

      {/* State filter chips */}
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {STATE_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[styles.chip, activeState === tab.value && styles.chipActive]}
              onPress={() => setActiveState(tab.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, activeState === tab.value && styles.chipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading && nodes.length === 0 ? (
        <LoadingState />
      ) : error && nodes.length === 0 ? (
        <ErrorState
          title="Failed to load receipts"
          message={error.message}
          onRetry={() => refetch()}
        />
      ) : (
        <FlatList
          data={nodes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={nodes.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No manual receipts"
              message={
                activeState || debouncedSearch
                  ? 'No receipts match your filter.'
                  : 'Create a receipt to get started.'
              }
            />
          }
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/payments/manual/create' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    searchWrap: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xs,
      backgroundColor: c.surface,
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
    filtersWrap: {
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.borderLight,
    },
    filtersRow: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.xs,
    },
    chip: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm + 2,
      borderRadius: Radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
    },
    chipActive: { borderColor: c.primary, backgroundColor: c.overlay },
    chipText: {
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      color: c.textSecondary,
    },
    chipTextActive: { color: c.primary },
    listContent: { padding: Spacing.md, paddingBottom: 100 },
    emptyContainer: { flexGrow: 1 },
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
    receiptNum: {
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
    },
    payerName: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
    amount: {
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightBold,
      color: c.text,
      marginBottom: 3,
    },
    stateBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
    stateText: { fontSize: 10, fontWeight: Typography.fontWeightSemibold },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },
    footerLoader: { paddingVertical: Spacing.md, alignItems: 'center' },
    fab: {
      position: 'absolute',
      bottom: Spacing.xl,
      right: Spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.md,
    },
  });
}
