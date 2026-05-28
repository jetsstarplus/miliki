import { BalanceSheetReportView } from '@/components/accounting/reports/BalanceSheetReportView';
import { CashFlowReportView } from '@/components/accounting/reports/CashFlowReportView';
import { ComparativePerformanceReportView } from '@/components/accounting/reports/ComparativePerformanceReportView';
import { IncomeStatementReportView } from '@/components/accounting/reports/IncomeStatementReportView';
import { RetainedEarningsReportView } from '@/components/accounting/reports/RetainedEarningsReportView';
import { TrialBalanceReportView } from '@/components/accounting/reports/TrialBalanceReportView';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import {
    ACCOUNT_TREND_REPORT_DATA,
    ACCOUNTING_PERIODS_PAGE_DATA,
    BALANCE_SHEET_REPORT_DATA,
    CASH_FLOW_REPORT_DATA,
    CHART_OF_ACCOUNTS_PAGE_DATA,
    COMPARATIVE_PERFORMANCE_REPORT_DATA,
    INCOME_STATEMENT_REPORT_DATA,
    RETAINED_EARNINGS_REPORT_DATA,
    REVENUE_TREND_REPORT_DATA,
    TRIAL_BALANCE_REPORT_DATA,
} from '@/graphql/properties/queries/accounting';
import { BUILDINGS_DROPDOWN } from '@/graphql/properties/queries/building';
import { UNITS_DROPDOWN } from '@/graphql/properties/queries/units';
import { useQuery } from '@apollo/client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ReportKey =
  | 'trial-balance'
  | 'balance-sheet'
  | 'income-statement'
  | 'cash-flow'
  | 'retained-earnings'
  | 'comparative-performance'
  | 'revenue-trend'
  | 'account-trend';

type ReportConfig = {
  key: ReportKey;
  label: string;
};

type TrendSeries = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

type TrendData = {
  labels: string[];
  series: TrendSeries[];
  frequency: string;
  periods: number;
};

const REPORTS: ReportConfig[] = [
  { key: 'trial-balance', label: 'Trial Balance' },
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'income-statement', label: 'Income Statement' },
  { key: 'cash-flow', label: 'Cash Flow' },
  { key: 'retained-earnings', label: 'Retained Earnings' },
  { key: 'comparative-performance', label: 'Comparative Performance' },
  { key: 'revenue-trend', label: 'Revenue Trend' },
  { key: 'account-trend', label: 'Account Trend' },
];

const PERIOD_OPTIONS = [6, 12, 24, 36];
const FREQUENCY_OPTIONS = ['month', 'quarter', 'year'];

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

function asText(value: any, fallback = '-'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function compactAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

function numeric(value: any): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed) < 0.0001 ? 0 : parsed;
}

function parseFilters(filtersText?: string | string[]): any {
  const raw = Array.isArray(filtersText) ? filtersText[0] : filtersText;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

type FilterChip = {
  key: string;
  label: string;
  value: string;
};

type AdvancedFilterState = {
  startDate: string;
  endDate: string;
  asOfDate: string;
  periodId: string;
  buildingId: string;
  unitId: string;
  accountId: string;
  frequency: string;
  count: string;
  mode: string;
  anchorYear: string;
  anchorMonth: string;
  anchorQuarter: string;
  anchorHalf: string;
  years: string;
  trendFreq: string;
  trendPeriods: string;
  revenueAccounts: string;
  expenseAccounts: string;
};

type AdvancedFilterErrors = Partial<Record<keyof AdvancedFilterState, string>>;

type PresetKey = 'this-month' | 'last-month' | 'ytd' | 'last-12-months';

type PresetConfig = {
  key: PresetKey;
  label: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const COMPARATIVE_FREQUENCIES = ['year', 'quarter', 'half', 'month'];
const TREND_FREQUENCIES = ['day', 'week', 'month', 'quarter', 'year'];
const COMPARATIVE_MODES = ['balance_at', 'activity'];
const PRESET_OPTIONS: PresetConfig[] = [
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'ytd', label: 'YTD' },
  { key: 'last-12-months', label: 'Last 12 Months' },
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function applyDatePreset(state: AdvancedFilterState, preset: PresetKey): AdvancedFilterState {
  const today = new Date();
  let start = today;
  let end = today;

  if (preset === 'this-month') {
    start = startOfMonth(today);
    end = today;
  }
  if (preset === 'last-month') {
    const previousMonth = addMonths(today, -1);
    start = startOfMonth(previousMonth);
    end = endOfMonth(previousMonth);
  }
  if (preset === 'ytd') {
    start = new Date(today.getFullYear(), 0, 1);
    end = today;
  }
  if (preset === 'last-12-months') {
    start = startOfMonth(addMonths(today, -11));
    end = today;
  }

  return {
    ...state,
    startDate: formatDate(start),
    endDate: formatDate(end),
    asOfDate: formatDate(end),
    count: preset === 'last-12-months' ? '12' : state.count,
    trendPeriods: preset === 'last-12-months' ? '12' : state.trendPeriods,
  };
}

function isDateFormat(value?: string): boolean {
  const text = cleanValue(value);
  if (!text) return true;
  return DATE_PATTERN.test(text);
}

function getGenericScalarArray(payload: any, keys: string[]): any[] {
  for (const key of keys) {
    const value = payload?.[key] ?? payload?.data?.[key] ?? payload?.meta?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function mapUniqueOptions(items: any[], mapFn: (item: any, idx: number) => DropdownOption | null): DropdownOption[] {
  const seen = new Set<string>();
  const output: DropdownOption[] = [];
  items.forEach((item, idx) => {
    const option = mapFn(item, idx);
    if (!option || !option.id || seen.has(option.id)) return;
    seen.add(option.id);
    output.push(option);
  });
  return output;
}

function extractAccountOptions(payload: any): DropdownOption[] {
  const directItems = [
    payload?.items,
    payload?.accounts,
    payload?.rows,
    payload?.results,
    payload?.records,
    payload?.list?.items,
    payload?.data?.items,
    payload?.data?.accounts,
    payload?.data?.rows,
    payload?.data?.list?.items,
  ].find(Array.isArray);

  const recursiveItems: any[] = [];
  const visited = new Set<any>();

  function walk(value: any) {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      const hasAccountShape = value.some((item) =>
        item &&
        typeof item === 'object' &&
        (item.id || item.accountId || item.code || item.accountCode) &&
        (item.name || item.label || item.accountName),
      );
      if (hasAccountShape) recursiveItems.push(...value);
      return;
    }

    Object.values(value).forEach((entry) => walk(entry));
  }

  walk(payload);

  const items = (Array.isArray(directItems) && directItems.length ? directItems : recursiveItems) as any[];
  return mapUniqueOptions(items, (item, idx) => {
    const id = cleanValue(item?.id ?? item?.accountId ?? item?.value ?? item?.rawId);
    if (!id) return null;
    const code = cleanValue(item?.code ?? item?.accountCode);
    const name = cleanValue(item?.name ?? item?.label ?? item?.accountName);
    const label = (code && name && `${code} - ${name}`) || name || code || `Account ${idx + 1}`;
    return {
      id,
      label,
      sublabel: code ? `Code: ${code}` : undefined,
    };
  });
}

function extractPeriodOptions(payload: any): DropdownOption[] {
  const items = getGenericScalarArray(payload, ['periods', 'items', 'rows', 'records']);
  return mapUniqueOptions(items, (item, idx) => {
    const id = cleanValue(item?.id ?? item?.periodId ?? item?.value);
    if (!id) return null;
    const named = cleanValue(item?.name ?? item?.label ?? item?.periodLabel ?? item?.displayName);
    const start = cleanValue(item?.startDate);
    const end = cleanValue(item?.endDate);
    const label = named || (start && end ? `${start} - ${end}` : `Period ${idx + 1}`);
    return {
      id,
      label,
      sublabel: cleanValue(item?.status ?? item?.state) || undefined,
    };
  });
}

function buildAdvancedFilterErrors(draft: AdvancedFilterState, selectedReport: ReportKey): AdvancedFilterErrors {
  const errors: AdvancedFilterErrors = {};

  if (!isDateFormat(draft.startDate)) errors.startDate = 'Use YYYY-MM-DD';
  if (!isDateFormat(draft.endDate)) errors.endDate = 'Use YYYY-MM-DD';
  if (!isDateFormat(draft.asOfDate)) errors.asOfDate = 'Use YYYY-MM-DD';

  if (draft.count && toOptionalInt(draft.count) === undefined) errors.count = 'Must be a valid number';
  if (draft.anchorYear && toOptionalInt(draft.anchorYear) === undefined) errors.anchorYear = 'Must be a valid year';

  const anchorMonth = toOptionalInt(draft.anchorMonth);
  if (draft.anchorMonth && (anchorMonth === undefined || anchorMonth < 1 || anchorMonth > 12)) {
    errors.anchorMonth = 'Range is 1-12';
  }

  const anchorQuarter = toOptionalInt(draft.anchorQuarter);
  if (draft.anchorQuarter && (anchorQuarter === undefined || anchorQuarter < 1 || anchorQuarter > 4)) {
    errors.anchorQuarter = 'Range is 1-4';
  }

  const anchorHalf = toOptionalInt(draft.anchorHalf);
  if (draft.anchorHalf && (anchorHalf === undefined || anchorHalf < 1 || anchorHalf > 2)) {
    errors.anchorHalf = 'Range is 1-2';
  }

  if (draft.trendPeriods && toOptionalInt(draft.trendPeriods) === undefined) {
    errors.trendPeriods = 'Must be a valid number';
  }

  if (selectedReport === 'comparative-performance') {
    const frequency = cleanValue(draft.frequency)?.toLowerCase();
    if (frequency && !COMPARATIVE_FREQUENCIES.includes(frequency)) {
      errors.frequency = `Allowed: ${COMPARATIVE_FREQUENCIES.join(', ')}`;
    }
    const mode = cleanValue(draft.mode)?.toLowerCase();
    if (mode && !COMPARATIVE_MODES.includes(mode)) {
      errors.mode = `Allowed: ${COMPARATIVE_MODES.join(', ')}`;
    }
  }

  if (selectedReport === 'revenue-trend' || selectedReport === 'account-trend') {
    const trendFreq = cleanValue(draft.trendFreq)?.toLowerCase();
    if (trendFreq && !TREND_FREQUENCIES.includes(trendFreq)) {
      errors.trendFreq = `Allowed: ${TREND_FREQUENCIES.join(', ')}`;
    }
  }

  return errors;
}

function cleanValue(value?: string): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function toOptionalInt(value?: string): number | undefined {
  const text = cleanValue(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitCsv(value?: string): string[] | undefined {
  const text = cleanValue(value);
  if (!text) return undefined;
  const items = text.split(',').map((item) => item.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

function initAdvancedFilters(filters: any): AdvancedFilterState {
  const safe = filters && typeof filters === 'object' ? filters : {};
  return {
    startDate: String(safe.start_date ?? ''),
    endDate: String(safe.end_date ?? ''),
    asOfDate: String(safe.as_of_date ?? ''),
    periodId: String(safe.period_id ?? safe.periodId ?? ''),
    buildingId: String(safe.building_id ?? safe.buildingId ?? safe.building ?? ''),
    unitId: String(safe.unit_id ?? safe.unitId ?? safe.unit ?? ''),
    accountId: String(safe.account_id ?? safe.accountId ?? ''),
    frequency: String(safe.frequency ?? ''),
    count: String(safe.count ?? ''),
    mode: String(safe.mode ?? ''),
    anchorYear: String(safe.anchor_year ?? ''),
    anchorMonth: String(safe.anchor_month ?? ''),
    anchorQuarter: String(safe.anchor_quarter ?? ''),
    anchorHalf: String(safe.anchor_half ?? ''),
    years: String(safe.years ?? ''),
    trendFreq: String(safe.trend_freq ?? ''),
    trendPeriods: String(safe.trend_periods ?? ''),
    revenueAccounts: Array.isArray(safe.revenue_accounts) ? safe.revenue_accounts.join(',') : String(safe.revenue_accounts ?? ''),
    expenseAccounts: Array.isArray(safe.expense_accounts) ? safe.expense_accounts.join(',') : String(safe.expense_accounts ?? ''),
  };
}

function buildQueryFilters(
  routeFilters: any,
  advanced: AdvancedFilterState,
  selectedReport: ReportKey,
  frequency: string,
  periods: number,
): Record<string, any> {
  const base = routeFilters && typeof routeFilters === 'object' ? { ...routeFilters } : {};

  const common = {
    start_date: cleanValue(advanced.startDate),
    end_date: cleanValue(advanced.endDate),
    as_of_date: cleanValue(advanced.asOfDate),
    period_id: cleanValue(advanced.periodId),
    building_id: cleanValue(advanced.buildingId),
    unit_id: cleanValue(advanced.unitId),
    account_id: cleanValue(advanced.accountId),
  };

  Object.entries(common).forEach(([key, value]) => {
    if (value !== undefined) base[key] = value;
    else delete base[key];
  });

  if (selectedReport === 'comparative-performance') {
    base.frequency = cleanValue(advanced.frequency) ?? frequency;
    const count = toOptionalInt(advanced.count);
    base.count = count ?? periods;
    const mode = cleanValue(advanced.mode);
    if (mode) base.mode = mode;
    else delete base.mode;

    const anchorYear = toOptionalInt(advanced.anchorYear);
    const anchorMonth = toOptionalInt(advanced.anchorMonth);
    const anchorQuarter = toOptionalInt(advanced.anchorQuarter);
    const anchorHalf = toOptionalInt(advanced.anchorHalf);
    if (anchorYear !== undefined) base.anchor_year = anchorYear;
    else delete base.anchor_year;
    if (anchorMonth !== undefined) base.anchor_month = anchorMonth;
    else delete base.anchor_month;
    if (anchorQuarter !== undefined) base.anchor_quarter = anchorQuarter;
    else delete base.anchor_quarter;
    if (anchorHalf !== undefined) base.anchor_half = anchorHalf;
    else delete base.anchor_half;

    const years = cleanValue(advanced.years);
    if (years) base.years = years;
    else delete base.years;
  }

  if (selectedReport === 'revenue-trend' || selectedReport === 'account-trend') {
    base.trend_freq = cleanValue(advanced.trendFreq) ?? frequency;
    const trendPeriods = toOptionalInt(advanced.trendPeriods);
    base.trend_periods = trendPeriods ?? periods;
  }

  if (selectedReport === 'revenue-trend') {
    const revenueAccounts = splitCsv(advanced.revenueAccounts);
    const expenseAccounts = splitCsv(advanced.expenseAccounts);
    if (revenueAccounts) base.revenue_accounts = revenueAccounts;
    else delete base.revenue_accounts;
    if (expenseAccounts) base.expense_accounts = expenseAccounts;
    else delete base.expense_accounts;
  }

  return base;
}

function toFilterChipValue(value: any): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}:${String(v)}`)
      .join(', ');
  }
  return String(value ?? '');
}

function extractFilterChips(filters: any): FilterChip[] {
  if (!filters || typeof filters !== 'object') return [];

  return Object.entries(filters)
    .map(([key, value]) => {
      const text = toFilterChipValue(value).trim();
      if (!text) return null;
      return {
        key,
        label: key.replace(/_/g, ' '),
        value: text,
      } as FilterChip;
    })
    .filter((chip): chip is FilterChip => Boolean(chip));
}

function extractTrendData(payload: any, mode: 'revenue' | 'account'): TrendData {
  const report = payload?.report ?? payload?.data?.report ?? {};
  const labels = Array.isArray(report?.labels) ? report.labels.map((v: any) => String(v)) : [];

  const series: TrendSeries[] = [];
  if (Array.isArray(report?.values)) {
    series.push({
      key: 'values',
      label: mode === 'revenue' ? 'Revenue' : 'Net',
      color: '#2563EB',
      values: report.values.map((v: any) => numeric(v)),
    });
  }
  if (mode === 'revenue' && Array.isArray(report?.expense_values)) {
    series.push({
      key: 'expense_values',
      label: 'Expenses',
      color: '#DC2626',
      values: report.expense_values.map((v: any) => numeric(v)),
    });
  }
  if (mode === 'account' && Array.isArray(report?.debit_values)) {
    series.push({
      key: 'debit_values',
      label: 'Debit',
      color: '#059669',
      values: report.debit_values.map((v: any) => numeric(v)),
    });
  }
  if (mode === 'account' && Array.isArray(report?.credit_values)) {
    series.push({
      key: 'credit_values',
      label: 'Credit',
      color: '#EA580C',
      values: report.credit_values.map((v: any) => numeric(v)),
    });
  }

  return {
    labels,
    series,
    frequency: String(report?.frequency ?? 'month'),
    periods: Number(report?.periods ?? (labels.length || 12)),
  };
}

function tiny(label: string): string {
  if (label.length <= 7) return label;
  return label.slice(0, 3);
}

export default function AccountingReportsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ report?: string; filters?: string }>();

  const routeReport = (Array.isArray(params.report) ? params.report[0] : params.report) as ReportKey | undefined;
  const [selectedReport, setSelectedReport] = useState<ReportKey>(
    REPORTS.some((item) => item.key === routeReport) ? (routeReport as ReportKey) : 'trial-balance',
  );
  const [frequency, setFrequency] = useState('month');
  const [periods, setPeriods] = useState(12);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [buildingSearch, setBuildingSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [trendSeriesVisibility, setTrendSeriesVisibility] = useState<Record<string, boolean>>({
    values: true,
    expense_values: true,
    debit_values: true,
    credit_values: true,
  });
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);

  const filters = useMemo(() => parseFilters(params.filters), [params.filters]);
  const initialAdvanced = useMemo(() => initAdvancedFilters(filters), [filters]);
  const [advancedDraft, setAdvancedDraft] = useState<AdvancedFilterState>(initialAdvanced);
  const [advancedApplied, setAdvancedApplied] = useState<AdvancedFilterState>(initialAdvanced);
  const advancedErrors = useMemo(() => buildAdvancedFilterErrors(advancedDraft, selectedReport), [advancedDraft, selectedReport]);
  const hasAdvancedErrors = useMemo(() => Object.keys(advancedErrors).length > 0, [advancedErrors]);

  const queryFilters = useMemo(
    () => buildQueryFilters(filters, advancedApplied, selectedReport, frequency, periods),
    [filters, advancedApplied, selectedReport, frequency, periods],
  );
  const appliedFilterChips = useMemo(() => extractFilterChips(queryFilters), [queryFilters]);
  const variables = useMemo(() => ({ companyId: activeCompany?.id, filters: queryFilters }), [activeCompany?.id, queryFilters]);

  const accountOptionsQuery = useQuery(CHART_OF_ACCOUNTS_PAGE_DATA, {
    variables: {
      companyId: activeCompany?.id,
      search: accountSearch || null,
      isActive: true,
      accountType: null,
    },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const periodsOptionsQuery = useQuery(ACCOUNTING_PERIODS_PAGE_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const buildingsOptionsQuery = useQuery(BUILDINGS_DROPDOWN, {
    variables: {
      first: 120,
      search: buildingSearch || null,
    },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const unitsOptionsQuery = useQuery(UNITS_DROPDOWN, {
    variables: {
      first: 120,
      search: unitSearch || null,
      buildingId: cleanValue(advancedDraft.buildingId) ?? null,
    },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated,
  });

  const trialBalanceQuery = useQuery(TRIAL_BALANCE_REPORT_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || selectedReport !== 'trial-balance',
  });

  const balanceSheetQuery = useQuery(BALANCE_SHEET_REPORT_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || selectedReport !== 'balance-sheet',
  });

  const incomeStatementQuery = useQuery(INCOME_STATEMENT_REPORT_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || selectedReport !== 'income-statement',
  });

  const cashFlowQuery = useQuery(CASH_FLOW_REPORT_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || selectedReport !== 'cash-flow',
  });

  const retainedEarningsQuery = useQuery(RETAINED_EARNINGS_REPORT_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || selectedReport !== 'retained-earnings',
  });

  const comparativePerformanceQuery = useQuery(COMPARATIVE_PERFORMANCE_REPORT_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || selectedReport !== 'comparative-performance',
  });

  const revenueTrendQuery = useQuery(REVENUE_TREND_REPORT_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || selectedReport !== 'revenue-trend',
  });

  const accountTrendQuery = useQuery(ACCOUNT_TREND_REPORT_DATA, {
    variables,
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id || selectedReport !== 'account-trend',
  });

  const activeQuery =
    selectedReport === 'trial-balance' ? trialBalanceQuery
    : selectedReport === 'balance-sheet' ? balanceSheetQuery
    : selectedReport === 'income-statement' ? incomeStatementQuery
    : selectedReport === 'cash-flow' ? cashFlowQuery
    : selectedReport === 'retained-earnings' ? retainedEarningsQuery
    : selectedReport === 'comparative-performance' ? comparativePerformanceQuery
    : selectedReport === 'revenue-trend' ? revenueTrendQuery
    : accountTrendQuery;

  const rawReportData =
    selectedReport === 'trial-balance' ? (activeQuery.data as any)?.trialBalanceReportData
    : selectedReport === 'balance-sheet' ? (activeQuery.data as any)?.balanceSheetReportData
    : selectedReport === 'income-statement' ? (activeQuery.data as any)?.incomeStatementReportData
    : selectedReport === 'cash-flow' ? (activeQuery.data as any)?.cashFlowReportData
    : selectedReport === 'retained-earnings' ? (activeQuery.data as any)?.retainedEarningsReportData
    : selectedReport === 'comparative-performance' ? (activeQuery.data as any)?.comparativePerformanceReportData
    : selectedReport === 'revenue-trend' ? (activeQuery.data as any)?.revenueTrendReportData
    : (activeQuery.data as any)?.accountTrendReportData;

  const payload = normalizeGenericScalarPayload(rawReportData ?? {});
  const report = payload?.report ?? payload?.data?.report ?? {};
  const accountsPayload = normalizeGenericScalarPayload((accountOptionsQuery.data as any)?.chartOfAccountsPageData ?? {});
  const periodsPayload = normalizeGenericScalarPayload((periodsOptionsQuery.data as any)?.accountingPeriodsPageData ?? {});

  const accountOptions = useMemo(() => extractAccountOptions(accountsPayload), [accountsPayload]);
  const periodOptions = useMemo(() => extractPeriodOptions(periodsPayload), [periodsPayload]);
  const buildingOptions = useMemo(
    () =>
      mapUniqueOptions((buildingsOptionsQuery.data as any)?.buildings?.edges ?? [], (edge: any, idx) => {
        const node = edge?.node ?? {};
        const id = cleanValue(node?.id);
        if (!id) return null;
        const name = cleanValue(node?.name) ?? `Building ${idx + 1}`;
        const code = cleanValue(node?.code);
        return {
          id,
          label: code ? `${name} (${code})` : name,
          sublabel: code ? `Code: ${code}` : undefined,
        };
      }),
    [buildingsOptionsQuery.data],
  );
  const unitOptions = useMemo(
    () =>
      mapUniqueOptions((unitsOptionsQuery.data as any)?.units?.edges ?? [], (edge: any, idx) => {
        const node = edge?.node ?? {};
        const id = cleanValue(node?.id);
        if (!id) return null;
        const unitNumber = cleanValue(node?.unitNumber) ?? `Unit ${idx + 1}`;
        const buildingName = cleanValue(node?.building?.name);
        return {
          id,
          label: unitNumber,
          sublabel: buildingName ? `Building: ${buildingName}` : undefined,
        };
      }),
    [unitsOptionsQuery.data],
  );

  const selectedAccountOption = accountOptions.find((item) => item.id === advancedDraft.accountId);
  const selectedPeriodOption = periodOptions.find((item) => item.id === advancedDraft.periodId);
  const selectedBuildingOption = buildingOptions.find((item) => item.id === advancedDraft.buildingId);
  const selectedUnitOption = unitOptions.find((item) => item.id === advancedDraft.unitId);

  const trendData = useMemo(
    () => extractTrendData(payload, selectedReport === 'revenue-trend' ? 'revenue' : 'account'),
    [payload, selectedReport],
  );
  const activeTrendSeries = trendData.series.filter((series) => trendSeriesVisibility[series.key] !== false);
  const trendMax = Math.max(...activeTrendSeries.flatMap((s) => s.values.map((v) => Math.abs(v))), 0) || 1;
  const selectedTrendPoint = selectedTrendIndex == null
    ? Math.max(0, trendData.labels.length - 1)
    : Math.min(selectedTrendIndex, Math.max(0, trendData.labels.length - 1));

  async function onRefresh() {
    await activeQuery.refetch();
  }

  function handlePresetApply(preset: PresetKey) {
    const next = applyDatePreset(advancedDraft, preset);
    setSelectedPreset(preset);
    setAdvancedDraft(next);
    setAdvancedApplied(next);
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Reports" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Reports" showBack />
        <ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (activeQuery.loading && !activeQuery.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Accounting Reports" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Accounting Reports" showBack />

      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={activeQuery.loading} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {activeQuery.error ? <ServerErrorBanner message={activeQuery.error.message} /> : null}

        <Text style={styles.heading}>Report Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {REPORTS.map((item) => {
            const active = item.key === selectedReport;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedReport(item.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.filterRowCard}>
          <Text style={styles.filterLabel}>Frequency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FREQUENCY_OPTIONS.map((item) => {
              const active = frequency === item;
              return (
                <TouchableOpacity key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => setFrequency(item)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>Periods</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PERIOD_OPTIONS.map((item) => {
              const active = periods === item;
              return (
                <TouchableOpacity key={String(item)} style={[styles.chip, active && styles.chipActive]} onPress={() => setPeriods(item)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvanced((prev) => !prev)}>
            <Text style={styles.advancedToggleText}>{showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}</Text>
          </TouchableOpacity>

          {showAdvanced ? (
            <View style={styles.advancedWrap}>
              <Text style={styles.advancedGroupLabel}>Quick Presets</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                {PRESET_OPTIONS.map((preset) => {
                  const active = selectedPreset === preset.key;
                  return (
                    <TouchableOpacity
                      key={preset.key}
                      style={[styles.presetChip, active && styles.presetChipActive]}
                      onPress={() => handlePresetApply(preset.key)}
                    >
                      <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{preset.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.advancedGroupLabel}>Common Filters</Text>
              <Input
                label="Start Date (YYYY-MM-DD)"
                value={advancedDraft.startDate}
                onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, startDate: value }))}
                error={advancedErrors.startDate}
                hint={!advancedErrors.startDate ? 'Example: 2026-01-01' : undefined}
              />
              <Input
                label="End Date (YYYY-MM-DD)"
                value={advancedDraft.endDate}
                onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, endDate: value }))}
                error={advancedErrors.endDate}
                hint={!advancedErrors.endDate ? 'Example: 2026-05-29' : undefined}
              />
              <Input
                label="As Of Date (YYYY-MM-DD)"
                value={advancedDraft.asOfDate}
                onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, asOfDate: value }))}
                error={advancedErrors.asOfDate}
                hint={!advancedErrors.asOfDate ? 'Used by as-of reports like trial balance and balance sheet.' : undefined}
              />

              <SearchableDropdown
                label="Period"
                value={advancedDraft.periodId}
                displayValue={selectedPeriodOption?.label}
                options={periodOptions}
                onSelect={(option) => setAdvancedDraft((prev) => ({ ...prev, periodId: option.id }))}
                onClear={() => setAdvancedDraft((prev) => ({ ...prev, periodId: '' }))}
                onSearch={() => {}}
                loading={periodsOptionsQuery.loading}
                searchable={false}
                placeholder="Select period"
              />

              <SearchableDropdown
                label="Building"
                value={advancedDraft.buildingId}
                displayValue={selectedBuildingOption?.label}
                options={buildingOptions}
                onSelect={(option) =>
                  setAdvancedDraft((prev) => ({
                    ...prev,
                    buildingId: option.id,
                    unitId: '',
                  }))
                }
                onSearch={setBuildingSearch}
                onClear={() =>
                  setAdvancedDraft((prev) => ({
                    ...prev,
                    buildingId: '',
                    unitId: '',
                  }))
                }
                loading={buildingsOptionsQuery.loading}
                placeholder="Select building"
              />

              <SearchableDropdown
                label="Unit"
                value={advancedDraft.unitId}
                displayValue={selectedUnitOption?.label}
                options={unitOptions}
                onSelect={(option) => setAdvancedDraft((prev) => ({ ...prev, unitId: option.id }))}
                onSearch={setUnitSearch}
                onClear={() => setAdvancedDraft((prev) => ({ ...prev, unitId: '' }))}
                loading={unitsOptionsQuery.loading}
                placeholder={advancedDraft.buildingId ? 'Select unit' : 'Select building first (optional)'}
              />

              <SearchableDropdown
                label="Account"
                value={advancedDraft.accountId}
                displayValue={selectedAccountOption?.label}
                options={accountOptions}
                onSelect={(option) => setAdvancedDraft((prev) => ({ ...prev, accountId: option.id }))}
                onSearch={setAccountSearch}
                onClear={() => setAdvancedDraft((prev) => ({ ...prev, accountId: '' }))}
                loading={accountOptionsQuery.loading}
                placeholder="Select account"
              />

              {selectedReport === 'comparative-performance' ? (
                <>
                  <Text style={styles.advancedGroupLabel}>Comparative Performance</Text>
                  <Input label="Frequency (year, quarter, half, month)" value={advancedDraft.frequency} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, frequency: value }))} error={advancedErrors.frequency} />
                  <Input label="Count" value={advancedDraft.count} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, count: value }))} keyboardType="numeric" error={advancedErrors.count} />
                  <Input label="Mode (balance_at or activity)" value={advancedDraft.mode} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, mode: value }))} error={advancedErrors.mode} />
                  <Input label="Anchor Year" value={advancedDraft.anchorYear} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, anchorYear: value }))} keyboardType="numeric" error={advancedErrors.anchorYear} />
                  <Input label="Anchor Month" value={advancedDraft.anchorMonth} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, anchorMonth: value }))} keyboardType="numeric" error={advancedErrors.anchorMonth} />
                  <Input label="Anchor Quarter" value={advancedDraft.anchorQuarter} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, anchorQuarter: value }))} keyboardType="numeric" error={advancedErrors.anchorQuarter} />
                  <Input label="Anchor Half" value={advancedDraft.anchorHalf} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, anchorHalf: value }))} keyboardType="numeric" error={advancedErrors.anchorHalf} />
                  <Input label="Years CSV (e.g. 2026,2025,2024)" value={advancedDraft.years} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, years: value }))} />
                </>
              ) : null}

              {selectedReport === 'revenue-trend' || selectedReport === 'account-trend' ? (
                <>
                  <Text style={styles.advancedGroupLabel}>Trend Settings</Text>
                  <Input label="Trend Frequency (day, week, month, quarter, year)" value={advancedDraft.trendFreq} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, trendFreq: value }))} error={advancedErrors.trendFreq} />
                  <Input label="Trend Periods" value={advancedDraft.trendPeriods} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, trendPeriods: value }))} keyboardType="numeric" error={advancedErrors.trendPeriods} />
                </>
              ) : null}

              {selectedReport === 'revenue-trend' ? (
                <>
                  <Text style={styles.advancedGroupLabel}>Revenue Trend Accounts</Text>
                  <Input label="Revenue Accounts CSV" value={advancedDraft.revenueAccounts} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, revenueAccounts: value }))} />
                  <Input label="Expense Accounts CSV" value={advancedDraft.expenseAccounts} onChangeText={(value) => setAdvancedDraft((prev) => ({ ...prev, expenseAccounts: value }))} />
                </>
              ) : null}

              <View style={styles.advancedActions}>
                <Button
                  title="Apply Advanced"
                  size="sm"
                  fullWidth={false}
                  style={styles.advancedBtn}
                  disabled={hasAdvancedErrors}
                  onPress={() => setAdvancedApplied(advancedDraft)}
                />
                <Button
                  title="Reset"
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  style={styles.advancedBtn}
                  onPress={() => {
                    const reset = initAdvancedFilters(filters);
                    setAdvancedDraft(reset);
                    setAdvancedApplied(reset);
                  }}
                />
              </View>
              {hasAdvancedErrors ? <Text style={styles.validationNote}>Fix invalid fields before applying filters.</Text> : null}
            </View>
          ) : null}
        </View>

        {appliedFilterChips.length ? (
          <View style={styles.filterInfoCard}>
            <Text style={styles.filterInfoTitle}>Applied Filters</Text>
            <View style={styles.filterChipWrap}>
              {appliedFilterChips.map((chip) => (
                <View key={chip.key} style={styles.filterChip}>
                  <Text style={styles.filterChipKey}>{chip.label}</Text>
                  <Text style={styles.filterChipSep}>:</Text>
                  <Text style={styles.filterChipValue}>{chip.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{REPORTS.find((item) => item.key === selectedReport)?.label}</Text>
          {(selectedReport === 'revenue-trend' || selectedReport === 'account-trend') && trendData.labels.length ? (
            <>
              <View style={styles.legendWrap}>
                {trendData.series.map((series) => {
                  const active = trendSeriesVisibility[series.key] !== false;
                  return (
                    <TouchableOpacity
                      key={series.key}
                      style={[styles.legendChip, active && styles.legendChipActive]}
                      onPress={() => setTrendSeriesVisibility((prev) => ({ ...prev, [series.key]: !active }))}
                    >
                      <View style={[styles.legendDot, { backgroundColor: series.color, opacity: active ? 1 : 0.35 }]} />
                      <Text style={[styles.legendText, active ? undefined : styles.legendTextMuted]}>{series.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.chartAreaRow}>
                <View style={styles.yAxisWrap}>
                  <Text style={styles.yAxisText}>{compactAmount(trendMax)}</Text>
                  <Text style={styles.yAxisText}>{compactAmount(trendMax / 2)}</Text>
                  <Text style={styles.yAxisText}>0</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                  {trendData.labels.map((label, idx) => (
                    <TouchableOpacity key={`${label}-${idx}`} style={styles.chartPointCol} activeOpacity={0.85} onPress={() => setSelectedTrendIndex(idx)}>
                      <View style={[styles.chartBarsWrap, idx === selectedTrendPoint && styles.chartBarsWrapSelected]}>
                        {activeTrendSeries.map((series) => {
                          const value = series.values[idx] ?? 0;
                          const height = Math.max(3, (Math.abs(value) / trendMax) * 90);
                          return <View key={`${series.key}-${idx}`} style={[styles.chartBar, { height, backgroundColor: series.color, opacity: value < 0 ? 0.5 : 1 }]} />;
                        })}
                      </View>
                      <Text style={styles.chartLabel}>{tiny(label)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {trendData.labels.length ? (
                <View style={styles.tooltipCard}>
                  <Text style={styles.tooltipTitle}>{trendData.labels[selectedTrendPoint]}</Text>
                  {activeTrendSeries.map((series) => {
                    const val = series.values[selectedTrendPoint] ?? 0;
                    return (
                      <View key={`${series.key}-tip`} style={styles.tooltipRow}>
                        <View style={[styles.legendDot, { backgroundColor: series.color }]} />
                        <Text style={styles.tooltipLabel}>{series.label}</Text>
                        <Text style={styles.tooltipValue}>{asText(val)}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <Text style={styles.trendMeta}>frequency: {trendData.frequency} | periods: {trendData.periods}</Text>
            </>
          ) : null}
          {selectedReport === 'trial-balance' ? <TrialBalanceReportView report={report} /> : null}
          {selectedReport === 'balance-sheet' ? <BalanceSheetReportView report={report} /> : null}
          {selectedReport === 'income-statement' ? <IncomeStatementReportView report={report} /> : null}
          {selectedReport === 'cash-flow' ? <CashFlowReportView report={report} /> : null}
          {selectedReport === 'retained-earnings' ? <RetainedEarningsReportView report={report} /> : null}
          {selectedReport === 'comparative-performance' ? <ComparativePerformanceReportView report={report} /> : null}
          {selectedReport !== 'revenue-trend' &&
          selectedReport !== 'account-trend' &&
          selectedReport !== 'trial-balance' &&
          selectedReport !== 'balance-sheet' &&
          selectedReport !== 'income-statement' &&
          selectedReport !== 'cash-flow' &&
          selectedReport !== 'retained-earnings' &&
          selectedReport !== 'comparative-performance' ? (
            <Text style={styles.emptyText}>No report data available for this selection.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    page: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
    heading: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
    chipRow: {
      gap: Spacing.xs,
      paddingBottom: Spacing.xs,
    },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}22`,
    },
    chipText: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    chipTextActive: {
      color: c.primary,
    },
    filterInfoCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    filterRowCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    filterLabel: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 6,
    },
    advancedToggle: {
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      marginTop: Spacing.xs,
      marginBottom: Spacing.sm,
      alignSelf: 'flex-start',
    },
    advancedToggleText: {
      color: c.primary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    advancedWrap: {
      marginTop: Spacing.xs,
    },
    advancedGroupLabel: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    presetRow: {
      gap: Spacing.xs,
      paddingBottom: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    presetChip: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBackground,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
    },
    presetChipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}20`,
    },
    presetChipText: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
    presetChipTextActive: {
      color: c.primary,
    },
    advancedActions: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    advancedBtn: {
      minWidth: 120,
    },
    validationNote: {
      color: c.warning,
      fontSize: Typography.fontSizeXs,
      marginTop: Spacing.xs,
    },
    filterInfoTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 6,
    },
    filterChipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.full,
      backgroundColor: c.inputBackground,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      maxWidth: '100%',
    },
    filterChipKey: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      textTransform: 'capitalize',
    },
    filterChipSep: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
    },
    filterChipValue: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
    },
    resultCard: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    resultTitle: {
      color: c.text,
      fontSize: Typography.fontSizeMd,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: Spacing.sm,
    },
    emptyText: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
    },
    legendWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    legendChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 5,
      backgroundColor: c.inputBackground,
    },
    legendChipActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}16`,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
    },
    legendTextMuted: {
      color: c.textMuted,
    },
    chartScroll: {
      gap: 2,
      paddingBottom: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    chartAreaRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.xs,
    },
    yAxisWrap: {
      minHeight: 96,
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingBottom: 14,
      width: 44,
    },
    yAxisText: {
      color: c.textMuted,
      fontSize: 10,
    },
    chartPointCol: {
      width: 34,
      alignItems: 'center',
    },
    chartBarsWrap: {
      minHeight: 96,
      justifyContent: 'flex-end',
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
    },
    chartBarsWrapSelected: {
      backgroundColor: `${c.primary}12`,
      borderRadius: Radius.sm,
      paddingHorizontal: 2,
    },
    chartBar: {
      width: 7,
      borderRadius: 3,
    },
    chartLabel: {
      color: c.textMuted,
      fontSize: 10,
      marginTop: 4,
    },
    trendMeta: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
      marginBottom: Spacing.sm,
    },
    tooltipCard: {
      marginTop: Spacing.xs,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.sm,
      backgroundColor: c.inputBackground,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    tooltipTitle: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    tooltipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    tooltipLabel: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      flex: 1,
    },
    tooltipValue: {
      color: c.text,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightSemibold,
    },
  });
}
