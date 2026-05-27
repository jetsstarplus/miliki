import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { CREATE_ACCOUNT, UPDATE_ACCOUNT } from '@/graphql/properties/mutations/accounting';
import { CHART_OF_ACCOUNTS_PAGE_DATA } from '@/graphql/properties/queries/accounting';
import { useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView as RNScrollView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AccountForm = {
  id?: string;
  code: string;
  name: string;
  accountType: string;
  description: string;
  parentId: string;
  cashAccount: boolean;
  isActive: boolean;
};

const EMPTY_FORM: AccountForm = {
  code: '',
  name: '',
  accountType: 'ASSET',
  description: '',
  parentId: '',
  cashAccount: false,
  isActive: true,
};

const FALLBACK_ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];

function normalizeGenericScalarPayload(value: any): any {
  if (!value) return {};
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  for (let i = 0; i < 3; i += 1) {
    if (!(parsed && typeof parsed === 'object' && 'data' in parsed)) break;
    const next = (parsed as any).data;
    if (typeof next === 'string') {
      try {
        parsed = JSON.parse(next);
      } catch {
        break;
      }
    } else if (next && typeof next === 'object') {
      parsed = next;
    } else {
      break;
    }
  }
  return parsed;
}

function toArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function extractAccountItems(payload: any): any[] {
  if (!payload || typeof payload !== 'object') return [];

  const direct = [
    payload?.items,
    payload?.accounts,
    payload?.list?.items,
    payload?.list,
    payload?.rows,
    payload?.results,
    payload?.records,
    payload?.data?.items,
    payload?.data?.accounts,
    payload?.data?.list?.items,
  ].find(Array.isArray);

  if (Array.isArray(direct)) return direct;

  for (const key of Object.keys(payload)) {
    const value = (payload as any)[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = extractAccountItems(value);
      if (nested.length) return nested;
    }
  }

  return [];
}

export default function ChartOfAccountsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverError, setServerError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);

  const { data, loading, error, refetch } = useQuery(CHART_OF_ACCOUNTS_PAGE_DATA, {
    variables: {
      companyId: activeCompany?.id,
      accountType: accountType || null,
      search: search || null,
      isActive: activeOnly ? true : null,
    },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const [createAccount] = useMutation(CREATE_ACCOUNT);
  const [updateAccount] = useMutation(UPDATE_ACCOUNT);

  const payload = normalizeGenericScalarPayload((data as any)?.chartOfAccountsPageData ?? {});
  const items = extractAccountItems(payload);

  const accountTypeOptions = useMemo(() => {
    const fromPayload = [
      ...toArray(payload?.accountTypes),
      ...toArray(payload?.accountTypeOptions),
      ...toArray(payload?.filters?.accountTypes),
      ...toArray(payload?.filterOptions?.accountTypes),
      ...toArray(payload?.meta?.accountTypes),
    ]
      .map((v) => String(v ?? '').trim().toUpperCase())
      .filter(Boolean);

    const fromItems = items
      .map((item: any) => String(item?.accountType ?? '').trim().toUpperCase())
      .filter(Boolean);

    const options = Array.from(new Set([...fromPayload, ...fromItems, ...FALLBACK_ACCOUNT_TYPES]));
    return options;
  }, [items, payload]);

  const accountTypeDropdownOptions = useMemo(
    () => accountTypeOptions.map((type) => ({ id: type, label: type })),
    [accountTypeOptions],
  );

  const parentAccountOptions = useMemo(() => {
    const currentId = String(form.id ?? '').trim();
    return items
      .filter((item: any) => String(item?.id ?? '').trim() && String(item?.id ?? '').trim() !== currentId)
      .map((item: any) => ({
        id: String(item?.id ?? ''),
        label: String(item?.name ?? item?.code ?? `Account ${String(item?.id ?? '')}`),
        sublabel: item?.code ? `Code: ${String(item.code)}` : undefined,
      }));
  }, [form.id, items]);

  const selectedParent = useMemo(
    () => parentAccountOptions.find((opt) => opt.id === form.parentId),
    [parentAccountOptions, form.parentId],
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function openCreate() {
    setServerError('');
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(item: any) {
    setServerError('');
    setForm({
      id: String(item?.id ?? ''),
      code: String(item?.code ?? ''),
      name: String(item?.name ?? ''),
      accountType: String(item?.accountType ?? 'ASSET'),
      description: String(item?.description ?? ''),
      parentId: String(item?.parent?.id ?? item?.parentId ?? ''),
      cashAccount: Boolean(item?.cashAccount),
      isActive: typeof item?.isActive === 'boolean' ? item.isActive : true,
    });
    setFormOpen(true);
  }

  async function saveAccount() {
    if (!activeCompany?.id) return;
    if (!form.code.trim() || !form.name.trim() || !form.accountType.trim()) {
      setServerError('Code, name, and account type are required.');
      return;
    }

    setSaving(true);
    setServerError('');
    try {
      if (form.id) {
        const res = await updateAccount({
          variables: {
            input: {
              id: form.id,
              companyId: activeCompany.id,
              code: form.code.trim(),
              name: form.name.trim(),
              accountType: form.accountType.trim(),
              description: form.description.trim() || null,
              parentId: form.parentId.trim() || null,
              cashAccount: form.cashAccount,
              isActive: form.isActive,
            },
          },
        });

        const success = Boolean(res?.data?.updateAccount?.success);
        if (!success) {
          setServerError('Could not update account.');
          return;
        }
      } else {
        const res = await createAccount({
          variables: {
            companyId: activeCompany.id,
            code: form.code.trim(),
            name: form.name.trim(),
            accountType: form.accountType.trim(),
            description: form.description.trim() || null,
            parentId: form.parentId.trim() || null,
            cashAccount: form.cashAccount,
            isActive: form.isActive,
          },
        });

        const payload = res?.data?.createAccount;
        if (!payload?.success) {
          setServerError(payload?.message ?? 'Could not create account.');
          return;
        }
      }

      setFormOpen(false);
      await refetch();
    } catch (e: any) {
      setServerError(e?.message ?? 'Could not save account.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Chart of Accounts" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Chart of Accounts" showBack />
        <ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Chart of Accounts" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Chart of Accounts"
        showBack
        rightElement={
          <TouchableOpacity onPress={openCreate}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        style={styles.page}
          data={items}
          keyExtractor={(item: any, idx) => String(item?.id ?? `acc-${idx}`)}
          key={isTablet ? 'accounts-tablet-2col' : 'accounts-phone-1col'}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
        contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<ErrorState title="No accounts found" message="Create your first chart account to begin." onRetry={openCreate} />}
        ListHeaderComponent={
          <View>
            {error ? <ServerErrorBanner message={error.message} /> : null}
            {serverError ? <ServerErrorBanner message={serverError} /> : null}

            <Input label="Search" value={search} onChangeText={setSearch} placeholder="Search by code, name, or type" />

            <Text style={styles.chipLabel}>Account Type</Text>
            <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !accountType && styles.chipActive]}
                onPress={() => setAccountType('')}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, !accountType && styles.chipTextActive]}>All</Text>
              </TouchableOpacity>
              {accountTypeOptions.map((type) => {
                const active = accountType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setAccountType(type)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </RNScrollView>

            <View style={styles.filterRow}>
              <View style={styles.activeSwitchWrap}>
                <Text style={styles.switchLabel}>Active Only</Text>
                <Switch value={activeOnly} onValueChange={setActiveOnly} />
              </View>
            </View>
          </View>
        }
          renderItem={({ item }) => (
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item?.name ?? 'Unnamed account'}</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/accounting/chart-of-accounts/account-entries',
                        params: {
                          accountId: String(item?.id ?? ''),
                          accountName: String(item?.name ?? ''),
                          accountCode: String(item?.code ?? ''),
                          accountType: String(item?.accountType ?? ''),
                        },
                      } as any)
                    }
                  >
                    <Ionicons name="eye-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.meta}>Code: {item?.code ?? '-'}</Text>
              <Text style={styles.meta}>Type: {item?.accountType ?? '-'}</Text>
              <Text style={styles.meta}>Parent: {item?.parent?.name ?? '-'}</Text>
              <Text style={styles.meta}>Status: {item?.isActive ? 'Active' : 'Inactive'}</Text>
              {item?.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            </View>
          )}
      />

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{form.id ? 'Edit Account' : 'Create Account'}</Text>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Input label="Code" value={form.code} onChangeText={(v) => setForm((s) => ({ ...s, code: v.toUpperCase() }))} />
            <Input label="Name" value={form.name} onChangeText={(v) => setForm((s) => ({ ...s, name: v }))} />
            <SearchableDropdown
              label="Account Type"
              value={form.accountType}
              displayValue={form.accountType || undefined}
              options={accountTypeDropdownOptions}
              onSelect={(opt) => setForm((s) => ({ ...s, accountType: opt.id }))}
              onClear={() => setForm((s) => ({ ...s, accountType: '' }))}
              placeholder="Select account type"
              searchable={false}
              clearable={false}
            />
            <SearchableDropdown
              label="Parent Account (optional)"
              value={form.parentId}
              displayValue={selectedParent?.label}
              options={parentAccountOptions}
              onSelect={(opt) => setForm((s) => ({ ...s, parentId: opt.id }))}
              onClear={() => setForm((s) => ({ ...s, parentId: '' }))}
              placeholder="Select parent account"
              searchable
            />
            <Input label="Description" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} multiline />

            <View style={styles.switchRow}><Text style={styles.switchLabel}>Cash Account</Text><Switch value={form.cashAccount} onValueChange={(v) => setForm((s) => ({ ...s, cashAccount: v }))} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Active</Text><Switch value={form.isActive} onValueChange={(v) => setForm((s) => ({ ...s, isActive: v }))} /></View>

            <Button title={saving ? 'Saving...' : 'Save Account'} onPress={saveAccount} loading={saving} />
            <View style={{ height: Spacing.sm }} />
            <Button title="Cancel" variant="ghost" onPress={() => setFormOpen(false)} />
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    page: { flex: 1, padding: Spacing.md },
    chipLabel: { color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, marginBottom: Spacing.xs },
    chipRow: { gap: Spacing.xs, paddingBottom: Spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: Radius.full,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}22`,
    },
    chipText: { color: c.textSecondary, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },
    chipTextActive: { color: c.primary },
    filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: Spacing.sm },
    activeSwitchWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
    list: { paddingBottom: Spacing.xxl, gap: Spacing.sm },
    columnWrap: { justifyContent: 'space-between' },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    cardTablet: { width: '48.5%' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
    cardTitle: { flex: 1, color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold },
    actionsRow: { flexDirection: 'row', gap: 6 },
    iconBtn: { width: 30, height: 30, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: c.inputBackground },
    meta: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginBottom: 2 },
    desc: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginTop: 6 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    switchLabel: { color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: { maxHeight: '85%', backgroundColor: c.surface, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.md },
    sheetTitle: { color: c.text, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, marginBottom: Spacing.sm },
    sheetContent: { paddingBottom: Spacing.xxl },
  });
}
