import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { TENANTS_QUERY } from '@/graphql/properties/queries/tenants';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
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
  const displayName = tenant.fullName || `${tenant.firstName} ${tenant.lastName}`;

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
            <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.contactText}>{tenant.phone}</Text>
          </View>
        ) : null}
        {tenant.email ? (
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.contactText} numberOfLines={1}>{tenant.email}</Text>
          </View>
        ) : null}
      </View>

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

  const { nodes: tenants, loading, error, refreshing, onRefresh, onEndReached, hasMore, refetch } =
    usePaginatedQuery<Tenant>(TENANTS_QUERY, 'tenants', 50);

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
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListFooterComponent={
            hasMore && tenants.length > 0
              ? <ActivityIndicator color={Colors.primary} style={styles.footer} />
              : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="people-outline"
                title="No tenants yet"
                description="Add your first tenant to get started."
                action={{ label: 'Add tenant', onPress: () => router.push('/tenants/add' as any) }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: 80 },
  footer: { paddingVertical: Spacing.md },
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightBold,
    color: Colors.primary,
  },
  name: {
    fontSize: Typography.fontSizeMd,
    fontWeight: Typography.fontWeightSemibold,
    color: Colors.text,
    flex: 1,
  },
  idText: { fontSize: Typography.fontSizeXs, color: Colors.textMuted, marginTop: 1 },
  contactRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  contactText: { fontSize: Typography.fontSizeXs, color: Colors.textSecondary, flex: 1 },
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

