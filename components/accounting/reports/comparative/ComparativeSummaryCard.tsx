import { Text, View } from 'react-native';
import { asText } from '../report-helpers';

type Props = {
  report: any;
  styles: any;
};

export function ComparativeSummaryCard({ report, styles }: Props) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryText}>Frequency: {asText(report?.frequency)}</Text>
      <Text style={styles.summaryText}>Mode: {asText(report?.mode)}</Text>
      <Text style={styles.summaryText}>Periods Count: {asText(report?.count)}</Text>
    </View>
  );
}
