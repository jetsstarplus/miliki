import { useTheme } from '@/context/theme';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { asText, toCurrency } from './report-helpers';
import { makeReportStyles } from './shared-styles';

type Props = { report: any };

export function CashFlowReportView({ report }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeReportStyles(colors), [colors]);

  const hasData =
    report &&
    typeof report === 'object' &&
    ['operating', 'investing', 'financing', 'net_change', 'opening_cash', 'closing_cash'].some((k) => k in report);

  if (!hasData) {
    return <Text style={styles.emptyText}>No cash flow data available.</Text>;
  }

  const rows = [
    { key: 'operating', label: 'Operating Activities', value: report?.operating },
    { key: 'investing', label: 'Investing Activities', value: report?.investing },
    { key: 'financing', label: 'Financing Activities', value: report?.financing },
    { key: 'net_change', label: 'Net Cash Change', value: report?.net_change },
    { key: 'opening_cash', label: 'Opening Cash', value: report?.opening_cash },
    { key: 'closing_cash', label: 'Closing Cash', value: report?.closing_cash },
  ];

  return (
    <>
      {rows.map((row) => (
        <View key={row.key} style={styles.rowItem}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowLabel}>{row.label}</Text>
          </View>
          <Text style={styles.rowValue}>{toCurrency(row.value)}</Text>
        </View>
      ))}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Period: {asText(report?.period_label)}</Text>
        <Text style={styles.summaryText}>From: {asText(report?.start_date)}</Text>
        <Text style={styles.summaryText}>To: {asText(report?.end_date)}</Text>
      </View>
    </>
  );
}
