import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { APPROVE_TENANT_REFUND, CANCEL_TENANT_REFUND, COMPLETE_TENANT_REFUND, CREATE_TENANT_REFUND } from '@/graphql/properties/mutations/accounting';
import { TENANT_REFUND_DETAIL_PAGE_DATA, TENANT_REFUND_FORM_PAGE_DATA, TENANT_REFUNDS_PAGE_DATA } from '@/graphql/properties/queries/accounting';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RefundForm = {
  tenantId: string;
  refundType: string;
  refundNumber: string;
  refundDate: string;
  amount: string;
  buildingId: string;
  unitId: string;
  status: string;
  refundMethod: string;
  refundReference: string;
};

const EMPTY_FORM: RefundForm = {
  tenantId: '',
  refundType: 'OTHER',
  refundNumber: '',
  refundDate: '',
  amount: '',
  buildingId: '',
  unitId: '',
  status: 'PENDING',
  refundMethod: '',
  refundReference: '',
};

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

function extractArray(payload: any, keys: string[]): any[] {
  if (!payload || typeof payload !== 'object') return [];

  for (const key of keys) {
    const value = key.split('.').reduce((acc: any, part) => acc?.[part], payload);
    if (Array.isArray(value)) {
      if (value.length > 0 && value[0] && typeof value[0] === 'object' && 'node' in value[0]) {
        return value.map((edge: any) => edge?.node ?? edge).filter(Boolean);
      }
      return value;
    }
  }

  for (const key of Object.keys(payload)) {
    const value = (payload as any)[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = extractArray(value, keys);
      if (nested.length) return nested;
    }
  }

  return [];
}

function normalizeStatus(value: any): string {
  return String(value ?? '').trim().toUpperCase();
}

export default function TenantRefundsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [serverError, setServerError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RefundForm>(EMPTY_FORM);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('Refund Detail');
  const [detailPayload, setDetailPayload] = useState<any>(null);

  const { data, loading, error, refetch } = useQuery(TENANT_REFUNDS_PAGE_DATA, {
    variables: {
      companyId: activeCompany?.id,
      status: status || null,
      search: search || null,
    },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const [loadFormOptions, { data: formOptionsData }] = useLazyQuery(TENANT_REFUND_FORM_PAGE_DATA, {
    fetchPolicy: 'network-only',
  });

  const [loadDetail, { loading: loadingDetail }] = useLazyQuery(TENANT_REFUND_DETAIL_PAGE_DATA, {
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      const payload = normalizeGenericScalarPayload((result as any)?.tenantRefundDetailPageData ?? {});
      setDetailTitle(String(payload?.title ?? payload?.refund?.refundNumber ?? 'Refund Detail'));
      setDetailPayload(payload);
      setDetailOpen(true);
    },
  });

  const [createRefund] = useMutation(CREATE_TENANT_REFUND);
  const [approveRefund] = useMutation(APPROVE_TENANT_REFUND);
  const [completeRefund] = useMutation(COMPLETE_TENANT_REFUND);
  const [cancelRefund] = useMutation(CANCEL_TENANT_REFUND);

  const refundStatuses = ['ALL', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED'];

  const payload = normalizeGenericScalarPayload((data as any)?.tenantRefundsPageData ?? {});
  const items = extractArray(payload, ['items', 'refunds', 'list.items', 'data.items', 'data.refunds', 'records', 'entries', 'results']);

  const formPayload = normalizeGenericScalarPayload((formOptionsData as any)?.tenantRefundFormPageData ?? {});

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function openCreate() {
    if (!activeCompany?.id) return;
    setServerError('');
    setForm(EMPTY_FORM);
    setFormOpen(true);
    await loadFormOptions({ variables: { companyId: activeCompany.id } });
  }

  async function saveRefund() {
    if (!activeCompany?.id) return;
    if (!form.tenantId.trim() || !form.refundType.trim() || !form.refundNumber.trim() || !form.refundDate.trim() || !form.amount.trim()) {
      setServerError('Tenant, refund type, refund number, refund date, and amount are required.');
      return;
    }

    setSaving(true);
    setServerError('');
    try {
      const res = await createRefund({
        variables: {
          companyId: activeCompany.id,
          tenantId: Number(form.tenantId),
          refundType: form.refundType.trim(),
          refundNumber: form.refundNumber.trim(),
          refundDate: form.refundDate.trim(),
          amount: Number(form.amount),
          buildingId: form.buildingId.trim() ? Number(form.buildingId) : null,
          unitId: form.unitId.trim() ? Number(form.unitId) : null,
          status: form.status.trim() || null,
          refundMethod: form.refundMethod.trim() || null,
          refundReference: form.refundReference.trim() || null,
        },
      });

      const payload = res?.data?.createTenantRefund;
      if (!payload?.success) {
        setServerError(payload?.message ?? 'Could not create tenant refund.');
        return;
      }

      setFormOpen(false);
      await refetch();
    } catch (e: any) {
      setServerError(e?.message ?? 'Could not create tenant refund.');
    } finally {
      setSaving(false);
    }
  }

  async function runRefundAction(id: string, action: 'approve' | 'complete' | 'cancel') {
    if (!id) return;
    setServerError('');
    try {
      if (action === 'approve') {
        const res = await approveRefund({ variables: { refundId: id } });
        const payload = res?.data?.approveTenantRefund;
        if (!payload?.success) {
          setServerError(payload?.message ?? 'Could not approve refund.');
          return;
        }
      }

      if (action === 'complete') {
        const res = await completeRefund({ variables: { refundId: id } });
        const payload = res?.data?.completeTenantRefund;
        if (!payload?.success) {
          setServerError(payload?.message ?? 'Could not complete refund.');
          return;
        }
      }

      if (action === 'cancel') {
        const res = await cancelRefund({ variables: { refundId: id } });
        const payload = res?.data?.cancelTenantRefund;
        if (!payload?.success) {
          setServerError(payload?.message ?? 'Could not cancel refund.');
          return;
        }
      }

      await refetch();
    } catch (e: any) {
      setServerError(e?.message ?? 'Action failed.');
    }
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Tenant Refunds" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Tenant Refunds" showBack />
        <ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Tenant Refunds" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Tenant Refunds"
        showBack
        rightElement={
          <TouchableOpacity onPress={openCreate}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.page}>
        {error ? <ServerErrorBanner message={error.message} /> : null}
        {serverError ? <ServerErrorBanner message={serverError} /> : null}

        <View style={styles.filterBlock}>
          <Text style={styles.chipLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {refundStatuses.map((value) => {
              const active = (value === 'ALL' ? '' : value) === status;
              return (
                <TouchableOpacity key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setStatus(value === 'ALL' ? '' : value)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Input label="Search" value={search} onChangeText={setSearch} placeholder="name, number, reference" />
        </View>

        <FlatList
          data={items}
          keyExtractor={(item: any, idx) => String(item?.id ?? `refund-${idx}`)}
          key={isTablet ? 'refunds-tablet-2col' : 'refunds-phone-1col'}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<ErrorState title="No refunds found" message="Create your first tenant refund." onRetry={openCreate} />}
          renderItem={({ item }) => (
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              {(() => {
                const currentStatus = normalizeStatus(item?.status);
                const canApprove = currentStatus === 'PENDING';
                const canComplete = currentStatus === 'APPROVED';
                const canCancel = currentStatus === 'PENDING' || currentStatus === 'APPROVED';

                return (
                  <>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item?.refundNumber ?? 'Refund'}</Text>
                <TouchableOpacity style={styles.iconBtn} onPress={() => loadDetail({ variables: { refundId: item?.id } })}>
                  <Ionicons name="eye-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.meta}>Tenant: {item?.tenantName ?? item?.tenant?.fullName ?? '-'}</Text>
              <Text style={styles.meta}>Amount: {item?.amount ?? '-'}</Text>
              <Text style={styles.meta}>Status: {item?.status ?? '-'}</Text>
              <Text style={styles.meta}>Date: {item?.refundDate ?? item?.date ?? '-'}</Text>

              {canApprove || canComplete || canCancel ? (
                <View style={styles.actionRow}>
                  {canApprove ? <Button title="Approve" size="sm" onPress={() => runRefundAction(String(item?.id ?? ''), 'approve')} /> : null}
                  {canComplete ? <Button title="Complete" size="sm" variant="outline" onPress={() => runRefundAction(String(item?.id ?? ''), 'complete')} /> : null}
                  {canCancel ? <Button title="Cancel" size="sm" variant="danger" onPress={() => runRefundAction(String(item?.id ?? ''), 'cancel')} /> : null}
                </View>
              ) : null}
                  </>
                );
              })()}
            </View>
          )}
        />
      </View>

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Create Tenant Refund</Text>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Input label="Tenant ID" value={form.tenantId} onChangeText={(v) => setForm((s) => ({ ...s, tenantId: v }))} hint={String(formPayload?.hints?.tenantId ?? '')} />
            <Input label="Refund Type" value={form.refundType} onChangeText={(v) => setForm((s) => ({ ...s, refundType: v.toUpperCase() }))} />
            <Input label="Refund Number" value={form.refundNumber} onChangeText={(v) => setForm((s) => ({ ...s, refundNumber: v }))} />
            <Input label="Refund Date (YYYY-MM-DD)" value={form.refundDate} onChangeText={(v) => setForm((s) => ({ ...s, refundDate: v }))} />
            <Input label="Amount" value={form.amount} onChangeText={(v) => setForm((s) => ({ ...s, amount: v }))} keyboardType="decimal-pad" />
            <Input label="Building ID (optional)" value={form.buildingId} onChangeText={(v) => setForm((s) => ({ ...s, buildingId: v }))} />
            <Input label="Unit ID (optional)" value={form.unitId} onChangeText={(v) => setForm((s) => ({ ...s, unitId: v }))} />
            <Input label="Status" value={form.status} onChangeText={(v) => setForm((s) => ({ ...s, status: v.toUpperCase() }))} />
            <Input label="Refund Method" value={form.refundMethod} onChangeText={(v) => setForm((s) => ({ ...s, refundMethod: v }))} />
            <Input label="Refund Reference" value={form.refundReference} onChangeText={(v) => setForm((s) => ({ ...s, refundReference: v }))} />

            <Button title={saving ? 'Saving...' : 'Create Refund'} onPress={saveRefund} loading={saving} />
            <View style={{ height: Spacing.sm }} />
            <Button title="Cancel" variant="ghost" onPress={() => setFormOpen(false)} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={detailOpen} animationType="slide" transparent onRequestClose={() => setDetailOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDetailOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{detailTitle}</Text>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {loadingDetail ? <LoadingState /> : null}
            {detailPayload ? (
              <View style={styles.detailCard}>
                <Text selectable style={styles.detailText}>{JSON.stringify(detailPayload, null, 2)}</Text>
              </View>
            ) : (
              <Text style={styles.meta}>No detail loaded.</Text>
            )}
            <Button title="Close" variant="ghost" onPress={() => setDetailOpen(false)} />
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
    filterBlock: { gap: Spacing.sm, marginBottom: Spacing.sm },
    chipLabel: { color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium },
    chipRow: { gap: Spacing.xs, paddingBottom: Spacing.xs },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
    },
    chipActive: { borderColor: c.primary, backgroundColor: `${c.primary}18` },
    chipText: { color: c.textSecondary, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },
    chipTextActive: { color: c.primary },
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
    iconBtn: { width: 30, height: 30, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: c.inputBackground },
    meta: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginBottom: 2 },
    actionRow: { marginTop: Spacing.sm, flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: { maxHeight: '85%', backgroundColor: c.surface, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.md },
    sheetTitle: { color: c.text, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, marginBottom: Spacing.sm },
    sheetContent: { paddingBottom: Spacing.xxl },
    detailCard: {
      backgroundColor: c.inputBackground,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.sm,
      marginBottom: Spacing.md,
      ...Shadow.sm,
    },
    detailText: { color: c.textSecondary, fontSize: Typography.fontSizeXs, lineHeight: 18, fontFamily: 'monospace' },
  });
}
