import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import {
    CREATE_UPDATE_CONFIG_PAYMENT_TYPE_MUTATION,
    DELETE_CONFIG_PAYMENT_TYPE_MUTATION,
} from '@/graphql/properties/mutations/settings';
import { CHART_OF_ACCOUNTS_QUERY, CONFIG_PAYMENT_TYPES_QUERY } from '@/graphql/properties/queries/settings';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ServiceTypeForm = {
  id?: string;
  code: string;
  name: string;
  category: string;
  description: string;
  revenueAccountId: string;
  revenueAccountLabel: string;
  allocationAccountId: string;
  allocationAccountLabel: string;
  isActive: boolean;
  isDefault: boolean;
  requiresUnit: boolean;
  autoAllocate: boolean;
  prepayment: boolean;
  sortOrder: string;
};

const PAYMENT_CATEGORIES = ['RENT', 'DEPOSIT', 'UTILITY', 'SERVICE', 'PENALTY', 'OTHER'];

const EMPTY_FORM: ServiceTypeForm = {
  code: '',
  name: '',
  category: 'RENT',
  description: '',
  revenueAccountId: '',
  revenueAccountLabel: '',
  allocationAccountId: '',
  allocationAccountLabel: '',
  isActive: true,
  isDefault: false,
  requiresUnit: true,
  autoAllocate: true,
  prepayment: false,
  sortOrder: '0',
};

const PAGE_SIZE = 12;

export default function ServiceTypesSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ServiceTypeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');

  const { data, loading, refetch, fetchMore } = useQuery(CONFIG_PAYMENT_TYPES_QUERY, {
    variables: { first: PAGE_SIZE, after: null },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const { data: accountsData, loading: accountsLoading } = useQuery(CHART_OF_ACCOUNTS_QUERY, {
    variables: { first: 200, search: accountSearch || null, isActive: true },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const [saveServiceType] = useMutation(CREATE_UPDATE_CONFIG_PAYMENT_TYPE_MUTATION);
  const [deleteServiceType] = useMutation(DELETE_CONFIG_PAYMENT_TYPE_MUTATION);

  const serviceTypes = (data as any)?.configPaymentTypes?.edges?.map((edge: any) => edge.node) ?? [];
  const pageInfo = (data as any)?.configPaymentTypes?.pageInfo;
  const accountOptions: DropdownOption[] = useMemo(
    () =>
      ((accountsData as any)?.accountsConnection?.edges ?? [])
        .map((edge: any) => edge?.node)
        .filter(Boolean)
        .map((node: any) => ({
          id: String(node.id),
          label: `${node.code ?? ''} - ${node.name ?? ''}`.trim(),
          sublabel: node.accountType ?? undefined,
        })),
    [accountsData],
  );

  const filteredServiceTypes = serviceTypes.filter((node: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(node?.name ?? '').toLowerCase().includes(q) ||
      String(node?.code ?? '').toLowerCase().includes(q) ||
      String(node?.category ?? '').toLowerCase().includes(q)
    );
  });

  async function loadMore() {
    if (!pageInfo?.hasNextPage || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: { first: PAGE_SIZE, after: pageInfo.endCursor },
        updateQuery: (previous, { fetchMoreResult }) => {
          if (!fetchMoreResult?.configPaymentTypes) return previous;
          return {
            ...previous,
            configPaymentTypes: {
              ...fetchMoreResult.configPaymentTypes,
              edges: [
                ...(previous as any).configPaymentTypes?.edges ?? [],
                ...(fetchMoreResult as any).configPaymentTypes?.edges ?? [],
              ],
            },
          };
        },
      });
    } finally {
      setLoadingMore(false);
    }
  }

  function startCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function startEdit(node: any) {
    const revenueLabel = node?.revenueAccount
      ? `${node.revenueAccount.code ?? ''} - ${node.revenueAccount.name ?? ''}`.trim()
      : '';
    const allocationLabel = node?.allocationAccount
      ? `${node.allocationAccount.code ?? ''} - ${node.allocationAccount.name ?? ''}`.trim()
      : '';

    setForm({
      id: node.id,
      code: node.code ?? '',
      name: node.name ?? '',
      category: node.category ?? 'RENT',
      description: node.description ?? '',
      revenueAccountId: String(node?.revenueAccount?.id ?? ''),
      revenueAccountLabel: revenueLabel,
      allocationAccountId: String(node?.allocationAccount?.id ?? ''),
      allocationAccountLabel: allocationLabel,
      isActive: Boolean(node.isActive),
      isDefault: Boolean(node.isDefault),
      requiresUnit: Boolean(node.requiresUnit),
      autoAllocate: Boolean(node.autoAllocate),
      prepayment: Boolean(node.prepayment),
      sortOrder: String(node.sortOrder ?? 0),
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      Alert.alert('Missing fields', 'Code and name are required.');
      return;
    }
    if (!form.revenueAccountId || !form.allocationAccountId) {
      Alert.alert('Missing fields', 'Select both revenue and allocation accounts.');
      return;
    }

    setSaving(true);
    try {
      const { data: result } = await saveServiceType({
        variables: {
          id: form.id,
          code: form.code.trim(),
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim() || null,
          revenueAccountId: form.revenueAccountId || null,
          allocationAccountId: form.allocationAccountId || null,
          isActive: form.isActive,
          isDefault: form.isDefault,
          requiresUnit: form.requiresUnit,
          autoAllocate: form.autoAllocate,
          prepayment: form.prepayment,
          sortOrder: Number.isNaN(parseInt(form.sortOrder, 10)) ? 0 : parseInt(form.sortOrder, 10),
        },
      });

      const payload = (result as any)?.createUpdateConfigPaymentType;
      if (payload?.success) {
        setFormOpen(false);
        await refetch();
      } else {
        Alert.alert('Failed', payload?.message ?? 'Could not save service type.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Could not save service type.');
    } finally {
      setSaving(false);
    }
  }

  function askDelete(id: string, name: string) {
    Alert.alert('Delete service type', `Delete ${name}? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: result } = await deleteServiceType({ variables: { id } });
            const payload = (result as any)?.deleteConfigPaymentType;
            if (payload?.success) {
              await refetch();
            } else {
              Alert.alert(
                'Delete blocked',
                payload?.message ?? 'This service type could not be deleted because it is still in use.',
              );
            }
          } catch (error: any) {
            Alert.alert(
              'Delete blocked',
              error?.message ?? 'This service type could not be deleted because it is still in use.',
            );
          }
        },
      },
    ]);
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Service Types" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Service Types" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Service Types"
        showBack
        rightElement={<TouchableOpacity onPress={startCreate}><Ionicons name="add" size={24} color={colors.primary} /></TouchableOpacity>}
      />

      {serviceTypes.length === 0 ? (
        <View style={styles.scroll}>
          <Input
            label="Search"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, code, or category"
          />
          <ErrorState title="No service types" message="Create the first service type to start charging services." onRetry={startCreate} />
        </View>
      ) : (
        <FlatList
          data={filteredServiceTypes}
          keyExtractor={(item: any) => String(item.id)}
          key={isTablet ? 'tablet-2col' : 'phone-1col'}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <Input
              label="Search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, code, or category"
            />
          }
          ListEmptyComponent={
            <ErrorState title="No matching service types" message="Try a different search term." onRetry={() => setSearch('')} />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.md }} /> : null}
          renderItem={({ item: node }: { item: any }) => (
            <View style={[styles.rowCard, isTablet && styles.rowCardTablet]}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{node.name}</Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => startEdit(node)}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => askDelete(node.id, node.name)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.rowMeta}>Code: {node.code} | Category: {node.category}</Text>
              <Text style={styles.rowMeta}>Status: {node.isActive ? 'Active' : 'Inactive'} | Sort: {node.sortOrder ?? 0}</Text>
              <Text style={styles.rowMeta}>
                Revenue: {node?.revenueAccount?.code ?? 'Not set'} | Allocation: {node?.allocationAccount?.code ?? 'Not set'}
              </Text>
              {node.description ? <Text style={styles.rowDescription}>{node.description}</Text> : null}
            </View>
          )}
        />
      )}

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{form.id ? 'Edit Service Type' : 'Create Service Type'}</Text>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Input label="Name" value={form.name} onChangeText={(v) => setForm((s) => ({ ...s, name: v }))} placeholder="e.g. Monthly Rent" />
            <Input label="Code" value={form.code} onChangeText={(v) => setForm((s) => ({ ...s, code: v.toUpperCase() }))} placeholder="e.g. RENT" />
            <Input label="Description" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} placeholder="Optional description" />
            <Input label="Sort Order" value={form.sortOrder} onChangeText={(v) => setForm((s) => ({ ...s, sortOrder: v }))} keyboardType="number-pad" />

            <Text style={styles.selectorLabel}>Category</Text>
            <View style={styles.selectorWrap}>
              {PAYMENT_CATEGORIES.map((category) => {
                const selected = form.category === category;
                return (
                  <TouchableOpacity key={category} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setForm((s) => ({ ...s, category }))}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.selectorLabel}>Linked Accounts</Text>
            <SearchableDropdown
              label="Revenue Account"
              value={form.revenueAccountId}
              displayValue={form.revenueAccountLabel}
              options={accountOptions}
              onSelect={(opt) =>
                setForm((s) => ({
                  ...s,
                  revenueAccountId: opt.id,
                  revenueAccountLabel: opt.label,
                }))
              }
              onSearch={setAccountSearch}
              onClear={() =>
                setForm((s) => ({
                  ...s,
                  revenueAccountId: '',
                  revenueAccountLabel: '',
                }))
              }
              loading={accountsLoading}
              placeholder="Search chart of accounts"
            />
            <SearchableDropdown
              label="Allocation Account"
              value={form.allocationAccountId}
              displayValue={form.allocationAccountLabel}
              options={accountOptions}
              onSelect={(opt) =>
                setForm((s) => ({
                  ...s,
                  allocationAccountId: opt.id,
                  allocationAccountLabel: opt.label,
                }))
              }
              onSearch={setAccountSearch}
              onClear={() =>
                setForm((s) => ({
                  ...s,
                  allocationAccountId: '',
                  allocationAccountLabel: '',
                }))
              }
              loading={accountsLoading}
              placeholder="Search chart of accounts"
            />

            <View style={styles.switchRow}><Text style={styles.switchText}>Active</Text><Switch value={form.isActive} onValueChange={(value) => setForm((s) => ({ ...s, isActive: value }))} /></View>
            <View style={styles.switchRow}><Text style={styles.switchText}>Default</Text><Switch value={form.isDefault} onValueChange={(value) => setForm((s) => ({ ...s, isDefault: value }))} /></View>
            <View style={styles.switchRow}><Text style={styles.switchText}>Requires Unit</Text><Switch value={form.requiresUnit} onValueChange={(value) => setForm((s) => ({ ...s, requiresUnit: value }))} /></View>
            <View style={styles.switchRow}><Text style={styles.switchText}>Auto Allocate</Text><Switch value={form.autoAllocate} onValueChange={(value) => setForm((s) => ({ ...s, autoAllocate: value }))} /></View>
            <View style={styles.switchRow}><Text style={styles.switchText}>Prepayment</Text><Switch value={form.prepayment} onValueChange={(value) => setForm((s) => ({ ...s, prepayment: value }))} /></View>

            <Button title={saving ? 'Saving...' : 'Save'} onPress={handleSave} loading={saving} />
            <Button title="Cancel" onPress={() => setFormOpen(false)} variant="ghost" />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    rowCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadow.sm,
    },
    rowCardTablet: {
      width: '48.5%',
    },
    columnWrapper: {
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowTitle: { fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold, color: c.text },
    rowActions: { flexDirection: 'row', gap: Spacing.xs },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBackground,
    },
    rowMeta: { marginTop: 4, fontSize: Typography.fontSizeSm, color: c.textSecondary },
    rowDescription: { marginTop: 6, fontSize: Typography.fontSizeSm, color: c.textMuted },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      maxHeight: '88%',
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.lg,
    },
    sheetTitle: {
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      color: c.text,
      marginBottom: Spacing.sm,
    },
    sheetContent: { paddingBottom: Spacing.xl },
    selectorLabel: {
      fontSize: Typography.fontSizeSm,
      color: c.text,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: Spacing.xs,
    },
    selectorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: c.surface,
    },
    chipSelected: { borderColor: c.primary, backgroundColor: c.overlay },
    chipText: { fontSize: Typography.fontSizeXs, color: c.textSecondary, fontWeight: Typography.fontWeightSemibold },
    chipTextSelected: { color: c.primary },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
      paddingVertical: 4,
    },
    switchText: { fontSize: Typography.fontSizeSm, color: c.text, fontWeight: Typography.fontWeightMedium },
  });
}
