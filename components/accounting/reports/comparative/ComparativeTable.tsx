import { ScrollView, Text, View } from 'react-native';
import { toCurrency } from '../report-helpers';
import { ComparativePeriod, ComparativeRow } from './types';

type Props = {
  periods: ComparativePeriod[];
  rows: ComparativeRow[];
  styles: any;
};

export function ComparativeTable({ periods, rows, styles }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={styles.tableHeaderCellMain}>
            <Text style={styles.tableHeaderText}>Metric / Account</Text>
          </View>
          {periods.map((period, idx) => (
            <View key={`period-${idx}`} style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderText}>{period.label}</Text>
            </View>
          ))}
        </View>

        {rows.map((row) => (
          <View key={row.key} style={styles.tableRow}>
            <View style={styles.tableCellMain}>
              <Text style={styles.tableMainText}>{row.label}</Text>
              {row.subLabel ? <Text style={styles.tableSubText}>{row.subLabel}</Text> : null}
            </View>
            {periods.map((_, idx) => (
              <View key={`${row.key}-${idx}`} style={styles.tableCell}>
                <Text style={styles.tableValueText}>{toCurrency(row.values[idx] ?? 0)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
