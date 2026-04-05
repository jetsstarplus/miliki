import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/theme';
import { TENANTS_QUERY } from '@/graphql/properties/queries/tenants';
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

interface Tenant {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email: string;
  occupation: string;
  employer: string;
  isActive: boolean;
  totalArrears: number;
  occupancies?: { edges: { node: { isCurrent: boolean; unit: { unitNumber: string; building: { name: string } } } }[] };
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase();
}

function TenantCard({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const displayName = tenant.fullName || `${tenant.firstName} ${tenant.lastName}`;
  const currentOccupancy = tenant.occupancies?.edges?.find(e => e.node.isCurrent)?.node;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/tenants/[id]', params: { id: tenant.id } } as any)}
    >
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(displayName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <StatusBadge
              label={tenant.isActive ? 'Active' : 'Inactive'}
              color={tenant.isActive ? 'success' : 'error'}
            />
          </View>
          <Text style={styles.idText}>ID: {tenant.idNumber || '—'}</Text>
        </View>
      </View>

      <View style={styles.contactRow}>
        {tenant.phone ? (
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={12} color={colors.textMuted} />
            <Text style={styles.contactText}>{tenant.phone}</Text>
          </View>
        ) : null}
        {tenant.email ? (
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={12} color={colors.textMuted} />
            <Text style={styles.contactText} numberOfLines={1}>{tenant.email}</Text>
          </View>
        ) : null}
      </View>

      {currentOccupancy && (
        <View style={styles.occupancyRow}>
          <Ionicons name="home-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.occupancyText} numberOfLines={1}>
            Unit {currentOccupancy.unit.unitNumber} · {currentOccupancy.unit.building.name}
          </Text>
        </View>
      )}

      {(tenant.totalArrears ?? 0) > 0 && (
        <View style={styles.arrearsRow}>
          <Ionicons name="warning-outline" size={12} color={Colors.error} />
          <Text style={styles.arrearsText}>
            Arrears: KES {Number(tenant.totalArrears).toLocaleString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function Tenants() {
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
    () => (debouncedSearch ? { search: debouncedSearch } : {}),
    [debouncedSearch],
  );

  const { nodes: tenants, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<Tenant>(TENANTS_QUERY, 'tenants', 50, queryVars);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Tenants"
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/tenants/add' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, ID…"
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

      {loading && tenants.length === 0 && <LoadingState />}

      {error && tenants.length === 0 && (
        <ErrorState
          title="Failed to load tenants"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {!error && (
        <FlatList
          data={tenants}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TenantCard tenant={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={
            hasMore && tenants.length > 0
              ? <ActivityIndicator color={colors.primary} style={styles.footer} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="people-outline"
                title={debouncedSearch ? 'No tenants found' : 'No tenants yet'}
                description={debouncedSearch ? 'Try a different search term.' : 'Add your first tenant to get started.'}
                action={debouncedSearch ? undefined : { label: 'Add tenant', onPress: () => router.push('/tenants/add' as any) }}
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Search bar
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
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: c.text,
    paddingVertical: 0,
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightBold,
    color: c.primary,
  },
  name: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightSemibold,
    color: c.text,
    flex: 1,
  },
  idText: { fontSize: Typography.fontSizeXs, color: c.textMuted, marginTop: 1 },
  contactRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  contactText: { fontSize: Typography.fontSizeXs, color: c.textSecondary, flex: 1 },
  occupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  occupancyText: {
    fontSize: Typography.fontSizeXs,
    color: c.textSecondary,
    flex: 1,
  },
  arrearsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  arrearsText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.error,
    fontWeight: Typography.fontWeightMedium,
  },
  });
}

