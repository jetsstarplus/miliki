import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
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
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../context/theme';
import { LEASE_LIST } from '../../graphql/properties/queries/leases';

interface Lease {
  id: string;
  leaseNumber: string;
  leaseType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  rentAmount: string;
  depositAmount: string;
  paymentFrequency: string;
  renewalOption: boolean;
  occupancy: {
    id: string;
    tenant: { id: string; fullName: string };
    unit: { id: string; accountNumber: string; unitNumber: string; unitType: { name: string; id: string } | null };
  };
}

function leaseStatusColor(s: string): 'success' | 'warning' | 'error' | 'info' {
  if (s === 'ACTIVE') return 'success';
  if (s === 'EXPIRED') return 'warning';
  if (s === 'TERMINATED') return 'error';
  return 'info';
}

function LeaseCard({ item }: { item: Lease }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/leases/[id]', params: { id: item.id } } as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.leaseNumber}>{item.leaseNumber ?? '—'}</Text>
          <Text style={styles.unitText}>
            Unit {item.occupancy?.unit?.unitNumber ?? '—'}
            {item.occupancy?.unit?.unitType?.name ? ` · ${item.occupancy.unit.unitType.name}` : ''}
          </Text>
        </View>
        <StatusBadge label={item.status} color={leaseStatusColor(item.status)} />
      </View>

      <View style={styles.tenantRow}>
        <Ionicons name="person-outline" size={13} color={colors.textMuted} />
        <Text style={styles.tenantText}>{item.occupancy?.tenant?.fullName ?? '—'}</Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Rent</Text>
          <Text style={styles.detailValue}>
            KES {Number(item.rentAmount ?? 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Deposit</Text>
          <Text style={styles.detailValue}>
            KES {Number(item.depositAmount ?? 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Frequency</Text>
          <Text style={styles.detailValue}>{item.paymentFrequency ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.datesRow}>
        <View style={styles.dateItem}>
          <Ionicons name="play-outline" size={11} color={colors.textMuted} />
          <Text style={styles.dateText}>{item.startDate ?? '—'}</Text>
        </View>
        {item.endDate && (
          <View style={styles.dateItem}>
            <Ionicons name="stop-outline" size={11} color={colors.textMuted} />
            <Text style={styles.dateText}>{item.endDate}</Text>
          </View>
        )}
        {item.renewalOption && (
          <View style={styles.dateItem}>
            <Ionicons name="refresh-outline" size={11} color={Colors.success} />
            <Text style={[styles.dateText, { color: Colors.success }]}>Renewal option</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function Leases() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, loading, error, refetch, fetchMore } = useQuery(LEASE_LIST, {
    variables: { first: 30, search: debouncedSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const leases: Lease[] = data?.leases?.edges?.map((e: any) => e.node) ?? [];
  const pageInfo = data?.leases?.pageInfo;

  function handleSearchChange(text: string) {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(text), 400);
  }

  async function onRefresh() {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }

  function onEndReached() {
    if (!pageInfo?.hasNextPage) return;
    fetchMore({ variables: { after: pageInfo.endCursor } });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Leases" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leases…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearchChange}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading && !data ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          data={leases}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <LeaseCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No leases" description="No leases found." />}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    list: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      margin: Spacing.md,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, paddingVertical: Spacing.sm, fontSize: Typography.fontSizeSm, color: c.text },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: 6 },
    iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center' },
    leaseNumber: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },
    unitText: { fontSize: 11, color: c.textSecondary, marginTop: 1 },

    tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    tenantText: { fontSize: Typography.fontSizeXs, color: c.textSecondary },

    detailsRow: { flexDirection: 'row', marginBottom: 6 },
    detailItem: { flex: 1, alignItems: 'center' },
    detailLabel: { fontSize: 10, color: c.textMuted, marginBottom: 1 },
    detailValue: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, color: c.text },

    datesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 4 },
    dateItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    dateText: { fontSize: 11, color: c.textMuted },
  });
}
