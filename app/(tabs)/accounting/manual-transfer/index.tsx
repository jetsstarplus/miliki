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
import { CREATE_MANUAL_TRANSFER } from '@/graphql/properties/mutations/accounting';
import { MANUAL_TRANSFER_FORM_DATA } from '@/graphql/properties/queries/accounting';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AccountOption = {
  id: string;
  label: string;
  sublabel?: string;
};

type TransferResult = {
  message: string;
  entryNumber: string;
  status: string;
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

function toAccountOption(item: any): AccountOption | null {
  if (!item || typeof item !== 'object') return null;
  const id = String(item?.id ?? item?.accountId ?? item?.value ?? item?.rawId ?? '').trim();
  if (!id) return null;

  const code = String(item?.code ?? item?.accountCode ?? '').trim();
  const name = String(item?.name ?? item?.label ?? item?.accountName ?? '').trim();
  const label =
    (code && name && `${code} - ${name}`) ||
    name ||
    code ||
    String(item?.title ?? item?.text ?? `Account ${id}`);

  return {
    id,
    label,
    sublabel: code && name ? `Code: ${code}` : undefined,
  };
}

function extractAccountOptions(payload: any): AccountOption[] {
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload?.fromAccounts,
    payload?.toAccounts,
    payload?.accounts,
    payload?.accountOptions,
    payload?.fromAccountOptions,
    payload?.toAccountOptions,
    payload?.data?.accounts,
    payload?.data?.accountOptions,
    payload?.filters?.accounts,
  ];

  const mapped = candidates
    .filter(Array.isArray)
    .flatMap((arr: any[]) => arr.map(toAccountOption).filter(Boolean) as AccountOption[]);

  const seen = new Set<string>();
  const unique = mapped.filter((opt) => {
    if (seen.has(opt.id)) return false;
    seen.add(opt.id);
    return true;
  });

  if (unique.length) return unique;

  const recursive: AccountOption[] = [];
  function walk(value: any, keyHint = '') {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      if (keyHint.toLowerCase().includes('account')) {
        for (const item of value) {
          const opt = toAccountOption(item);
          if (opt && !seen.has(opt.id)) {
            seen.add(opt.id);
            recursive.push(opt);
          }
        }
      }
      return;
    }

    for (const key of Object.keys(value)) {
      walk((value as any)[key], key);
    }
  }

  walk(payload);
  return recursive;
}

export default function ManualTransferScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [autoPost, setAutoPost] = useState(true);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState<TransferResult | null>(null);

  const { data, loading, error, refetch } = useQuery(MANUAL_TRANSFER_FORM_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
    onCompleted: (result) => {
      const payload = normalizeGenericScalarPayload((result as any)?.manualTransferFormData ?? {});
      const initialAutoPost = payload?.defaults?.autoPost;
      if (typeof initialAutoPost === 'boolean') {
        setAutoPost(initialAutoPost);
      }
    },
  });

  const [createManualTransfer, { loading: saving }] = useMutation(CREATE_MANUAL_TRANSFER);

  const payload = normalizeGenericScalarPayload((data as any)?.manualTransferFormData ?? {});
  const accountOptions = useMemo(() => extractAccountOptions(payload), [payload]);
  const fromAccountOptions = useMemo(
    () => accountOptions.filter((item) => item.id !== toAccountId),
    [accountOptions, toAccountId],
  );
  const toAccountOptions = useMemo(
    () => accountOptions.filter((item) => item.id !== fromAccountId),
    [accountOptions, fromAccountId],
  );
  const selectedFrom = accountOptions.find((item) => item.id === fromAccountId);
  const selectedTo = accountOptions.find((item) => item.id === toAccountId);

  function resetForm() {
    setFromAccountId('');
    setToAccountId('');
    setAmount('');
    setDescription('');
    setReference('');
  }

  async function submitTransfer() {
    setServerError('');
    setSuccess(null);

    const amountValue = Number(amount);
    if (!fromAccountId || !toAccountId || !description.trim()) {
      setServerError('From account, to account, amount, and description are required.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setServerError('From account and to account must be different.');
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setServerError('Amount must be a valid number greater than zero.');
      return;
    }

    try {
      const res = await createManualTransfer({
        variables: {
          companyId: activeCompany?.id,
          fromAccountId,
          toAccountId,
          amount: amountValue,
          description: description.trim(),
          reference: reference.trim() || null,
          autoPost,
        },
      });

      const result = res?.data?.createManualTransfer;
      if (!result?.success) {
        setServerError(result?.message ?? 'Could not create manual transfer.');
        return;
      }

      setSuccess({
        message: result?.message ?? 'Manual transfer created successfully.',
        entryNumber: String(result?.journalEntry?.entryNumber ?? ''),
        status: String(result?.journalEntry?.status ?? ''),
      });

      resetForm();
      await refetch();
    } catch (e: any) {
      setServerError(e?.message ?? 'Could not create manual transfer.');
    }
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Manual Transfer" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Manual Transfer" showBack />
        <ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Manual Transfer" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Manual Transfer" showBack />

      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {error ? <ServerErrorBanner message={error.message} /> : null}
        {serverError ? <ServerErrorBanner message={serverError} /> : null}

        {success ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Transfer Created</Text>
            <Text style={styles.successText}>{success.message}</Text>
            {success.entryNumber ? <Text style={styles.successMeta}>Entry Number: {success.entryNumber}</Text> : null}
            {success.status ? <Text style={styles.successMeta}>Status: {success.status}</Text> : null}
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>New Manual Transfer</Text>
          <Text style={styles.cardHint}>Move funds between two accounts and optionally auto-post the journal entry.</Text>

          <SearchableDropdown
            label="From Account"
            value={fromAccountId}
            displayValue={selectedFrom?.label}
            options={fromAccountOptions}
            onSelect={(opt) => {
              setFromAccountId(opt.id);
              if (opt.id === toAccountId) {
                setToAccountId('');
              }
            }}
            onClear={() => setFromAccountId('')}
            placeholder="Select source account"
            searchable
            clearable
          />

          <SearchableDropdown
            label="To Account"
            value={toAccountId}
            displayValue={selectedTo?.label}
            options={toAccountOptions}
            onSelect={(opt) => {
              setToAccountId(opt.id);
              if (opt.id === fromAccountId) {
                setFromAccountId('');
              }
            }}
            onClear={() => setToAccountId('')}
            placeholder="Select destination account"
            searchable
            clearable
          />

          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            hint={String(payload?.hints?.amount ?? '')}
          />

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Reason for this transfer"
            multiline
          />

          <Input
            label="Reference (optional)"
            value={reference}
            onChangeText={setReference}
            placeholder="Reference number or memo"
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Auto Post</Text>
              <Text style={styles.switchHint}>Automatically post the generated journal entry</Text>
            </View>
            <Switch value={autoPost} onValueChange={setAutoPost} />
          </View>

          <Button
            title={saving ? 'Submitting...' : 'Create Transfer'}
            onPress={submitTransfer}
            loading={saving}
            disabled={saving || accountOptions.length === 0}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.background,
    },
    page: {
      padding: Spacing.md,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
    formCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    cardTitle: {
      color: c.text,
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    cardHint: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeSm,
      marginBottom: Spacing.md,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    switchLabel: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
    switchHint: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginTop: 2,
    },
    successCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.success,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    successTitle: {
      color: c.success,
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    successText: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
    },
    successMeta: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginTop: 4,
    },
  });
}
