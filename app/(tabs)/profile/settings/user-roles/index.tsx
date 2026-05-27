import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { DropdownOption, SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { ServerErrorBanner } from '@/components/ui/ServerErrorBanner';
import { AppColors, Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/context/theme';
import {
    ASSIGN_USER_ROLE,
    BULK_INVITE_COMPANY_MEMBERS,
    INVITE_COMPANY_MEMBER,
    REMOVE_USER_ROLE,
    UPDATE_MEMBER_PERMISSIONS,
} from '@/graphql/properties/mutations/user-roles';
import {
    ASSIGN_ROLE_FORM_DATA,
    MEMBER_PERMISSIONS_FORM_DATA,
    USER_ROLES_PAGE_DATA,
} from '@/graphql/properties/queries/user-roles';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'roles' | 'permissions';

type PermissionFlags = {
  canManageProperties: boolean;
  canManageTenants: boolean;
  canManagePayments: boolean;
  canValidatePayments: boolean;
  canViewAccounting: boolean;
  canManageMembers: boolean;
  canInviteUsers: boolean;
  canViewReports: boolean;
  canModifyCompany: boolean;
};

const EMPTY_PERMISSIONS: PermissionFlags = {
  canManageProperties: false,
  canManageTenants: false,
  canManagePayments: false,
  canValidatePayments: false,
  canViewAccounting: false,
  canManageMembers: false,
  canInviteUsers: false,
  canViewReports: false,
  canModifyCompany: false,
};

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

function toRoleOptions(roleChoices: any): DropdownOption[] {
  if (!Array.isArray(roleChoices)) return [];
  return roleChoices
    .map((item) => {
      const id = String(item?.value ?? item?.id ?? '');
      const label = String(item?.label ?? item?.name ?? id);
      return id ? { id, label } : null;
    })
    .filter(Boolean) as DropdownOption[];
}

function toBuildingOptions(buildings: any): DropdownOption[] {
  if (!Array.isArray(buildings)) return [];
  return buildings
    .map((item) => {
      const id = String(item?.id ?? '');
      const label = String(item?.name ?? item?.label ?? id);
      const supervision = String(item?.supervisionLabel ?? '').trim();
      return id ? { id, label, sublabel: supervision || undefined } : null;
    })
    .filter(Boolean) as DropdownOption[];
}

function toMemberOptions(teamMembers: any): DropdownOption[] {
  if (!Array.isArray(teamMembers)) return [];
  return teamMembers
    .map((item) => {
      const id = String(item?.userId ?? item?.id ?? '');
      const email = String(item?.email ?? '').trim();
      const label = String(item?.fullName ?? email ?? id);
      return id ? { id, label, sublabel: email || undefined } : null;
    })
    .filter(Boolean) as DropdownOption[];
}

function formatPermissionLabel(value: string): string {
  if (!value) return '';
  const withSpaces = value
    .replace(/^can/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export default function UserRolesAccessScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isAuthenticated, activeCompany } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [activeTab, setActiveTab] = useState<TabKey>('roles');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [serverError, setServerError] = useState('');

  const [localUserRoles, setLocalUserRoles] = useState<any[]>([]);
  const [localMemberPermissions, setLocalMemberPermissions] = useState<any[]>([]);
  const [localHydrated, setLocalHydrated] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [assignBuildingId, setAssignBuildingId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionsTargetId, setPermissionsTargetId] = useState('');
  const [permissionsTargetName, setPermissionsTargetName] = useState('');
  const [permissionsTargetRole, setPermissionsTargetRole] = useState('');
  const [permissionsFlags, setPermissionsFlags] = useState<PermissionFlags>(EMPTY_PERMISSIONS);
  const [permissionMeta, setPermissionMeta] = useState<any[]>([]);
  const [isOwnerTarget, setIsOwnerTarget] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMember, setDetailsMember] = useState<any>(null);

  const { data, loading, error, refetch } = useQuery(USER_ROLES_PAGE_DATA, {
    variables: { companyId: activeCompany?.id },
    fetchPolicy: 'cache-and-network',
    skip: !isAuthenticated || !activeCompany?.id,
  });

  const [loadAssignRoleForm, { data: assignFormData, loading: assignFormLoading }] = useLazyQuery(ASSIGN_ROLE_FORM_DATA, {
    fetchPolicy: 'network-only',
  });

  const [loadPermissionsForm, { data: permissionsFormData, loading: permissionsFormLoading }] = useLazyQuery(
    MEMBER_PERMISSIONS_FORM_DATA,
    {
      fetchPolicy: 'network-only',
      onCompleted: (result) => {
        const payload = normalizeGenericScalarPayload((result as any)?.memberPermissionsFormData ?? {});
        const member = payload?.member ?? {};
        const permissionValues = member?.permissions ?? {};

        setPermissionsFlags({
          canManageProperties: Boolean(permissionValues?.canManageProperties),
          canManageTenants: Boolean(permissionValues?.canManageTenants),
          canManagePayments: Boolean(permissionValues?.canManagePayments),
          canValidatePayments: Boolean(permissionValues?.canValidatePayments),
          canViewAccounting: Boolean(permissionValues?.canViewAccounting),
          canManageMembers: Boolean(permissionValues?.canManageMembers),
          canInviteUsers: Boolean(permissionValues?.canInviteUsers),
          canViewReports: Boolean(permissionValues?.canViewReports),
          canModifyCompany: Boolean(permissionValues?.canModifyCompany),
        });
        setPermissionMeta(Array.isArray(payload?.permissionMeta) ? payload.permissionMeta : []);
        setIsOwnerTarget(Boolean(payload?.isOwnerTarget));
        setPermissionsTargetName(String(member?.fullName ?? permissionsTargetName));
        setPermissionsTargetRole(String(member?.roleDisplay ?? member?.role ?? permissionsTargetRole));
        setPermissionsOpen(true);
      },
    },
  );

  const [assignUserRole, { loading: assigningRole }] = useMutation(ASSIGN_USER_ROLE);
  const [inviteCompanyMember, { loading: invitingMember }] = useMutation(INVITE_COMPANY_MEMBER);
  const [bulkInviteCompanyMembers, { loading: bulkInvitingMembers }] = useMutation(BULK_INVITE_COMPANY_MEMBERS);
  const [removeUserRole, { loading: removingRole }] = useMutation(REMOVE_USER_ROLE);
  const [updateMemberPermissions, { loading: updatingPermissions }] = useMutation(UPDATE_MEMBER_PERMISSIONS);

  const pagePayload = normalizeGenericScalarPayload((data as any)?.userRolesPageData ?? {});
  const myMembership = pagePayload?.myMembership ?? {};
  const myRole = String(myMembership?.role ?? '').toUpperCase();
  const canManageMembers = Boolean(myMembership?.permissions?.canManageMembers);

  const userRolesItems = Array.isArray(pagePayload?.userRoles?.items) ? pagePayload.userRoles.items : [];
  const memberPermissionsItems = Array.isArray(pagePayload?.memberPermissions?.items) ? pagePayload.memberPermissions.items : [];

  useEffect(() => {
    setLocalUserRoles(userRolesItems);
    setLocalMemberPermissions(memberPermissionsItems);
    setLocalHydrated(true);
  }, [data]);

  const roleOptions = toRoleOptions(
    normalizeGenericScalarPayload((assignFormData as any)?.assignRoleFormData ?? {})?.roleChoices ??
      pagePayload?.formOptions?.roleChoices,
  );
  const buildingOptions = toBuildingOptions(
    normalizeGenericScalarPayload((assignFormData as any)?.assignRoleFormData ?? {})?.buildingsWithSupervision ??
      pagePayload?.formOptions?.buildingsWithSupervision,
  );
  const teamMemberOptions = toMemberOptions(
    normalizeGenericScalarPayload((assignFormData as any)?.assignRoleFormData ?? {})?.teamMembers ??
      pagePayload?.formOptions?.teamMembers,
  );

  const roleList = localHydrated ? localUserRoles : userRolesItems;
  const membersList = localHydrated ? localMemberPermissions : memberPermissionsItems;

  const filteredRoles = roleList.filter((item: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(item?.user?.fullName ?? '').toLowerCase().includes(q) ||
      String(item?.user?.email ?? '').toLowerCase().includes(q) ||
      String(item?.roleDisplay ?? item?.role ?? '').toLowerCase().includes(q) ||
      String(item?.building?.name ?? '').toLowerCase().includes(q)
    );
  });

  const filteredMembers = membersList.filter((item: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(item?.fullName ?? '').toLowerCase().includes(q) ||
      String(item?.email ?? '').toLowerCase().includes(q) ||
      String(item?.roleDisplay ?? item?.role ?? '').toLowerCase().includes(q)
    );
  });

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function openAssignRole() {
    if (!canManageMembers || !activeCompany?.id) return;
    setServerError('');
    setAssignUserId('');
    setAssignRole('');
    setAssignBuildingId('');
    setAssignNotes('');
    setAssignOpen(true);

    if (!teamMemberOptions.length || !roleOptions.length) {
      await loadAssignRoleForm({ variables: { companyId: activeCompany.id } });
    }
  }

  function openInviteMembers() {
    setServerError('');
    setInviteEmails('');
    setInviteMessage('');
    setInviteRole(roleOptions[0]?.id ?? 'AGENT');
    setInviteOpen(true);

    if (!roleOptions.length && activeCompany?.id) {
      loadAssignRoleForm({ variables: { companyId: activeCompany.id } });
    }
  }

  async function submitInviteMembers() {
    if (!activeCompany?.id) return;

    const emails = inviteEmails
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!emails.length) {
      setServerError('Enter at least one email address.');
      return;
    }

    if (!inviteRole) {
      setServerError('Please select a role for invited members.');
      return;
    }

    setServerError('');
    try {
      if (emails.length === 1) {
        const res = await inviteCompanyMember({
          variables: {
            companyId: activeCompany.id,
            email: emails[0],
            role: inviteRole,
            message: inviteMessage.trim() || null,
          },
        });
        const payload = res?.data?.inviteCompanyMember;
        if (!payload?.success) {
          setServerError(payload?.message ?? 'Could not send invitation.');
          return;
        }
      } else {
        const res = await bulkInviteCompanyMembers({
          variables: {
            companyId: activeCompany.id,
            emails,
            role: inviteRole,
          },
        });
        const payload = res?.data?.bulkInviteCompanyMembers;
        if (!payload?.success) {
          setServerError(payload?.message ?? 'Could not send invitations.');
          return;
        }
      }

      setInviteOpen(false);
      Alert.alert('Invitations sent', `Sent ${emails.length} invitation${emails.length > 1 ? 's' : ''} successfully.`);
    } catch (e: any) {
      setServerError(e?.message ?? 'Could not send invitations.');
    }
  }

  async function submitAssignRole() {
    if (!activeCompany?.id) return;
    if (!assignUserId || !assignRole) {
      setServerError('Please select a member and a role before saving.');
      return;
    }

    setServerError('');
    const selectedMember = teamMemberOptions.find((x) => x.id === assignUserId);
    const selectedRole = roleOptions.find((x) => x.id === assignRole);
    const selectedBuilding = buildingOptions.find((x) => x.id === assignBuildingId);
    const optimisticRoleId = `temp-role-${Date.now()}`;

    const optimisticRole = {
      id: optimisticRoleId,
      user: {
        fullName: selectedMember?.label ?? 'Pending user',
        email: selectedMember?.sublabel ?? '',
      },
      role: assignRole,
      roleDisplay: selectedRole?.label ?? assignRole,
      isPrimary: false,
      building: assignBuildingId ? { id: assignBuildingId, name: selectedBuilding?.label ?? '-' } : null,
      notes: assignNotes.trim() || null,
    };

    setLocalUserRoles((prev) => [optimisticRole, ...prev]);

    try {
      const res = await assignUserRole({
        variables: {
          companyId: activeCompany.id,
          userId: assignUserId,
          role: assignRole,
          buildingId: assignBuildingId || null,
          notes: assignNotes.trim() || null,
        },
      });

      const payload = res?.data?.assignUserRole;
      if (payload?.success) {
        const serverRole = payload?.userRole;
        if (serverRole?.id) {
          setLocalUserRoles((prev) =>
            prev.map((item) =>
              item?.id === optimisticRoleId
                ? {
                    ...item,
                    ...serverRole,
                    roleDisplay: item?.roleDisplay,
                    user: item?.user,
                    notes: item?.notes,
                  }
                : item,
            ),
          );
        }
        setAssignOpen(false);
      } else {
        setLocalUserRoles((prev) => prev.filter((item) => item?.id !== optimisticRoleId));
        setServerError(payload?.message ?? 'Could not assign role.');
      }
    } catch (e: any) {
      setLocalUserRoles((prev) => prev.filter((item) => item?.id !== optimisticRoleId));
      setServerError(e?.message ?? 'Could not assign role.');
    }
  }

  function askRemoveRole(roleItem: any) {
    const roleId = String(roleItem?.id ?? '');
    if (!roleId) return;

    Alert.alert(
      'Remove role',
      `Remove ${roleItem?.roleDisplay ?? roleItem?.role ?? 'this role'} from ${roleItem?.user?.fullName ?? 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const previous = [...roleList];
            setLocalUserRoles((prev) => prev.filter((item) => String(item?.id ?? '') !== roleId));
            setServerError('');
            try {
              const res = await removeUserRole({ variables: { roleId } });
              const payload = res?.data?.removeUserRole;
              if (payload?.success) {
                return;
              } else {
                setLocalUserRoles(previous);
                setServerError(payload?.message ?? 'Could not remove role.');
              }
            } catch (e: any) {
              setLocalUserRoles(previous);
              setServerError(e?.message ?? 'Could not remove role.');
            }
          },
        },
      ],
    );
  }

  function canEditMemberPermissions(member: any) {
    const isOwnerMember = String(member?.role ?? '').toUpperCase() === 'OWNER';
    return canManageMembers && (!isOwnerMember || myRole === 'OWNER');
  }

  async function openPermissionsEditor(member: any) {
    if (!activeCompany?.id) return;
    if (!canEditMemberPermissions(member)) return;

    const membershipId = String(member?.id ?? '');
    if (!membershipId) return;

    setServerError('');
    setPermissionsTargetId(membershipId);
    setPermissionsTargetName(String(member?.fullName ?? 'Member'));
    setPermissionsTargetRole(String(member?.roleDisplay ?? member?.role ?? '-'));
    setPermissionMeta([]);
    setIsOwnerTarget(false);

    await loadPermissionsForm({
      variables: {
        companyId: activeCompany.id,
        membershipId,
      },
    });
  }

  function openMemberDetails(member: any) {
    setDetailsMember(member);
    setDetailsOpen(true);
  }

  async function submitPermissionsUpdate() {
    if (!permissionsTargetId) return;

    if (isOwnerTarget && myRole !== 'OWNER') {
      setServerError('Only OWNER users can update permissions for OWNER members.');
      return;
    }

    setServerError('');
    const previousMembers = [...membersList];
    setLocalMemberPermissions((prev) =>
      prev.map((member) =>
        String(member?.id ?? '') === String(permissionsTargetId)
          ? {
              ...member,
              permissions: {
                ...(member?.permissions ?? {}),
                ...permissionsFlags,
              },
            }
          : member,
      ),
    );

    try {
      const res = await updateMemberPermissions({
        variables: {
          membershipId: permissionsTargetId,
          ...permissionsFlags,
        },
      });

      const payload = res?.data?.updateMemberPermissions;
      if (payload?.success) {
        setPermissionsOpen(false);
      } else {
        setLocalMemberPermissions(previousMembers);
        setServerError(payload?.message ?? 'Could not update permissions.');
      }
    } catch (e: any) {
      setLocalMemberPermissions(previousMembers);
      setServerError(e?.message ?? 'Could not update permissions.');
    }
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="User Roles & Access" showBack />
        <ErrorState title="Session expired" message="Please sign in again to continue." onRetry={() => router.replace('/(auth)/login' as any)} />
      </SafeAreaView>
    );
  }

  if (!activeCompany?.id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="User Roles & Access" showBack />
        <ErrorState title="Company required" message="Select a company to manage roles and permissions." onRetry={() => router.push('/(tabs)/profile/company-switcher' as any)} />
      </SafeAreaView>
    );
  }

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="User Roles & Access" showBack />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="User Roles & Access" showBack />
        <ErrorState title="Could not load roles" message={error.message} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="User Roles & Access"
        showBack
        rightElement={
          canManageMembers && activeTab === 'roles' ? (
            <TouchableOpacity onPress={openAssignRole}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.page}>
        {serverError ? <ServerErrorBanner message={serverError} /> : null}

        {!canManageMembers ? (
          <ErrorState
            title="Permission denied"
            message="You do not have permission to manage members in this company."
            onRetry={() => router.back()}
          />
        ) : (
          <>
            {activeTab === 'roles' ? (
              <View style={styles.actionsRow}>
                <Button title="Assign Role" onPress={openAssignRole} />
                <Button title="Invite Members" variant="ghost" onPress={openInviteMembers} />
              </View>
            ) : null}

            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'roles' && styles.tabBtnActive]}
                onPress={() => setActiveTab('roles')}
              >
                <Text style={[styles.tabText, activeTab === 'roles' && styles.tabTextActive]}>User Roles & Building Assignments</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'permissions' && styles.tabBtnActive]}
                onPress={() => setActiveTab('permissions')}
              >
                <Text style={[styles.tabText, activeTab === 'permissions' && styles.tabTextActive]}>Member Permissions</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Search"
              value={search}
              onChangeText={setSearch}
              placeholder={activeTab === 'roles' ? 'Search roles, users, or buildings' : 'Search members by name, email, or role'}
            />

            {activeTab === 'roles' ? (
              <FlatList
                data={filteredRoles}
                keyExtractor={(item: any, idx) => String(item?.id ?? `role-${idx}`)}
                key={isTablet ? 'roles-tablet-2col' : 'roles-phone-1col'}
                numColumns={isTablet ? 2 : 1}
                columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                  <ErrorState
                    title="No roles found"
                    message="Assign the first role for this company."
                    onRetry={openAssignRole}
                  />
                }
                renderItem={({ item }) => (
                  <View style={[styles.card, isTablet && styles.cardTablet]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{item?.user?.fullName ?? 'Unknown user'}</Text>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => askRemoveRole(item)}
                        disabled={removingRole}
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.meta}>{item?.user?.email ?? '-'}</Text>
                    <Text style={styles.meta}>Role: {item?.roleDisplay ?? item?.role ?? '-'}</Text>
                    <Text style={styles.meta}>Building: {item?.building?.name ?? 'Company-wide'}</Text>
                    <Text style={styles.meta}>Primary: {item?.isPrimary ? 'Yes' : 'No'}</Text>
                    {item?.notes ? <Text style={styles.description}>{item.notes}</Text> : null}
                  </View>
                )}
              />
            ) : (
              <FlatList
                data={filteredMembers}
                keyExtractor={(item: any, idx) => String(item?.id ?? `member-${idx}`)}
                key={isTablet ? 'members-tablet-2col' : 'members-phone-1col'}
                numColumns={isTablet ? 2 : 1}
                columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                  <ErrorState title="No members found" message="No active company members were returned." onRetry={() => refetch()} />
                }
                renderItem={({ item }) => {
                  const canEdit = canEditMemberPermissions(item);
                  return (
                    <View style={[styles.card, isTablet && styles.cardTablet]}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{item?.fullName ?? 'Unknown member'}</Text>
                        <View style={styles.cardActions}>
                          <TouchableOpacity style={styles.iconBtn} onPress={() => openMemberDetails(item)}>
                            <Ionicons name="eye-outline" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          {canEdit ? (
                            <TouchableOpacity style={styles.iconBtn} onPress={() => openPermissionsEditor(item)}>
                              <Ionicons name="create-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                      <Text style={styles.meta}>{item?.email ?? '-'}</Text>
                      <Text style={styles.meta}>Role: {item?.roleDisplay ?? item?.role ?? '-'}</Text>

                      <View style={styles.permissionsPreview}>
                        {Object.entries(item?.permissions ?? {})
                          .filter(([, value]) => Boolean(value))
                          .slice(0, 4)
                          .map(([key]) => (
                            <View key={key} style={styles.permissionChip}>
                              <Text style={styles.permissionChipText}>{key}</Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </>
        )}
      </View>

      <Modal visible={assignOpen} animationType="slide" transparent onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAssignOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Assign Role</Text>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <SearchableDropdown
              label="Member"
              value={assignUserId}
              displayValue={teamMemberOptions.find((x) => x.id === assignUserId)?.label}
              options={teamMemberOptions}
              onSelect={(option) => setAssignUserId(option.id)}
              loading={assignFormLoading}
            />

            <SearchableDropdown
              label="Role"
              value={assignRole}
              displayValue={roleOptions.find((x) => x.id === assignRole)?.label}
              options={roleOptions}
              onSelect={(option) => setAssignRole(option.id)}
              loading={assignFormLoading}
              searchable={false}
              clearable={false}
            />

            <SearchableDropdown
              label="Building (optional)"
              value={assignBuildingId}
              displayValue={buildingOptions.find((x) => x.id === assignBuildingId)?.label}
              options={buildingOptions}
              onSelect={(option) => setAssignBuildingId(option.id)}
              onClear={() => setAssignBuildingId('')}
              loading={assignFormLoading}
            />

            <Input
              label="Notes"
              value={assignNotes}
              onChangeText={setAssignNotes}
              placeholder="Optional notes"
              multiline
            />

            <Button title={assigningRole ? 'Assigning...' : 'Assign Role'} onPress={submitAssignRole} loading={assigningRole} />
            <View style={{ height: Spacing.sm }} />
            <Button title="Cancel" variant="ghost" onPress={() => setAssignOpen(false)} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={permissionsOpen} animationType="slide" transparent onRequestClose={() => setPermissionsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPermissionsOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Edit Permissions</Text>
          <Text style={styles.sheetSubtitle}>{permissionsTargetName} • {permissionsTargetRole}</Text>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            {isOwnerTarget && myRole !== 'OWNER' ? (
              <ServerErrorBanner message="Only OWNER users can modify permissions for OWNER members." />
            ) : null}

            {permissionsFormLoading ? <LoadingState /> : null}

            {(permissionMeta.length ? permissionMeta : Object.keys(permissionsFlags).map((k) => ({ key: k, label: k }))).map((meta: any) => {
              const key = String(meta?.key ?? '');
              if (!(key in permissionsFlags)) return null;

              return (
                <View key={key} style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>{meta?.label ?? key}</Text>
                    {meta?.description ? <Text style={styles.switchDescription}>{meta.description}</Text> : null}
                  </View>
                  <Switch
                    value={Boolean((permissionsFlags as any)[key])}
                    onValueChange={(value) =>
                      setPermissionsFlags((s) => ({
                        ...s,
                        [key]: value,
                      }))
                    }
                    disabled={isOwnerTarget && myRole !== 'OWNER'}
                  />
                </View>
              );
            })}

            <Button
              title={updatingPermissions ? 'Saving...' : 'Save Permissions'}
              onPress={submitPermissionsUpdate}
              loading={updatingPermissions}
              disabled={isOwnerTarget && myRole !== 'OWNER'}
            />
            <View style={{ height: Spacing.sm }} />
            <Button title="Cancel" variant="ghost" onPress={() => setPermissionsOpen(false)} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={inviteOpen} animationType="slide" transparent onRequestClose={() => setInviteOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setInviteOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Invite Members</Text>
          <Text style={styles.sheetSubtitle}>Use comma or new line for multiple email addresses.</Text>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Input
              label="Email(s)"
              value={inviteEmails}
              onChangeText={setInviteEmails}
              placeholder="name@example.com, another@example.com"
              multiline
            />

            <SearchableDropdown
              label="Role"
              value={inviteRole}
              displayValue={roleOptions.find((x) => x.id === inviteRole)?.label}
              options={roleOptions}
              onSelect={(option) => setInviteRole(option.id)}
              searchable={false}
              clearable={false}
            />

            <Input
              label="Message (optional)"
              value={inviteMessage}
              onChangeText={setInviteMessage}
              placeholder="Optional invitation message"
              multiline
            />

            <Button
              title={invitingMember || bulkInvitingMembers ? 'Sending...' : 'Send Invites'}
              onPress={submitInviteMembers}
              loading={invitingMember || bulkInvitingMembers}
            />
            <View style={{ height: Spacing.sm }} />
            <Button title="Cancel" variant="ghost" onPress={() => setInviteOpen(false)} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={detailsOpen} animationType="slide" transparent onRequestClose={() => setDetailsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDetailsOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Member Details</Text>
          <Text style={styles.sheetSubtitle}>{detailsMember?.fullName ?? '-'} • {detailsMember?.roleDisplay ?? detailsMember?.role ?? '-'}</Text>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Text style={styles.meta}>Email: {detailsMember?.email ?? '-'}</Text>
            <Text style={styles.meta}>Membership ID: {detailsMember?.id ?? '-'}</Text>
            <Text style={styles.meta}>Raw Membership ID: {detailsMember?.rawId ?? '-'}</Text>
            <Text style={styles.meta}>User ID: {detailsMember?.userId ?? '-'}</Text>
            <Text style={styles.meta}>Raw User ID: {detailsMember?.rawUserId ?? '-'}</Text>

            <View style={{ height: Spacing.sm }} />
            <Text style={styles.switchTitle}>Granted Permissions</Text>
            <View style={styles.permissionsPreview}>
              {Object.entries(detailsMember?.permissions ?? {})
                .filter(([, value]) => Boolean(value))
                .map(([key]) => (
                  <View key={key} style={styles.permissionChip}>
                    <Text style={styles.permissionChipText}>{formatPermissionLabel(String(key))}</Text>
                  </View>
                ))}
            </View>

            <View style={{ height: Spacing.sm }} />
            <Button title="Close" variant="ghost" onPress={() => setDetailsOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    page: { flex: 1, padding: Spacing.md },
    actionsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderRadius: Radius.md,
      padding: 4,
      marginBottom: Spacing.sm,
      gap: 4,
    },
    tabBtn: {
      flex: 1,
      borderRadius: Radius.sm,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBtnActive: {
      backgroundColor: c.primary + '1A',
    },
    tabText: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
      textAlign: 'center',
    },
    tabTextActive: {
      color: c.primary,
      fontWeight: Typography.fontWeightSemibold,
    },
    list: {
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
    columnWrap: {
      justifyContent: 'space-between',
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: Spacing.md,
      ...Shadow.sm,
    },
    cardTablet: {
      width: '48.5%',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: 4,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 6,
    },
    cardTitle: {
      flex: 1,
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightSemibold,
    },
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBackground,
    },
    meta: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginBottom: 2,
    },
    description: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeXs,
      marginTop: 6,
    },
    permissionsPreview: {
      marginTop: Spacing.xs,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    permissionChip: {
      borderRadius: Radius.full,
      backgroundColor: c.primary + '1A',
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    permissionChipText: {
      color: c.primary,
      fontSize: Typography.fontSizeXs,
      fontWeight: Typography.fontWeightMedium,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      maxHeight: '85%',
      backgroundColor: c.surface,
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
      padding: Spacing.md,
    },
    sheetTitle: {
      color: c.text,
      fontSize: Typography.fontSizeLg,
      fontWeight: Typography.fontWeightSemibold,
      marginBottom: 4,
    },
    sheetSubtitle: {
      color: c.textSecondary,
      fontSize: Typography.fontSizeSm,
      marginBottom: Spacing.sm,
    },
    sheetContent: {
      paddingBottom: Spacing.xxl,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    switchTitle: {
      color: c.text,
      fontSize: Typography.fontSizeSm,
      fontWeight: Typography.fontWeightMedium,
      marginBottom: 2,
    },
    switchDescription: {
      color: c.textMuted,
      fontSize: Typography.fontSizeXs,
    },
  });
}
