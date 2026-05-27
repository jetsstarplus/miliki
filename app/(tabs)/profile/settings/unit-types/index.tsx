import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import {
    CREATE_UPDATE_UNIT_TYPE_MUTATION,
    DELETE_UNIT_TYPE_MUTATION,
} from '@/graphql/properties/mutations/settings';
import { UNIT_TYPES_SETTINGS_QUERY } from '@/graphql/properties/queries/settings';
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

type UnitTypeForm = {
  id?: string;
  code: string;
  name: string;
  description: string;
  defaultBedrooms: string;
  defaultBathrooms: string;
  defaultSquareFeet: string;
  category: string;
  isActive: boolean;
  sortOrder: string;
};

const PAGE_SIZE = 12;

const UNIT_CATEGORIES = ['RESIDENTIAL', 'COMMERCIAL', 'MIXED', 'INDUSTRIAL', 'OTHER'];

const EMPTY_FORM: UnitTypeForm = {
  code: '',
  name: '',
  description: '',
  defaultBedrooms: '0',
  defaultBathrooms: '0',
  defaultSquareFeet: '',
  category: 'RESIDENTIAL',
  isActive: true,
  sortOrder: '0',
};

export default function UnitTypesSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UnitTypeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, refetch, fetchMore } = useQuery(UNIT_TYPES_SETTINGS_QUERY, {
    variables: { first: PAGE_SIZE, after: null },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const [saveUnitType] = useMutation(CREATE_UPDATE_UNIT_TYPE_MUTATION);
  const [deleteUnitType] = useMutation(DELETE_UNIT_TYPE_MUTATION);

  const unitTypes = (data as any)?.unitTypes?.edges?.map((edge: any) => edge.node) ?? [];
  const pageInfo = (data as any)?.unitTypes?.pageInfo;

  const filteredUnitTypes = unitTypes.filter((node: any) => {
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
          if (!fetchMoreResult?.unitTypes) return previous;
          return {
            ...previous,
            unitTypes: {
              ...fetchMoreResult.unitTypes,
              edges: [
                ...(previous as any).unitTypes?.edges ?? [],
                ...(fetchMoreResult as any).unitTypes?.edges ?? [],
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
    setForm({
      id: node.id,
      code: node.code ?? '',
      name: node.name ?? '',
      description: node.description ?? '',
      defaultBedrooms: String(node.defaultBedrooms ?? 0),
      defaultBathrooms: String(node.defaultBathrooms ?? 0),
      defaultSquareFeet: node.defaultSquareFeet != null ? String(node.defaultSquareFeet) : '',
      category: node.category ?? 'RESIDENTIAL',
      isActive: Boolean(node.isActive),
      sortOrder: String(node.sortOrder ?? 0),
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      Alert.alert('Missing fields', 'Code and name are required.');
      return;
    }

    setSaving(true);
    try {
      const { data: result } = await saveUnitType({
        variables: {
          id: form.id,
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          defaultBedrooms: Number.isNaN(parseInt(form.defaultBedrooms, 10)) ? 0 : parseInt(form.defaultBedrooms, 10),
          defaultBathrooms: Number.isNaN(parseInt(form.defaultBathrooms, 10)) ? 0 : parseInt(form.defaultBathrooms, 10),
          defaultSquareFeet: form.defaultSquareFeet.trim() ? parseFloat(form.defaultSquareFeet) : null,
          category: form.category,
          isActive: form.isActive,
          sortOrder: Number.isNaN(parseInt(form.sortOrder, 10)) ? 0 : parseInt(form.sortOrder, 10),
        },
      });

      const payload = (result as any)?.createUpdateUnitType;
      if (payload?.success) {
        setFormOpen(false);
        await refetch();
      } else {
        Alert.alert('Failed', payload?.message ?? 'Could not save unit type.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Could not save unit type.');
    } finally {
      setSaving(false);
    }
  }

  function askDelete(id: string, name: string) {
    Alert.alert('Delete unit type', `Delete ${name}? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: result } = await deleteUnitType({ variables: { id } });
            const payload = (result as any)?.deleteUnitType;
            if (payload?.success) {
              await refetch();
            } else {
              Alert.alert(
                'Delete blocked',
                payload?.message ?? 'This unit type could not be deleted because it is still in use.',
              );
            }
          } catch (error: any) {
            Alert.alert(
              'Delete blocked',
              error?.message ?? 'This unit type could not be deleted because it is still in use.',
            );
          }
        },
      },
    ]);
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Unit Types" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Unit Types" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Unit Types"
        showBack
        rightElement={<TouchableOpacity onPress={startCreate}><Ionicons name="add" size={24} color={colors.primary} /></TouchableOpacity>}
      />

      {unitTypes.length === 0 ? (
        <View style={styles.scroll}>
          <Input
            label="Search"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, code, or category"
          />
          <ErrorState title="No unit types" message="Create a unit type to standardize your listings." onRetry={startCreate} retryLabel="Create Unit Type" />
        </View>
      ) : (
        <FlatList
          data={filteredUnitTypes}
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
            <ErrorState title="No matching unit types" message="Try a different search term." onRetry={() => setSearch('')} retryLabel="Clear Search" />
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
              <Text style={styles.rowMeta}>Beds: {node.defaultBedrooms} | Baths: {node.defaultBathrooms} | Sqft: {node.defaultSquareFeet ?? '-'}</Text>
              <Text style={styles.rowMeta}>Status: {node.isActive ? 'Active' : 'Inactive'} | Sort: {node.sortOrder ?? 0}</Text>
              {node.description ? <Text style={styles.rowDescription}>{node.description}</Text> : null}
            </View>
          )}
        />
      )}

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{form.id ? 'Edit Unit Type' : 'Create Unit Type'}</Text>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Input label="Name" value={form.name} onChangeText={(v) => setForm((s) => ({ ...s, name: v }))} placeholder="e.g. 2 Bedroom" />
            <Input label="Code" value={form.code} onChangeText={(v) => setForm((s) => ({ ...s, code: v.toUpperCase() }))} placeholder="e.g. A_2BR" />
            <Input label="Description" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} placeholder="Optional description" />
            <Input label="Default Bedrooms" value={form.defaultBedrooms} onChangeText={(v) => setForm((s) => ({ ...s, defaultBedrooms: v }))} keyboardType="number-pad" />
            <Input label="Default Bathrooms" value={form.defaultBathrooms} onChangeText={(v) => setForm((s) => ({ ...s, defaultBathrooms: v }))} keyboardType="number-pad" />
            <Input label="Default Square Feet" value={form.defaultSquareFeet} onChangeText={(v) => setForm((s) => ({ ...s, defaultSquareFeet: v }))} keyboardType="decimal-pad" />
            <Input label="Sort Order" value={form.sortOrder} onChangeText={(v) => setForm((s) => ({ ...s, sortOrder: v }))} keyboardType="number-pad" />

            <Text style={styles.selectorLabel}>Category</Text>
            <View style={styles.selectorWrap}>
              {UNIT_CATEGORIES.map((category) => {
                const selected = form.category === category;
                return (
                  <TouchableOpacity key={category} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setForm((s) => ({ ...s, category }))}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.switchRow}><Text style={styles.switchText}>Active</Text><Switch value={form.isActive} onValueChange={(value) => setForm((s) => ({ ...s, isActive: value }))} /></View>

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
