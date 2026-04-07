import { useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
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
import { MAINTENANCES } from '../../graphql/properties/queries/maintenance';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requestedDate: string;
  scheduledDate: string | null;
  resolvedDate: string | null;
  vendorName: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  building: { id: string; name: string };
  unit: { id: string; description: string } | null;
  tenant: { id: string; fullName: string } | null;
}

function priorityColor(p: string): 'error' | 'warning' | 'info' | 'success' {
  if (p === 'URGENT') return 'error';
  if (p === 'HIGH') return 'warning';
  if (p === 'MEDIUM') return 'info';
  return 'success';
}

function statusColor(s: string): 'error' | 'warning' | 'info' | 'success' {
  if (s === 'OPEN') return 'error';
  if (s === 'IN_PROGRESS') return 'warning';
  if (s === 'RESOLVED') return 'success';
  return 'info';
}

function MaintenanceCard({ item }: { item: MaintenanceRequest }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.buildingText}>{item.building?.name ?? '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge label={item.status.replace('_', ' ')} color={statusColor(item.status)} />
          <StatusBadge label={item.priority} color={priorityColor(item.priority)} />
        </View>
      </View>

      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.metaRow}>
        {item.tenant && (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.tenant.fullName}</Text>
          </View>
        )}
        {item.category && (
          <View style={styles.metaItem}>
            <Ionicons name="pricetag-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.category}</Text>
          </View>
        )}
        {item.requestedDate && (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.requestedDate}</Text>
          </View>
        )}
      </View>

      {(item.estimatedCost || item.actualCost) && (
        <View style={styles.costsRow}>
          {item.estimatedCost && (
            <Text style={styles.costText}>
              Est: KES {Number(item.estimatedCost).toLocaleString()}
            </Text>
          )}
          {item.actualCost && (
            <Text style={[styles.costText, { color: Colors.success }]}>
              Actual: KES {Number(item.actualCost).toLocaleString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function Maintenance() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, loading, error, refetch, fetchMore } = useQuery(MAINTENANCES, {
    variables: { first: 30, search: debouncedSearch || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const items: MaintenanceRequest[] = data?.maintenanceRequests?.edges?.map((e: any) => e.node) ?? [];
  const pageInfo = data?.maintenanceRequests?.pageInfo;

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
      <AppHeader title="Maintenance" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search requests…"
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
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MaintenanceCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState icon="construct-outline" title="No maintenance requests" description="No maintenance requests found." />}
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
      marginBottom: 0,
      paddingHorizontal: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    searchIcon: { marginRight: 6 },
    searchInput: {
      flex: 1,
      paddingVertical: Spacing.sm,
      fontSize: Typography.fontSizeSm,
      color: c.text,
    },

    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...Shadow.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    iconWrap: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, color: c.text },
    buildingText: { fontSize: 11, color: c.textSecondary, marginTop: 1 },
    description: { fontSize: 12, color: c.textSecondary, marginBottom: Spacing.xs, lineHeight: 18 },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: 11, color: c.textMuted },

    costsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
    costText: { fontSize: 11, color: c.textSecondary },
  });
}
