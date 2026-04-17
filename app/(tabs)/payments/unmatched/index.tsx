import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { UNRECONCILED_GATEWAY_BUFFERS_QUERY } from '@/graphql/properties/queries/payments';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

interface GatewayBufferNode {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  payerName: string;
  payerPhone: string;
  paymentDate: string;
  source: string;
  externalReference: string;
  canReconcile: boolean;
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function BufferCard({ item, onPress }: { item: GatewayBufferNode; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reference} numberOfLines={1}>
            {item.reference ?? item.externalReference ?? `Buffer #${item.id}`}
          </Text>
          <Text style={styles.payerName} numberOfLines={1}>{item.payerName ?? '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>
            {item.currency ?? 'KES'} {Number(item.amount ?? 0).toLocaleString()}
          </Text>
          {item.canReconcile && (
            <View style={styles.reconcileBadge}>
              <Text style={styles.reconcileBadgeText}>Reconcile</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.metaRow}>
        {item.payerPhone ? (
          <View style={styles.metaItem}>
            <Ionicons name="call-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.payerPhone}</Text>
          </View>
        ) : null}
        {item.paymentDate ? (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.paymentDate)}</Text>
          </View>
        ) : null}
        {item.source ? (
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.source}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function UnreconciledList() {
  const router = useRouter();
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
    () => ({ search: debouncedSearch || undefined }),
    [debouncedSearch]
  );

  const { nodes, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<GatewayBufferNode>(
      UNRECONCILED_GATEWAY_BUFFERS_QUERY,
      'unreconciledGatewayBuffers',
      20,
      queryVars
    );

  const renderItem = useCallback(
    ({ item }: { item: GatewayBufferNode }) => (
      <BufferCard
        item={item}
        onPress={() =>
          router.push({ pathname: '/(tabs)/payments/unmatched/[id]', params: { id: item.id } } as any)
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
        <Text style={styles.headerTitle}>Unreconciled Payments</Text>
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
            placeholder="Search by reference, payer…"
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

      {/* Content */}
      {loading && nodes.length === 0 ? (
        <LoadingState />
      ) : error && nodes.length === 0 ? (
        <ErrorState
          title="Failed to load payments"
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
              icon="swap-horizontal-outline"
              title="No unreconciled payments"
              message={
                debouncedSearch
                  ? 'No payments match your search.'
                  : 'All gateway payments are reconciled.'
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
    listContent: { padding: Spacing.md, paddingBottom: 80 },
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
    reference: {
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
    reconcileBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.sm,
      backgroundColor: Colors.warning + '20',
    },
    reconcileBadgeText: { fontSize: 10, fontWeight: Typography.fontWeightSemibold, color: Colors.warning },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },
    footerLoader: { paddingVertical: Spacing.md, alignItems: 'center' },
  });
}
