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

export function IncomeStatementReportView({ report }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeReportStyles(colors), [colors]);

  const revenues = Array.isArray(report?.revenues) ? report.revenues : [];
  const expenses = Array.isArray(report?.expenses) ? report.expenses : [];

  if (!revenues.length && !expenses.length) {
    return <Text style={styles.emptyText}>No income statement data available.</Text>;
  }

  return (
    <>
      <Section title="Revenues" items={revenues} />
      <Section title="Expenses" items={expenses} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Revenue Total: {toCurrency(report?.revenue_total)}</Text>
        <Text style={styles.summaryText}>Expense Total: {toCurrency(report?.expense_total)}</Text>
        <Text style={styles.summaryText}>Net Income: {toCurrency(report?.net_income)}</Text>
        <Text style={styles.summaryText}>Period: {asText(report?.period_label)}</Text>
      </View>
    </>
  );
}
