import { asText } from '../report-helpers';
import { ComparativePeriod, ComparativeReportShape, ComparativeRow } from './types';

export function mapPeriods(report: ComparativeReportShape): ComparativePeriod[] {
  const periods = Array.isArray(report?.periods) ? report.periods : [];
  return periods.map((period: any, idx: number) => ({
    label: asText(period?.label, `Period ${idx + 1}`),
  }));
}

export function mapRows(report: ComparativeReportShape): ComparativeRow[] {
  const totals = (Array.isArray(report?.totals_rows) ? report.totals_rows : []).map((row: any, idx: number) => ({
    key: `total-${idx}`,
    label: asText(row?.label, `Total ${idx + 1}`),
    values: Array.isArray(row?.values) ? row.values.map((v: any) => Number(v) || 0) : [],
  }));

  const accounts = (Array.isArray(report?.account_rows) ? report.account_rows : []).map((row: any, idx: number) => ({
    key: `acct-${idx}`,
    label: asText(row?.code, '-'),
    subLabel: `${asText(row?.name, 'Account')} (${asText(row?.account_type_label, '-')})`,
    values: Array.isArray(row?.values) ? row.values.map((v: any) => Number(v) || 0) : [],
  }));

  return [...totals, ...accounts];
}
