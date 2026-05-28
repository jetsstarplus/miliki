import { useTheme } from '@/context/theme';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { asText, toCurrency } from './report-helpers';
import { makeReportStyles } from './shared-styles';

type Props = { report: any };

function Section({ title, items }: { title: string; items: any[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeReportStyles(colors), [colors]);

  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length ? (
        items.map((item: any, idx: number) => (
          <View key={String(item?.code ?? item?.name ?? `${title}-${idx}`)} style={styles.rowItem}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>{asText(item?.name, 'Account')}</Text>
              <Text style={styles.rowExtra}>{asText(item?.code, '-')}</Text>
            </View>
            <Text style={styles.rowValue}>{toCurrency(item?.balance)}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No {title.toLowerCase()} rows.</Text>
      )}
    </>
  );
}

export function BalanceSheetReportView({ report }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeReportStyles(colors), [colors]);

  const assets = Array.isArray(report?.assets) ? report.assets : [];
  const liabilities = Array.isArray(report?.liabilities) ? report.liabilities : [];
  const equity = Array.isArray(report?.equity) ? report.equity : [];

  if (!assets.length && !liabilities.length && !equity.length) {
    return <Text style={styles.emptyText}>No balance sheet data available.</Text>;
  }

  return (
    <>
      <Section title="Assets" items={assets} />
      <Section title="Liabilities" items={liabilities} />
      <Section title="Equity" items={equity} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Total Assets: {toCurrency(report?.total_assets)}</Text>
        <Text style={styles.summaryText}>Total Liabilities: {toCurrency(report?.total_liabilities)}</Text>
        <Text style={styles.summaryText}>Total Equity: {toCurrency(report?.total_equity)}</Text>
        <Text style={styles.summaryText}>Difference: {toCurrency(report?.balance_difference)}</Text>
        <Text style={styles.summaryText}>Period: {asText(report?.period_label)}</Text>
      </View>
    </>
  );
}
