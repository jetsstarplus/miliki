import { useTheme } from '@/context/theme';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { asText, toCurrency } from './report-helpers';
import { makeReportStyles } from './shared-styles';

type Props = { report: any };

export function RetainedEarningsReportView({ report }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeReportStyles(colors), [colors]);

  const hasData =
    report &&
    typeof report === 'object' &&
    ['opening_balance', 'net_income', 'dividends', 'closing_balance'].some((k) => k in report);

  if (!hasData) {
    return <Text style={styles.emptyText}>No retained earnings data available.</Text>;
  }

  const retainedAccount = report?.retained_account;

  return (
    <>
      <View style={styles.rowItem}>
        <View style={styles.rowTextWrap}><Text style={styles.rowLabel}>Opening Balance</Text></View>
        <Text style={styles.rowValue}>{toCurrency(report?.opening_balance)}</Text>
      </View>
      <View style={styles.rowItem}>
        <View style={styles.rowTextWrap}><Text style={styles.rowLabel}>Net Income</Text></View>
        <Text style={styles.rowValue}>{toCurrency(report?.net_income)}</Text>
      </View>
      <View style={styles.rowItem}>
        <View style={styles.rowTextWrap}><Text style={styles.rowLabel}>Dividends</Text></View>
        <Text style={styles.rowValue}>{toCurrency(report?.dividends)}</Text>
      </View>
      <View style={styles.rowItem}>
        <View style={styles.rowTextWrap}><Text style={styles.rowLabel}>Closing Balance</Text></View>
        <Text style={styles.rowValue}>{toCurrency(report?.closing_balance)}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Retained Account: {asText(retainedAccount?.code)} - {asText(retainedAccount?.name)}</Text>
        <Text style={styles.summaryText}>Period: {asText(report?.period_label)}</Text>
      </View>
    </>
  );
}
