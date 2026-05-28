import { useTheme } from '@/context/theme';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { asText, toCurrency } from './report-helpers';
import { makeReportStyles } from './shared-styles';

type Props = { report: any };

export function TrialBalanceReportView({ report }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeReportStyles(colors), [colors]);

  const rows = Array.isArray(report?.account_balances) ? report.account_balances : [];

  if (!rows.length) return <Text style={styles.emptyText}>No trial balance rows available.</Text>;

  return (
    <>
      {rows.map((item: any, idx: number) => (
        <View key={String(item?.code ?? item?.name ?? idx)} style={styles.rowItem}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowLabel}>{asText(item?.name, 'Account')}</Text>
            <Text style={styles.rowExtra}>{asText(item?.code, '-')} | {asText(item?.account_type_label, '-')}</Text>
          </View>
          <View>
            <Text style={styles.rowValue}>{toCurrency(item?.balance)}</Text>
            <Text style={styles.rowExtra}>Dr {toCurrency(item?.debit)} | Cr {toCurrency(item?.credit)}</Text>
          </View>
        </View>
      ))}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Total Debit: {toCurrency(report?.total_debit)}</Text>
        <Text style={styles.summaryText}>Total Credit: {toCurrency(report?.total_credit)}</Text>
        <Text style={styles.summaryText}>Difference: {toCurrency(report?.difference)}</Text>
        <Text style={styles.summaryText}>Balanced: {Boolean(report?.is_balanced) ? 'Yes' : 'No'}</Text>
        <Text style={styles.summaryText}>Period: {asText(report?.period_label)}</Text>
      </View>
    </>
  );
}
