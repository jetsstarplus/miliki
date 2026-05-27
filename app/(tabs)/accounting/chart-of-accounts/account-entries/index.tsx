import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import { ACCOUNT_DETAIL_PAGE_DATA } from '@/graphql/properties/queries/accounting';
import { useQuery } from '@apollo/client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BATCH_SIZES = [10, 20, 50];

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

function extractEntries(payload: any): any[] {
	if (!payload || typeof payload !== 'object') return [];

	const direct = [
		payload?.entries,
		payload?.items,
		payload?.journalLines,
		payload?.lines,
		payload?.transactions,
		payload?.ledgerEntries,
		payload?.accountEntries,
		payload?.account?.entries,
		payload?.account?.journalLines,
		payload?.account?.transactions,
		payload?.list?.items,
		payload?.data?.entries,
		payload?.data?.items,
	].find(Array.isArray);

	if (Array.isArray(direct)) return direct;

	for (const key of Object.keys(payload)) {
		const value = (payload as any)[key];
		if (Array.isArray(value)) return value;
		if (value && typeof value === 'object') {
			const nested = extractEntries(value);
			if (nested.length) return nested;
		}
	}

	return [];
}

function pickText(item: any, keys: string[], fallback = '-'): string {
	for (const key of keys) {
		const value = key.split('.').reduce((acc: any, part) => acc?.[part], item);
		if (value !== undefined && value !== null && String(value).trim() !== '') {
			return String(value);
		}
	}
	return fallback;
}

function pickNumber(item: any, keys: string[]): number {
	for (const key of keys) {
		const value = key.split('.').reduce((acc: any, part) => acc?.[part], item);
		const parsed = Number(value);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return 0;
}

export default function AccountEntriesScreen() {
	const { colors } = useTheme();
	const styles = useMemo(() => makeStyles(colors), [colors]);
	const { isAuthenticated, activeCompany } = useAuth();
	const router = useRouter();
	const { width } = useWindowDimensions();
	const isTablet = width >= 768;
	const params = useLocalSearchParams<{ accountId?: string; accountName?: string; accountCode?: string; accountType?: string }>();

	const accountId = String(params.accountId ?? '').trim();
	const accountName = String(params.accountName ?? '').trim();
	const accountCode = String(params.accountCode ?? '').trim();

	const [search, setSearch] = useState('');
	const [debitCreditFilter, setDebitCreditFilter] = useState('ALL');
	const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');
	const [batchSize, setBatchSize] = useState(20);
	const [visibleCount, setVisibleCount] = useState(20);

	const { data, loading, error, refetch } = useQuery(ACCOUNT_DETAIL_PAGE_DATA, {
		variables: { accountId },
		fetchPolicy: 'cache-and-network',
		skip: !isAuthenticated || !activeCompany?.id || !accountId,
	});

	const payload = normalizeGenericScalarPayload((data as any)?.accountDetailPageData ?? {});
	const rawEntries = extractEntries(payload);

	const parsedEntries = rawEntries.map((item: any, index: number) => {
		const debitCredit = pickText(item, ['debitCredit', 'type', 'entryType', 'direction'], '').toUpperCase();
		const amount = pickNumber(item, ['amount', 'debitAmount', 'creditAmount', 'value']);
		const date = pickText(item, ['entryDate', 'date', 'createdAt', 'created'], '');

		return {
			id: pickText(item, ['id', 'uuid'], `row-${index}`),
			date,
			description: pickText(item, ['description', 'memo', 'narration', 'reference'], '-'),
			reference: pickText(item, ['reference', 'entryNumber', 'journalEntry.entryNumber', 'journalEntryId'], '-'),
			debitCredit: debitCredit || (amount >= 0 ? 'DEBIT' : 'CREDIT'),
			amount,
			raw: item,
		};
	});

	const needle = search.trim().toLowerCase();
	let filteredAndSorted = parsedEntries.filter((entry) => {
		const matchesSearch = !needle ||
			entry.description.toLowerCase().includes(needle) ||
			entry.reference.toLowerCase().includes(needle) ||
			entry.date.toLowerCase().includes(needle);

		const matchesType = debitCreditFilter === 'ALL' || entry.debitCredit === debitCreditFilter;
		return matchesSearch && matchesType;
	});

	filteredAndSorted = [...filteredAndSorted].sort((a, b) => {
		if (sortBy === 'DATE_ASC') return a.date.localeCompare(b.date);
		if (sortBy === 'DATE_DESC') return b.date.localeCompare(a.date);
		if (sortBy === 'AMOUNT_ASC') return a.amount - b.amount;
		return b.amount - a.amount;
	});

	const displayedEntries = filteredAndSorted.slice(0, visibleCount);
	const hasMore = displayedEntries.length < filteredAndSorted.length;

	function setAndResetVisible<T>(setter: (value: T) => void, value: T) {
		setter(value);
		setVisibleCount(batchSize);
	}

	function onLoadMore() {
		if (!hasMore || loading) return;
		setVisibleCount((prev) => prev + batchSize);
	}

	if (!isAuthenticated) {
		return (
			<SafeAreaView style={styles.safe} edges={['top']}>
				<AppHeader title="Account Entries" showBack />
				<ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
			</SafeAreaView>
		);
	}

	if (!activeCompany?.id) {
		return (
			<SafeAreaView style={styles.safe} edges={['top']}>
				<AppHeader title="Account Entries" showBack />
				<ErrorState title="Company required" message="Select a company to continue." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
			</SafeAreaView>
		);
	}

	if (!accountId) {
		return (
			<SafeAreaView style={styles.safe} edges={['top']}>
				<AppHeader title="Account Entries" showBack />
				<ErrorState title="Missing account" message="Open account entries from Chart of Accounts." onRetry={() => router.push('/(tabs)/accounting/chart-of-accounts' as any)} />
			</SafeAreaView>
		);
	}

	if (loading && !data) {
		return (
			<SafeAreaView style={styles.safe} edges={['top']}>
				<AppHeader title="Account Entries" showBack />
				<LoadingState />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<AppHeader title="Account Entries" showBack />

			<FlatList
				style={styles.page}
				data={displayedEntries}
					keyExtractor={(item) => item.id}
				contentContainerStyle={styles.list}
					refreshing={loading}
					onRefresh={refetch}
					onEndReachedThreshold={0.35}
					onEndReached={onLoadMore}
					ListEmptyComponent={<ErrorState title="No entries found" message="Try adjusting filters or search terms." />}
					ListFooterComponent={
						hasMore ? (
							<View style={styles.footerWrap}>
								<Text style={styles.paginationText}>Scroll to load more</Text>
							</View>
						) : (
							<View style={styles.footerWrap}>
								<Text style={styles.paginationText}>End of entries</Text>
							</View>
						)
					}
					ListHeaderComponent={
						<View>
							{error ? <ServerErrorBanner message={error.message} /> : null}

							<View style={styles.accountMetaCard}>
								<Text style={styles.accountName}>{accountName || pickText(payload, ['account.name', 'name'], 'Account')}</Text>
								<Text style={styles.accountMeta}>Code: {accountCode || pickText(payload, ['account.code', 'code'], '-')}</Text>
								<Text style={styles.accountMeta}>Type: {pickText(payload, ['account.accountType', 'accountType'], String(params.accountType ?? '-'))}</Text>
							</View>

							<Input
								label="Search Entries"
								value={search}
								onChangeText={(value) => setAndResetVisible(setSearch, value)}
								placeholder="Search description, reference, date"
							/>

							<View style={[styles.filterGrid, isTablet && styles.filterGridTablet]}>
								<View style={styles.filterBlock}>
									<Text style={styles.filterLabel}>Type</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
										{['ALL', 'DEBIT', 'CREDIT'].map((value) => {
											const active = debitCreditFilter === value;
											return (
												<TouchableOpacity key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setAndResetVisible(setDebitCreditFilter, value)}>
													<Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								</View>

								<View style={styles.filterBlock}>
									<Text style={styles.filterLabel}>Showing</Text>
									<View style={[styles.paginationTopRow, isTablet && styles.paginationTopRowTablet]}>
										<Text style={styles.paginationText}>Showing {displayedEntries.length} of {filteredAndSorted.length}</Text>
										<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowSmall}>
											{BATCH_SIZES.map((size) => {
												const active = batchSize === size;
												return (
													<TouchableOpacity key={String(size)} style={[styles.chipSmall, active && styles.chipActive]} onPress={() => { setBatchSize(size); setVisibleCount(size); }}>
														<Text style={[styles.chipText, active && styles.chipTextActive]}>{size}/load</Text>
													</TouchableOpacity>
												);
											})}
										</ScrollView>
									</View>
								</View>

								<View style={styles.filterBlock}>
									<Text style={styles.filterLabel}>Sort</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
										{[
											{ key: 'DATE_DESC', label: 'Date ↓' },
											{ key: 'DATE_ASC', label: 'Date ↑' },
											{ key: 'AMOUNT_DESC', label: 'Amount ↓' },
											{ key: 'AMOUNT_ASC', label: 'Amount ↑' },
										].map((item) => {
											const active = sortBy === item.key;
											return (
												<TouchableOpacity key={item.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setAndResetVisible(setSortBy as any, item.key as any)}>
													<Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
												</TouchableOpacity>
											);
										})}
									</ScrollView>
								</View>
							</View>
						</View>
					}
					renderItem={({ item }) => (
						<View style={styles.entryCard}>
							<View style={styles.entryHeader}>
								<Text style={styles.entryDate}>{item.date || '-'}</Text>
								<View style={styles.entrySideMeta}>
									<View style={[styles.typeBadge, item.debitCredit === 'CREDIT' ? styles.typeCredit : styles.typeDebit]}>
										<Text style={styles.typeBadgeText}>{item.debitCredit}</Text>
									</View>
									<Text style={styles.entryAmount}>{item.amount.toLocaleString()}</Text>
								</View>
							</View>
							<Text style={styles.entryDescription}>{item.description}</Text>
							<Text style={styles.entryMeta}>Ref: {item.reference}</Text>
						</View>
					)}
			/>
		</SafeAreaView>
	);
}

function makeStyles(c: AppColors) {
	return StyleSheet.create({
		safe: { flex: 1, backgroundColor: c.background },
		page: { flex: 1 },
		accountMetaCard: {
			backgroundColor: c.surface,
			borderWidth: 1,
			borderColor: c.borderLight,
			borderRadius: Radius.md,
			padding: Spacing.md,
			marginBottom: Spacing.sm,
			...Shadow.sm,
		},
		accountName: { color: c.text, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold },
		accountMeta: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginTop: 2 },
		filterLabel: { color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, marginBottom: Spacing.xs },
		filterGrid: { gap: Spacing.sm },
		filterGridTablet: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
		filterBlock: { flex: 1, minWidth: 0 },
		chipRow: { gap: Spacing.xs, paddingBottom: Spacing.sm },
		chipRowSmall: { gap: Spacing.xs },
		chip: {
			borderWidth: 1,
			borderColor: c.border,
			backgroundColor: c.inputBackground,
			paddingHorizontal: Spacing.md,
			paddingVertical: 8,
			borderRadius: Radius.full,
		},
		chipSmall: {
			borderWidth: 1,
			borderColor: c.border,
			backgroundColor: c.inputBackground,
			paddingHorizontal: Spacing.sm,
			paddingVertical: 6,
			borderRadius: Radius.full,
		},
		chipActive: { borderColor: c.primary, backgroundColor: `${c.primary}22` },
		chipText: { color: c.textSecondary, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },
		chipTextActive: { color: c.primary },
		paginationTopRow: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.xs },
		paginationTopRowTablet: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
		list: { flexGrow: 1, padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },
		entryCard: {
			backgroundColor: c.surface,
			borderWidth: 1,
			borderColor: c.borderLight,
			borderRadius: Radius.md,
			padding: Spacing.md,
			...Shadow.sm,
		},
		entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
		entryDate: { color: c.text, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightMedium },
		entrySideMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		typeBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
		typeDebit: { backgroundColor: `${c.success}22` },
		typeCredit: { backgroundColor: `${c.warning}22` },
		typeBadgeText: { color: c.text, fontSize: Typography.fontSizeXs, fontWeight: Typography.fontWeightSemibold },
		entryDescription: { color: c.text, fontSize: Typography.fontSizeSm, fontWeight: Typography.fontWeightMedium, marginBottom: 2 },
		entryMeta: { color: c.textSecondary, fontSize: Typography.fontSizeXs, marginBottom: 6 },
		entryAmount: { color: c.primary, fontSize: Typography.fontSizeMd, fontWeight: Typography.fontWeightSemibold },
		footerWrap: { paddingVertical: Spacing.sm, alignItems: 'center' },
		paginationText: { color: c.textSecondary, fontSize: Typography.fontSizeXs },
	});
}
