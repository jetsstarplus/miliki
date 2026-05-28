import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { ADD_JOURNAL_LINE, CREATE_JOURNAL_ENTRY, DELETE_JOURNAL_ENTRY, VOID_JOURNAL_ENTRY } from '@/graphql/properties/mutations/accounting';
import { JOURNAL_ENTRIES_PAGE_DATA } from '@/graphql/properties/queries/accounting';
import { useMutation, useQuery } from '@apollo/client';
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

type EntryForm = {
  entryNumber: string;
  entryDate: string;
  description: string;
  entryType: string;
  reference: string;
  lineAccountId: string;
  lineDebitCredit: string;
  lineAmount: string;
  lineMemo: string;
};

const EMPTY_FORM: EntryForm = {
  entryNumber: '',
  entryDate: '',
  description: '',
  entryType: 'MANUAL',
  reference: '',
  lineAccountId: '',
  lineDebitCredit: 'DEBIT',
  lineAmount: '',
  lineMemo: '',
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

function extractJournalEntries(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'object') return [];

  const candidates = [
    payload.entries,
    payload.items,
    payload.entriesList,
    payload.journalEntries,
    payload.journalEntryItems,
    payload.lines,
    payload.records,
    payload.results,
    payload.history,
    payload.transactions,
    payload.data?.entries,
    payload.data?.items,
    payload.data?.journalEntries,
    payload.data?.records,
    payload.data?.results,
    payload.data?.transactions,
    payload.data?.edges,
    payload.edges,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      if (candidate.length > 0 && candidate[0] && typeof candidate[0] === 'object' && 'node' in candidate[0]) {
        return candidate.map((edge: any) => edge?.node ?? edge).filter(Boolean);
      }
      return candidate;
    }
  }

  for (const key of Object.keys(payload)) {
    const value = (payload as any)[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const nested = extractJournalEntries(value);
      if (nested.length) return nested;
    }
  }

  return [];
}

const STATUS_OPTIONS = ['ALL', 'DRAFT', 'POSTED', 'VOID'];
const TYPE_OPTIONS = ['ALL', 'GENERAL', 'PAYMENT', 'RECEIPT', 'REFUND', 'ALLOCATION', 'ADJUSTMENT', 'TRANSFER', 'INVOICE'];

export default function JournalEntriesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [status, setStatus] = useState('');
  const [entryType, setEntryType] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [serverError, setServerError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);

  const { data, loading, error, refetch } = useQuery(JOURNAL_ENTRIES_PAGE_DATA, {
    variables: {
      companyId: activeCompany?.id,
      status: status || null,
      entryType: entryType || null,
    },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const [createEntry] = useMutation(CREATE_JOURNAL_ENTRY);
  const [addLine] = useMutation(ADD_JOURNAL_LINE);
  const [deleteEntry] = useMutation(DELETE_JOURNAL_ENTRY);
  const [voidEntry] = useMutation(VOID_JOURNAL_ENTRY);

  const payload = normalizeGenericScalarPayload((data as any)?.journalEntriesPageData ?? {});
  const items = extractJournalEntries(payload);

  const statusOptions = useMemo(() => {
    const fromItems = items
      .map((item: any) => String(item?.status ?? '').trim().toUpperCase())
      .filter(Boolean);
    return Array.from(new Set([...STATUS_OPTIONS, ...fromItems]));
  }, [items]);

  const typeOptions = useMemo(() => {
    const fromItems = items
      .map((item: any) => String(item?.entryType ?? '').trim().toUpperCase())
      .filter(Boolean);
    return Array.from(new Set([...TYPE_OPTIONS, ...fromItems]));
  }, [items]);

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

  async function saveEntry() {
    if (!activeCompany?.id) return;
    if (!form.entryNumber.trim() || !form.entryDate.trim() || !form.description.trim()) {
      setServerError('Entry number, date, and description are required.');
      return;
    }

    setSaving(true);
    setServerError('');
    try {
      const entryRes = await createEntry({
        variables: {
          companyId: activeCompany.id,
          entryNumber: form.entryNumber.trim(),
          entryDate: form.entryDate.trim(),
          description: form.description.trim(),
          entryType: form.entryType.trim() || null,
          reference: form.reference.trim() || null,
          status: 'DRAFT',
        },
      });

      const entryPayload = entryRes?.data?.createJournalEntry;
      const journalEntryId = String(entryPayload?.journalEntry?.id ?? '');
      if (!entryPayload?.success || !journalEntryId) {
        setServerError(entryPayload?.message ?? 'Could not create journal entry.');
        return;
      }

      if (form.lineAccountId.trim() && form.lineAmount.trim()) {
        const amount = Number(form.lineAmount);
        const lineRes = await addLine({
          variables: {
            journalEntryId,
            accountId: form.lineAccountId.trim(),
            debitCredit: form.lineDebitCredit.trim() || 'DEBIT',
            amount,
            memo: form.lineMemo.trim() || null,
            description: form.description.trim() || null,
          },
        });
        const linePayload = lineRes?.data?.addJournalLine;
        if (!linePayload?.success) {
          setServerError(linePayload?.message ?? 'Journal entry created, but line add failed.');
        }
      }

      setFormOpen(false);
      await refetch();
    } catch (e: any) {
      setServerError(e?.message ?? 'Could not save journal entry.');
    } finally {
      setSaving(false);
    }
  }

  async function runEntryAction(id: string, action: 'void' | 'delete') {
    if (!id) return;
    setServerError('');
    try {
      if (action === 'void') {
        const res = await voidEntry({ variables: { journalEntryId: id } });
        const payload = res?.data?.voidJournalEntry;
        if (!payload?.success) {
          setServerError(payload?.message ?? 'Could not void journal entry.');
          return;
        }
      }

      if (action === 'delete') {
        const res = await deleteEntry({ variables: { journalEntryId: id } });
        const payload = res?.data?.deleteJournalEntry;
        if (!payload?.success) {
          setServerError(payload?.message ?? 'Could not delete journal entry.');
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
        <AppHeader title="Journal Entries" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Journal Entries" showBack />
        <ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Journal Entries" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Journal Entries"
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

        <View style={[styles.filterGrid, isTablet && styles.filterGridTablet]}>
          <View style={styles.filterBlock}>
            <Text style={styles.filterLabel}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {statusOptions.map((value) => {
                const active = (status || 'ALL') === value;
                return (
                  <TouchableOpacity key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setStatus(value === 'ALL' ? '' : value)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.filterBlock}>
            <Text style={styles.filterLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {typeOptions.map((value) => {
                const active = (entryType || 'ALL') === value;
                return (
                  <TouchableOpacity key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setEntryType(value === 'ALL' ? '' : value)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item: any, idx) => String(item?.id ?? `je-${idx}`)}
          key={isTablet ? 'je-tablet-2col' : 'je-phone-1col'}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<ErrorState title="No journal entries" message="Create your first journal entry." onRetry={openCreate} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, isTablet && styles.cardTablet]}
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/accounting/journal-entries/lines',
                  params: {
                    journalEntryId: String(item?.id ?? ''),
                    entryNumber: String(item?.entryNumber ?? ''),
                    status: String(item?.status ?? ''),
                    entryType: String(item?.entryType ?? ''),
                    description: String(item?.description ?? ''),
                    reference: String(item?.reference ?? ''),
                    entryDate: String(item?.entryDate ?? item?.date ?? ''),
                  },
                } as any)
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item?.entryNumber ?? 'Journal Entry'}</Text>
              </View>
              <Text style={styles.meta}>Date: {item?.entryDate ?? item?.date ?? '-'}</Text>
              <Text style={styles.meta}>Type: {item?.entryType ?? '-'}</Text>
              <Text style={styles.meta}>Status: {item?.status ?? '-'}</Text>
              <Text style={styles.meta}>Description: {item?.description ?? '-'}</Text>

              <View style={styles.actionRow}>
                <Button title="Void" size="sm" variant="outline" onPress={() => runEntryAction(String(item?.id ?? ''), 'void')} />
                {String(item?.status ?? '').toUpperCase() === 'DRAFT' ? <Button title="Delete" size="sm" variant="danger" onPress={() => runEntryAction(String(item?.id ?? ''), 'delete')} /> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Create Journal Entry</Text>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Input label="Entry Number" value={form.entryNumber} onChangeText={(v) => setForm((s) => ({ ...s, entryNumber: v }))} />
            <Input label="Entry Date (YYYY-MM-DD)" value={form.entryDate} onChangeText={(v) => setForm((s) => ({ ...s, entryDate: v }))} />
            <Input label="Entry Type" value={form.entryType} onChangeText={(v) => setForm((s) => ({ ...s, entryType: v.toUpperCase() }))} />
            <Input label="Reference" value={form.reference} onChangeText={(v) => setForm((s) => ({ ...s, reference: v }))} />
            <Input label="Description" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} multiline />

            <Text style={styles.sectionTitle}>Optional First Line</Text>
            <Input label="Account ID" value={form.lineAccountId} onChangeText={(v) => setForm((s) => ({ ...s, lineAccountId: v }))} />
            <Input label="Debit/Credit" value={form.lineDebitCredit} onChangeText={(v) => setForm((s) => ({ ...s, lineDebitCredit: v.toUpperCase() }))} placeholder="DEBIT or CREDIT" />
            <Input label="Amount" value={form.lineAmount} onChangeText={(v) => setForm((s) => ({ ...s, lineAmount: v }))} keyboardType="decimal-pad" />
            <Input label="Line Memo" value={form.lineMemo} onChangeText={(v) => setForm((s) => ({ ...s, lineMemo: v }))} />

            <Button title={saving ? 'Saving...' : 'Save Entry'} onPress={saveEntry} loading={saving} />
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
    filterLabel: { color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, marginBottom: Spacing.xs },
    filterGrid: { gap: Spacing.sm },
    filterGridTablet: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    filterBlock: { flex: 1, minWidth: 0 },
    filterRow: { flexDirection: 'row', gap: Spacing.sm },
    chipRow: { gap: Spacing.xs, paddingBottom: Spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: Radius.full,
    },
    chipActive: { borderColor: c.primary, backgroundColor: `${c.primary}22` },
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
    sectionTitle: { color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, marginBottom: Spacing.xs },
    detailText: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginBottom: Spacing.md },
  });
}
