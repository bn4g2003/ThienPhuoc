import { useQuery } from '@tanstack/react-query';

interface Permission {
  permissionCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface PermissionsData {
  isAdmin: boolean;
  permissions: Permission[];
}

export const usePermissions = () => {
  const { data, isLoading } = useQuery<PermissionsData>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await fetch('/api/auth/permissions');
      const body = await res.json();
      if (!body.success) {
        throw new Error(body.error || 'Failed to fetch permissions');
      }
      return {
        isAdmin: body.data.isAdmin || false,
        permissions: body.data.permissions || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const permissions = data?.permissions || [];
  const isAdmin = data?.isAdmin || false;

  const can = (permissionCode: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    // ADMIN có toàn quyền
    if (isAdmin) return true;

    const permission = permissions.find(p => p.permissionCode === permissionCode);
    if (!permission) return false;

    switch (action) {
      case 'view': return permission.canView;
      case 'create': return permission.canCreate;
      case 'edit': return permission.canEdit;
      case 'delete': return permission.canDelete;
      default: return false;
    }
  };

  return { permissions, isAdmin, loading: isLoading, can };
};
