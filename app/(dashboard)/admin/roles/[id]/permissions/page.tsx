'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Permission {
  id: number;
  permissionCode: string;
  permissionName: string;
  module: string;
  description?: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export default function RolePermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as string;
  
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, [roleId]);

  const fetchPermissions = async () => {
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`);
      const data = await res.json();
      
      console.log('Permissions API Response:', data);
      
      if (data.success) {
        setRoleName(data.data.roleName);
        setPermissions(data.data.permissions);
        setIsAdminRole(data.data.isAdmin || false);
        
        if (data.data.permissions.length === 0) {
          alert('⚠️ Chưa có permissions trong database!\n\nVào /admin/test-permissions và click "Seed Permissions"');
        }
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Lỗi kết nối: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (permissionId: number, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') => {
    setPermissions(prev => prev.map(p => 
      p.id === permissionId ? { ...p, [field]: !p[field] } : p
    ));
  };

  const [isAdminRole, setIsAdminRole] = useState(false);

  const handleSave = async () => {
    if (isAdminRole) {
      alert('⚠️ ADMIN có toàn quyền tự động - không cần lưu vào database');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert('✅ Lưu phân quyền thành công');
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      alert('❌ Lỗi khi lưu phân quyền');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const moduleNames: Record<string, string> = {
    admin: '⚙️ Quản trị',
    products: '📦 Sản phẩm',
    inventory: '🏪 Kho',
    sales: '🛒 Bán hàng',
    purchasing: '🛍️ Mua hàng',
    finance: '💰 Tài chính',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-lg mb-2">Đang tải permissions...</div>
        <div className="text-sm text-gray-500">Role ID: {roleId}</div>
      </div>
    </div>
  );

  if (permissions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-yellow-900 mb-4">
            Chưa có Permissions trong hệ thống
          </h2>
          <p className="text-yellow-800 mb-6">
            Bạn cần seed permissions trước khi phân quyền cho role.
          </p>
          <div className="space-y-3">
            <a
              href="/admin/test-permissions"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              🌱 Đi đến trang Seed Permissions
            </a>
            <div className="text-sm text-gray-600">
              hoặc
            </div>
            <button
              onClick={() => router.back()}
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Quay lại
          </button>
          <h1 className="text-2xl font-bold">Phân quyền: {roleName}</h1>
          {isAdminRole && (
            <div className="mt-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <span className="font-semibold text-yellow-800">⚠️ Lưu ý:</span>
              <span className="text-yellow-700"> ADMIN có toàn quyền tự động - không cần lưu vào database</span>
            </div>
          )}
        </div>
        {!isAdminRole && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {saving ? 'Đang lưu...' : 'Lưu phân quyền'}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([module, perms]) => (
          <div key={module} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b">
              <h2 className="text-lg font-semibold">{moduleNames[module] || module}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/3">
                      Chức năng
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-1/6">
                      Xem
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-1/6">
                      Tạo
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-1/6">
                      Sửa
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-1/6">
                      Xóa
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {perms.map((perm) => (
                    <tr key={perm.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{perm.permissionName}</div>
                        <div className="text-xs text-gray-500">{perm.description}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={perm.canView}
                          onChange={() => handleToggle(perm.id, 'canView')}
                          disabled={isAdminRole}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={perm.canCreate}
                          onChange={() => handleToggle(perm.id, 'canCreate')}
                          disabled={isAdminRole}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={perm.canEdit}
                          onChange={() => handleToggle(perm.id, 'canEdit')}
                          disabled={isAdminRole}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={perm.canDelete}
                          onChange={() => handleToggle(perm.id, 'canDelete')}
                          disabled={isAdminRole}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {!isAdminRole && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {saving ? 'Đang lưu...' : 'Lưu phân quyền'}
          </button>
        </div>
      )}
    </div>
  );
}
