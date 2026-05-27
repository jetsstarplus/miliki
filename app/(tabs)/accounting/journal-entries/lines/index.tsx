import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { DELETE_JOURNAL_ENTRY, POST_JOURNAL_ENTRY, VOID_JOURNAL_ENTRY } from '@/graphql/properties/mutations/accounting';
import { JOURNAL_ENTRY_DETAIL_PAGE_DATA } from '@/graphql/properties/queries/accounting';
import { useMutation, useQuery } from '@apollo/client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

function firstArray(...values: any[]): any[] {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function textValue(...values: any[]): string {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '-';
}

function isDraft(status?: string | null) {
  return String(status ?? '').toUpperCase() === 'DRAFT';
}

function isPosted(status?: string | null) {
  return String(status ?? '').toUpperCase() === 'POSTED';
}

export default function JournalEntryLinesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    journalEntryId?: string;
    entryNumber?: string;
    status?: string;
    entryType?: string;
    description?: string;
    reference?: string;
    entryDate?: string;
  }>();

  const journalEntryId = String(params.journalEntryId ?? '').trim();
  const entryNumber = String(params.entryNumber ?? '').trim();
  const entryStatus = String(params.status ?? '').trim();
  const entryType = String(params.entryType ?? '').trim();
  const entryDescription = String(params.description ?? '').trim();
  const entryReference = String(params.reference ?? '').trim();
  const entryDate = String(params.entryDate ?? '').trim();

  const [refreshing, setRefreshing] = useState(false);
  const [serverError, setServerError] = useState('');

  const { data, loading, error, refetch } = useQuery(JOURNAL_ENTRY_DETAIL_PAGE_DATA, {
    variables: { journalEntryId },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || !journalEntryId,
  });

  const [postEntry] = useMutation(POST_JOURNAL_ENTRY);
  const [voidEntry] = useMutation(VOID_JOURNAL_ENTRY);
  const [deleteEntry] = useMutation(DELETE_JOURNAL_ENTRY);

  const payload = normalizeGenericScalarPayload((data as any)?.journalEntryDetailPageData ?? {});
  const entry = payload?.entry ?? payload?.journalEntry ?? payload;
  const lines = firstArray(
    entry?.lines,
    payload?.lines,
    payload?.items,
    payload?.entries,
    payload?.journalLines,
    extractArray(payload, ['data.lines', 'data.items', 'data.entries', 'data.journalLines'])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function runAction(action: 'post' | 'void' | 'delete') {
    if (!journalEntryId) return;
    setServerError('');
    try {
      if (action === 'post') {
        const res = await postEntry({ variables: { journalEntryId } });
        if (!res?.data?.postJournalEntry?.success) {
          setServerError(res?.data?.postJournalEntry?.message ?? 'Could not post journal entry.');
          return;
        }
      }

      if (action === 'void') {
        const res = await voidEntry({ variables: { journalEntryId } });
        if (!res?.data?.voidJournalEntry?.success) {
          setServerError(res?.data?.voidJournalEntry?.message ?? 'Could not void journal entry.');
          return;
        }
      }

      if (action === 'delete') {
        const res = await deleteEntry({ variables: { journalEntryId } });
        if (!res?.data?.deleteJournalEntry?.success) {
          setServerError(res?.data?.deleteJournalEntry?.message ?? 'Could not delete journal entry.');
          return;
        }
      }

      await refetch();
    } catch (e: any) {
      setServerError(e?.message ?? 'Action failed.');
    }
  }

  const status = textValue(entry?.status, entryStatus);
  const canPost = isDraft(status);
  const canDelete = isDraft(status);
  const canVoid = isPosted(status);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Journal Entry Lines" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Journal Entry Lines" showBack />
        <ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (!journalEntryId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Journal Entry Lines" showBack />
        <ErrorState title="Missing journal entry" message="Open an entry from the journal entries list." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Journal Entry Lines" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Journal Entry Lines" showBack />

      <View style={styles.page}>
        {error ? <ServerErrorBanner message={error.message} /> : null}
        {serverError ? <ServerErrorBanner message={serverError} /> : null}

        <View style={styles.headerCard}>
          <Text style={styles.title}>{entryNumber || textValue(entry?.entryNumber, 'Journal Entry')}</Text>
          <Text style={styles.meta}>Status: {status}</Text>
          <Text style={styles.meta}>Type: {textValue(entry?.entryType, entryType)}</Text>
          <Text style={styles.meta}>Date: {textValue(entry?.entryDate, entryDate)}</Text>
          <Text style={styles.meta}>Reference: {textValue(entry?.reference, entryReference)}</Text>
          <Text style={styles.description}>{textValue(entry?.description, entryDescription)}</Text>
        </View>

       
        <FlatList
          data={lines}
          style={{marginTop:4}}
          keyExtractor={(item: any, idx) => String(item?.id ?? `line-${idx}`)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<ErrorState title="No journal lines" message="This entry has no visible lines yet." />}
          renderItem={({ item }) => (
            <View style={styles.lineCard}>
              <View style={styles.lineRow}>
                <Text style={styles.lineAccount}>{textValue(item?.account?.code, item?.accountCode, item?.accountName, 'Account')}</Text>
                <Text style={styles.lineAmount}>{textValue(item?.amount, item?.debitAmount ?? item?.creditAmount, '0')}</Text>
              </View>
              <Text style={styles.meta}>Debit/Credit: {textValue(item?.debitCredit, item?.direction, '-')}</Text>
              <Text style={styles.meta}>Memo: {textValue(item?.memo, item?.description, '-')}</Text>
            </View>
          )}
        />
         <View style={styles.actionRow}>
          {canPost ? <Button title="Post" onPress={() => runAction('post')} /> : null}
          {canVoid ? <Button title="Void" variant="outline" onPress={() => runAction('void')} /> : null}
          {canDelete ? <Button title="Delete" variant="danger" onPress={() => runAction('delete')} /> : null}
          {/* <Button title="Refresh Detail" variant="ghost" onPress={refetch} /> */}
        </View>
      </View>

    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    page: { flex: 1, padding: Spacing.md },
    headerCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    title: { color: c.text, fontSize: Typography.fontSizeLg, fontWeight: Typography.fontWeightSemibold, marginBottom: 4 },
    description: { color: c.textSecondary, fontSize: Typography.fontSizeSm, marginTop: 6 },
    meta: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginTop: 2 },
    actionRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginVertical: Spacing.md },
    list: { paddingBottom: Spacing.xxl, gap: Spacing.sm },
    lineCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
    lineAccount: { color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold, flex: 1 },
    lineAmount: { color: c.primary, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightSemibold },
    inlineFooter: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    inlineFooterText: { color: c.textMuted, fontSize: Typography.fontSizeXs },
  });
}
