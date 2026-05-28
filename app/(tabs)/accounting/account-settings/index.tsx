import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import {
    CLOSE_ACCOUNTING_PERIOD,
    CREATE_ACCOUNTING_PERIOD,
    GENERATE_ACCOUNTING_PERIODS,
    UPDATE_ACCOUNTING_SETTINGS,
} from '@/graphql/properties/mutations/accounting';
import { ACCOUNTING_PERIODS_PAGE_DATA, ACCOUNTING_SETTINGS_PAGE_DATA } from '@/graphql/properties/queries/accounting';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SettingsPayload = {
  accountingMethod?: string;
  fiscalYearStartMonth?: number;
  fiscalYearStartDay?: number;
  periodFrequency?: string;
  accounting_method?: string;
  fiscal_year_start_month?: number;
  fiscal_year_start_day?: number;
  period_frequency?: string;
  defaults?: Record<string, any>;
  settings?: Record<string, any>;
  data?: Record<string, any>;
};

type FormState = {
  accountingMethod: string;
  fiscalYearStartMonth: string;
  fiscalYearStartDay: string;
  periodFrequency: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

type SaveResult = {
  success: boolean;
  message: string;
};

type PeriodState = {
  name: string;
  startDate: string;
  endDate: string;
  year: string;
};

type PeriodErrors = Partial<Record<keyof PeriodState, string>>;

type PeriodOption = DropdownOption & {
  meta?: Record<string, any>;
};

const ACCOUNTING_METHOD_OPTIONS: DropdownOption[] = [
  { id: 'cash', label: 'Cash Basis' },
  { id: 'accrual', label: 'Accrual Basis' },
  { id: 'modified_cash', label: 'Modified Cash Basis' },
];

const PERIOD_FREQUENCY_OPTIONS: DropdownOption[] = [
  { id: 'month', label: 'Monthly' },
  { id: 'quarter', label: 'Quarterly' },
  { id: 'year', label: 'Yearly' },
];

const MONTH_OPTIONS: DropdownOption[] = [
  { id: '1', label: 'January' },
  { id: '2', label: 'February' },
  { id: '3', label: 'March' },
  { id: '4', label: 'April' },
  { id: '5', label: 'May' },
  { id: '6', label: 'June' },
  { id: '7', label: 'July' },
  { id: '8', label: 'August' },
  { id: '9', label: 'September' },
  { id: '10', label: 'October' },
  { id: '11', label: 'November' },
  { id: '12', label: 'December' },
];

function normalizeGenericScalarPayload(value: any): SettingsPayload {
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

  return parsed as SettingsPayload;
}

function cleanValue(value?: string): string {
  return String(value ?? '').trim();
}

function toInt(value?: string): number | undefined {
  const text = cleanValue(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildInitialForm(payload: SettingsPayload): FormState {
  const settings = payload?.settings ?? payload?.defaults ?? payload?.data ?? payload;
  return {
    accountingMethod: String(settings?.accountingMethod ?? settings?.accounting_method ?? ''),
    fiscalYearStartMonth: String(settings?.fiscalYearStartMonth ?? settings?.fiscal_year_start_month ?? ''),
    fiscalYearStartDay: String(settings?.fiscalYearStartDay ?? settings?.fiscal_year_start_day ?? ''),
    periodFrequency: String(settings?.periodFrequency ?? settings?.period_frequency ?? ''),
  };
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!cleanValue(form.accountingMethod)) errors.accountingMethod = 'Select an accounting method';
  if (!cleanValue(form.periodFrequency)) errors.periodFrequency = 'Select a period frequency';

  const month = toInt(form.fiscalYearStartMonth);
  if (form.fiscalYearStartMonth && (month === undefined || month < 1 || month > 12)) {
    errors.fiscalYearStartMonth = 'Month must be between 1 and 12';
  }

  const day = toInt(form.fiscalYearStartDay);
  if (form.fiscalYearStartDay && (day === undefined || day < 1 || day > 31)) {
    errors.fiscalYearStartDay = 'Day must be between 1 and 31';
  }

  return errors;
}

function toLabel(value?: string, fallback = '-') {
  const text = cleanValue(value);
  return text || fallback;
}

function makePeriodLabel(month?: number, day?: number): string {
  if (!month && !day) return 'Not set';
  const monthLabel = month ? MONTH_OPTIONS.find((opt) => opt.id === String(month))?.label : undefined;
  const parts = [monthLabel, day ? `Day ${day}` : undefined].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Not set';
}

function normalizePeriodPayload(value: any): any {
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

function cleanPeriodValue(value?: string): string {
  return String(value ?? '').trim();
}

function toPeriodInt(value?: string): number | undefined {
  const text = cleanPeriodValue(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isPeriodDate(value?: string): boolean {
  const text = cleanPeriodValue(value);
  if (!text) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(text);
}

function extractPeriods(payload: any): PeriodOption[] {
  const candidates = [
    payload?.periods,
    payload?.items,
    payload?.rows,
    payload?.data?.periods,
    payload?.data?.items,
    payload?.data?.rows,
    payload?.results,
  ].find(Array.isArray) as any[] | undefined;

  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((item: any, idx: number) => {
      const id = cleanPeriodValue(item?.id ?? item?.periodId ?? item?.value ?? item?.rawId);
      if (!id) return null;
      const name = cleanPeriodValue(item?.name ?? item?.label ?? item?.periodName ?? `Period ${idx + 1}`);
      const start = cleanPeriodValue(item?.startDate ?? item?.start_date);
      const end = cleanPeriodValue(item?.endDate ?? item?.end_date);
      const label = name || (start && end ? `${start} - ${end}` : `Period ${idx + 1}`);
      return {
        id,
        label,
        sublabel: [start, end].filter(Boolean).join(' → ') || undefined,
        meta: item,
      };
    })
    .filter(Boolean) as PeriodOption[];
}

function validatePeriodForm(form: PeriodState): PeriodErrors {
  const errors: PeriodErrors = {};
  if (!cleanPeriodValue(form.name)) errors.name = 'Period name is required';
  if (!isPeriodDate(form.startDate)) errors.startDate = 'Use YYYY-MM-DD';
  if (!isPeriodDate(form.endDate)) errors.endDate = 'Use YYYY-MM-DD';
  const year = toPeriodInt(form.year);
  if (form.year && year === undefined) errors.year = 'Year must be a number';
  return errors;
}

export default function AccountingSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();

  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState<SaveResult | null>(null);
  const [draft, setDraft] = useState<FormState | null>(null);
  const [touched, setTouched] = useState(false);
  const [periodServerError, setPeriodServerError] = useState('');
  const [periodSuccess, setPeriodSuccess] = useState<SaveResult | null>(null);
  const [periodForm, setPeriodForm] = useState<PeriodState>({ name: '', startDate: '', endDate: '', year: '' });
  const [generateYear, setGenerateYear] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [periodTouched, setPeriodTouched] = useState(false);

  const { data, loading, error, refetch } = useQuery(ACCOUNTING_SETTINGS_PAGE_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const { data: periodsData, loading: periodsLoading, error: periodsError, refetch: refetchPeriods } = useQuery(ACCOUNTING_PERIODS_PAGE_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const [updateAccountingSettings, { loading: saving }] = useMutation(UPDATE_ACCOUNTING_SETTINGS);
  const [createAccountingPeriod, { loading: creatingPeriod }] = useMutation(CREATE_ACCOUNTING_PERIOD);
  const [generateAccountingPeriods, { loading: generatingPeriods }] = useMutation(GENERATE_ACCOUNTING_PERIODS);
  const [closeAccountingPeriod, { loading: closingPeriod }] = useMutation(CLOSE_ACCOUNTING_PERIOD);

  const payload = normalizeGenericScalarPayload((data as any)?.accountingSettingsPageData ?? {});
  const initialForm = useMemo(() => buildInitialForm(payload), [payload]);
  const form = draft ?? initialForm;
  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;

  const currentMethod = toLabel(payload?.accountingMethod ?? payload?.accounting_method ?? initialForm.accountingMethod);
  const currentMonth = Number(payload?.fiscalYearStartMonth ?? payload?.fiscal_year_start_month ?? initialForm.fiscalYearStartMonth ?? 0) || undefined;
  const currentDay = Number(payload?.fiscalYearStartDay ?? payload?.fiscal_year_start_day ?? initialForm.fiscalYearStartDay ?? 0) || undefined;
  const currentFrequency = toLabel(payload?.periodFrequency ?? payload?.period_frequency ?? initialForm.periodFrequency);

  const periodsPayload = normalizePeriodPayload((periodsData as any)?.accountingPeriodsPageData ?? {});
  const periodOptions = useMemo(() => extractPeriods(periodsPayload), [periodsPayload]);
  const periodErrors = useMemo(() => validatePeriodForm(periodForm), [periodForm]);
  const selectedPeriod = periodOptions.find((opt) => opt.id === selectedPeriodId);

  async function saveSettings() {
    setTouched(true);
    setServerError('');
    setSuccess(null);

    const validation = validateForm(form);
    if (Object.keys(validation).length) return;

    try {
      const result = await updateAccountingSettings({
        variables: {
          companyId: activeCompany?.id,
          accountingMethod: cleanValue(form.accountingMethod),
          fiscalYearStartMonth: toInt(form.fiscalYearStartMonth),
          fiscalYearStartDay: toInt(form.fiscalYearStartDay),
          periodFrequency: cleanValue(form.periodFrequency),
        },
      });

      const response = result?.data?.updateAccountingSettings;
      if (!response?.success) {
        setServerError(response?.message ?? 'Unable to save accounting settings.');
        return;
      }

      setSuccess({ success: true, message: response?.message ?? 'Accounting settings saved successfully.' });
      await refetch();
    } catch (e: any) {
      setServerError(e?.message ?? 'Unable to save accounting settings.');
    }
  }

  async function savePeriod() {
    setPeriodTouched(true);
    setPeriodServerError('');
    setPeriodSuccess(null);

    const validation = validatePeriodForm(periodForm);
    if (Object.keys(validation).length) return;

    try {
      const result = await createAccountingPeriod({
        variables: {
          companyId: activeCompany?.id,
          name: cleanPeriodValue(periodForm.name),
          startDate: cleanPeriodValue(periodForm.startDate),
          endDate: cleanPeriodValue(periodForm.endDate),
        },
      });

      const response = result?.data?.createAccountingPeriod;
      if (!response?.success) {
        setPeriodServerError(response?.message ?? 'Unable to create accounting period.');
        return;
      }

      setPeriodSuccess({ success: true, message: response?.message ?? 'Accounting period created successfully.' });
      setPeriodForm({ name: '', startDate: '', endDate: '', year: '' });
      await refetchPeriods();
    } catch (e: any) {
      setPeriodServerError(e?.message ?? 'Unable to create accounting period.');
    }
  }

  async function generatePeriods() {
    setPeriodServerError('');
    setPeriodSuccess(null);
    const year = toPeriodInt(generateYear);
    if (!year) {
      setPeriodServerError('Enter a valid year to generate accounting periods.');
      return;
    }

    try {
      const result = await generateAccountingPeriods({
        variables: { companyId: activeCompany?.id, year },
      });

      const response = result?.data?.generateAccountingPeriods;
      if (!response?.success) {
        setPeriodServerError(response?.message ?? 'Unable to generate accounting periods.');
        return;
      }

      setPeriodSuccess({ success: true, message: response?.message ?? 'Accounting periods generated successfully.' });
      await refetchPeriods();
    } catch (e: any) {
      setPeriodServerError(e?.message ?? 'Unable to generate accounting periods.');
    }
  }

  async function closePeriod() {
    setPeriodServerError('');
    setPeriodSuccess(null);
    if (!selectedPeriodId) {
      setPeriodServerError('Select a period to close.');
      return;
    }

    try {
      const result = await closeAccountingPeriod({
        variables: { periodId: selectedPeriodId },
      });

      const response = result?.data?.closeAccountingPeriod;
      if (!response?.success) {
        setPeriodServerError(response?.message ?? 'Unable to close accounting period.');
        return;
      }

      setPeriodSuccess({ success: true, message: response?.message ?? 'Accounting period closed successfully.' });
      await refetchPeriods();
    } catch (e: any) {
      setPeriodServerError(e?.message ?? 'Unable to close accounting period.');
    }
  }

  function resetForm() {
    setDraft(null);
    setTouched(false);
    setServerError('');
    setSuccess(null);
  }

  function resetPeriodForm() {
    setPeriodForm({ name: '', startDate: '', endDate: '', year: '' });
    setGenerateYear('');
    setSelectedPeriodId('');
    setPeriodTouched(false);
    setPeriodServerError('');
    setPeriodSuccess(null);
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Settings" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Settings" showBack />
        <ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Settings" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Accounting Settings" showBack />

      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {error ? <ServerErrorBanner message={error.message} /> : null}
        {serverError ? <ServerErrorBanner message={serverError} /> : null}

        {success ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Saved</Text>
            <Text style={styles.successText}>{success.message}</Text>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current Settings</Text>
          <Text style={styles.summaryText}>Accounting Method: {currentMethod}</Text>
          <Text style={styles.summaryText}>Fiscal Year Start: {makePeriodLabel(currentMonth, currentDay)}</Text>
          <Text style={styles.summaryText}>Period Frequency: {currentFrequency}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Edit Settings</Text>
          <Text style={styles.sectionHint}>Use the portal-style controls below to update accounting behavior for this company.</Text>

          <SearchableDropdown
            label="Accounting Method"
            value={form.accountingMethod}
            displayValue={ACCOUNTING_METHOD_OPTIONS.find((opt) => opt.id === form.accountingMethod)?.label}
            options={ACCOUNTING_METHOD_OPTIONS}
            onSelect={(option) => {
              setDraft((prev) => ({ ...(prev ?? initialForm), accountingMethod: option.id }));
              setTouched(true);
            }}
            onClear={() => setDraft((prev) => ({ ...(prev ?? initialForm), accountingMethod: '' }))}
            onSearch={() => {}}
            searchable={false}
            placeholder="Select accounting method"
            error={touched ? errors.accountingMethod : undefined}
          />

          <SearchableDropdown
            label="Period Frequency"
            value={form.periodFrequency}
            displayValue={PERIOD_FREQUENCY_OPTIONS.find((opt) => opt.id === form.periodFrequency)?.label}
            options={PERIOD_FREQUENCY_OPTIONS}
            onSelect={(option) => {
              setDraft((prev) => ({ ...(prev ?? initialForm), periodFrequency: option.id }));
              setTouched(true);
            }}
            onClear={() => setDraft((prev) => ({ ...(prev ?? initialForm), periodFrequency: '' }))}
            onSearch={() => {}}
            searchable={false}
            placeholder="Select period frequency"
            error={touched ? errors.periodFrequency : undefined}
          />

          <View style={styles.inlineRow}>
            <SearchableDropdown
              label="Fiscal Start Month"
              value={form.fiscalYearStartMonth}
              displayValue={MONTH_OPTIONS.find((opt) => opt.id === form.fiscalYearStartMonth)?.label}
              options={MONTH_OPTIONS}
              onSelect={(option) => {
                setDraft((prev) => ({ ...(prev ?? initialForm), fiscalYearStartMonth: option.id }));
                setTouched(true);
              }}
              onClear={() => setDraft((prev) => ({ ...(prev ?? initialForm), fiscalYearStartMonth: '' }))}
              onSearch={() => {}}
              searchable={false}
              placeholder="Month"
              containerStyle={styles.inlineField}
              error={touched ? errors.fiscalYearStartMonth : undefined}
            />

            <Input
              label="Fiscal Start Day"
              value={form.fiscalYearStartDay}
              onChangeText={(value) => {
                setDraft((prev) => ({ ...(prev ?? initialForm), fiscalYearStartDay: value.replace(/[^0-9]/g, '') }));
                setTouched(true);
              }}
              keyboardType="numeric"
              placeholder="1-31"
              containerStyle={styles.inlineField}
              error={touched ? errors.fiscalYearStartDay : undefined}
              hint="Day of month used to start the fiscal year"
            />
          </View>

          <View style={styles.actionRow}>
            <Button title="Save Settings" onPress={saveSettings} loading={saving} disabled={saving || hasErrors} fullWidth={false} style={styles.actionButton} />
            <Button title="Reset" variant="outline" onPress={resetForm} disabled={saving} fullWidth={false} style={styles.actionButton} />
          </View>

          {hasErrors ? <Text style={styles.validationNote}>Fix the highlighted fields before saving.</Text> : null}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Accounting Periods</Text>
          <Text style={styles.sectionHint}>Create periods, generate them for a year, or close an existing period.</Text>

          {periodsError ? <ServerErrorBanner message={periodsError.message} /> : null}
          {periodServerError ? <ServerErrorBanner message={periodServerError} /> : null}

          {periodSuccess ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Done</Text>
              <Text style={styles.successText}>{periodSuccess.message}</Text>
            </View>
          ) : null}

          <Text style={styles.subsectionTitle}>Existing Periods</Text>
          {periodsLoading && !periodsData ? (
            <LoadingState />
          ) : periodOptions.length ? (
            <View style={styles.periodList}>
              {periodOptions.map((period) => {
                const active = selectedPeriodId === period.id;
                return (
                  <TouchableOpacity key={period.id} style={[styles.periodCard, active && styles.periodCardActive]} onPress={() => setSelectedPeriodId(period.id)}>
                    <View style={styles.periodCardHeader}>
                      <Text style={styles.periodTitle}>{period.label}</Text>
                      {active ? <Text style={styles.periodSelected}>Selected</Text> : null}
                    </View>
                    {period.sublabel ? <Text style={styles.periodMeta}>{period.sublabel}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No accounting periods available.</Text>
          )}

          <View style={styles.splitSection}>
            <Text style={styles.subsectionTitle}>Create Period</Text>
            <Input label="Name" value={periodForm.name} onChangeText={(value) => { setPeriodForm((prev) => ({ ...prev, name: value })); setPeriodTouched(true); }} error={periodTouched ? periodErrors.name : undefined} placeholder="e.g. May 2026" />
            <DatePickerInput
              label="Start Date"
              value={periodForm.startDate}
              onChange={(value) => {
                setPeriodForm((prev) => ({ ...prev, startDate: value }));
                setPeriodTouched(true);
              }}
              error={periodTouched ? periodErrors.startDate : undefined}
              placeholder="Select start date"
            />
            <DatePickerInput
              label="End Date"
              value={periodForm.endDate}
              onChange={(value) => {
                setPeriodForm((prev) => ({ ...prev, endDate: value }));
                setPeriodTouched(true);
              }}
              error={periodTouched ? periodErrors.endDate : undefined}
              placeholder="Select end date"
            />
            <View style={styles.actionRow}>
              <Button title="Create Period" onPress={savePeriod} loading={creatingPeriod} disabled={creatingPeriod} fullWidth={false} style={styles.actionButton} />
              <Button title="Reset" variant="outline" onPress={resetPeriodForm} disabled={creatingPeriod} fullWidth={false} style={styles.actionButton} />
            </View>
          </View>

          <View style={styles.splitSection}>
            <Text style={styles.subsectionTitle}>Generate Periods</Text>
            <Input label="Year" value={generateYear} onChangeText={(value) => setGenerateYear(value.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="2026" />
            <View style={styles.actionRow}>
              <Button title="Generate" onPress={generatePeriods} loading={generatingPeriods} disabled={generatingPeriods} fullWidth={false} style={styles.actionButton} />
            </View>
          </View>

          <View style={styles.splitSection}>
            <Text style={styles.subsectionTitle}>Close Period</Text>
            <SearchableDropdown
              label="Selected Period"
              value={selectedPeriodId}
              displayValue={selectedPeriod?.label}
              options={periodOptions}
              onSelect={(option) => setSelectedPeriodId(option.id)}
              onClear={() => setSelectedPeriodId('')}
              onSearch={() => {}}
              loading={periodsLoading}
              searchable={false}
              placeholder="Select a period"
            />
            <View style={styles.actionRow}>
              <Button title="Close Period" onPress={closePeriod} loading={closingPeriod} disabled={closingPeriod || !selectedPeriodId} fullWidth={false} style={styles.actionButton} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    page: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
    summaryCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    summaryTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: Spacing.xs,
    },
    summaryText: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginBottom: 4,
    },
    formCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    sectionTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    sectionHint: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginBottom: Spacing.md,
    },
    inlineRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'flex-start',
    },
    inlineField: {
      flex: 1,
    },
    actionRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      flexWrap: 'wrap',
      marginTop: Spacing.xs,
    },
    actionButton: {
      minWidth: 140,
    },
    validationNote: {
      color: c.warning,
      fontSize: Typography.fontSizeXs,
      marginTop: Spacing.xs,
    },
    subsectionTitle: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    splitSection: {
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      paddingTop: Spacing.md,
      marginTop: Spacing.md,
    },
    periodList: {
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    periodCard: {
      backgroundColor: c.inputBackground,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      padding: Spacing.sm,
    },
    periodCardActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}12`,
    },
    periodCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    periodTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      flex: 1,
    },
    periodMeta: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginTop: 4,
    },
    periodSelected: {
      color: c.primary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    emptyText: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
      marginBottom: Spacing.sm,
    },
    successCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    successTitle: {
      color: c.primary,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    successText: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
    },
  });
}
