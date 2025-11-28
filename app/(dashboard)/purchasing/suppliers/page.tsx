'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import WrapperContent from '@/components/WrapperContent';
import { PlusOutlined, DownloadOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';

interface Supplier {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone: string;
  email: string;
  address: string;
  groupName: string;
  debtAmount: number;
  isActive: boolean;
}

export default function SuppliersPage() {
  const { can, loading: permLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'groups'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [formData, setFormData] = useState({
    supplierCode: '',
    supplierName: '',
    phone: '',
    email: '',
    address: '',
    supplierGroupId: '',
  });
  const [groupFormData, setGroupFormData] = useState({
    groupCode: '',
    groupName: '',
    description: '',
  });
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!permLoading && can('purchasing.suppliers', 'view')) {
      fetchSuppliers();
      fetchGroups();
    } else if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/purchasing/suppliers');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSuppliers(data.data);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error(error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/purchasing/supplier-groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setGroups(data.data);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error(error);
      setGroups([]);
    }
  };

  const handleCreate = () => {
    setSelectedSupplier(null);
    setFormData({
      supplierCode: '',
      supplierName: '',
      phone: '',
      email: '',
      address: '',
      supplierGroupId: '',
    });
    setShowModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      supplierGroupId: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedSupplier 
        ? `/api/purchasing/suppliers/${selectedSupplier.id}`
        : '/api/purchasing/suppliers';
      
      const res = await fetch(url, {
        method: selectedSupplier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert(selectedSupplier ? 'Cập nhật thành công' : 'Tạo nhà cung cấp thành công');
        setShowModal(false);
        fetchSuppliers();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa nhà cung cấp này?')) return;

    try {
      const res = await fetch(`/api/purchasing/suppliers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Xóa thành công');
        fetchSuppliers();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setGroupFormData({
      groupCode: '',
      groupName: '',
      description: '',
    });
    setShowGroupModal(true);
  };

  const handleEditGroup = (group: any) => {
    setSelectedGroup(group);
    setGroupFormData({
      groupCode: group.groupCode,
      groupName: group.groupName,
      description: group.description || '',
    });
    setShowGroupModal(true);
  };

  const handleSubmitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedGroup 
        ? `/api/purchasing/supplier-groups/${selectedGroup.id}`
        : '/api/purchasing/supplier-groups';
      
      const res = await fetch(url, {
        method: selectedGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData),
      });

      const data = await res.json();
      if (data.success) {
        alert(selectedGroup ? 'Cập nhật thành công' : 'Tạo nhóm thành công');
        setShowGroupModal(false);
        fetchGroups();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Xác nhận xóa nhóm này?')) return;

    try {
      const res = await fetch(`/api/purchasing/supplier-groups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Xóa thành công');
        fetchGroups();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleResetAll = () => {
    setFilterQueries({});
    setSearchTerm('');
  };

  const handleExportExcel = () => {
    alert('Chức năng xuất Excel đang được phát triển');
  };

  const handleImportExcel = () => {
    alert('Chức năng nhập Excel đang được phát triển');
  };

  const filteredSuppliers = suppliers.filter(s => {
    const searchKey = 'search,supplierName,supplierCode,phone';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue || 
      s.supplierName.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.supplierCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.phone?.includes(searchValue);
    
    const statusValue = filterQueries['isActive'];
    const matchStatus = statusValue === undefined || s.isActive === (statusValue === 'true');
    
    return matchSearch && matchStatus;
  });

  return (
    <>
      <WrapperContent<Supplier>
        title="Quản lý nhà cung cấp"
        isNotAccessible={!can('purchasing.suppliers', 'view')}
        isLoading={permLoading || loading}
        header={{
          buttonEnds: can('purchasing.suppliers', 'create')
            ? [
                {
                  type: 'default',
                  name: 'Đặt lại',
                  onClick: handleResetAll,
                  icon: <ReloadOutlined />,
                },
                {
                  type: 'primary',
                  name: activeTab === 'suppliers' ? 'Thêm NCC' : 'Thêm nhóm',
                  onClick: activeTab === 'suppliers' ? handleCreate : handleCreateGroup,
                  icon: <PlusOutlined />,
                },
                {
                  type: 'default',
                  name: 'Xuất Excel',
                  onClick: handleExportExcel,
                  icon: <DownloadOutlined />,
                },
                {
                  type: 'default',
                  name: 'Nhập Excel',
                  onClick: handleImportExcel,
                  icon: <UploadOutlined />,
                },
              ]
            : [
                {
                  type: 'default',
                  name: 'Đặt lại',
                  onClick: handleResetAll,
                  icon: <ReloadOutlined />,
                },
              ],
          searchInput: activeTab === 'suppliers' ? {
            placeholder: 'Tìm theo tên, mã, số điện thoại...',
            filterKeys: ['supplierName', 'supplierCode', 'phone'],
          } : undefined,
          filters: activeTab === 'suppliers' ? {
            fields: [
              {
                type: 'select',
                name: 'isActive',
                label: 'Trạng thái',
                options: [
                  { label: 'Hoạt động', value: 'true' },
                  { label: 'Ngừng', value: 'false' },
                ],
              },
            ],
            onApplyFilter: (arr) => {
              const newQueries: Record<string, any> = { ...filterQueries };
              arr.forEach(({ key, value }) => {
                newQueries[key] = value;
              });
              setFilterQueries(newQueries);
            },
            onReset: () => {
              setFilterQueries({});
              setSearchTerm('');
            },
            query: filterQueries,
          } : undefined,
        }}
      >
        <div className="space-y-6">

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'suppliers'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🏢 Nhà cung cấp
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'groups'
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📊 Nhóm NCC
              </button>
            </div>
          </div>

          {activeTab === 'suppliers' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-2">🏢</div>
                <div>Chưa có nhà cung cấp</div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Mã NCC</th>
                    <th className="px-4 py-3 text-left">Tên nhà cung cấp</th>
                    <th className="px-4 py-3 text-left">Điện thoại</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Nhóm</th>
                    <th className="px-4 py-3 text-right">Công nợ</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{supplier.supplierCode}</td>
                      <td className="px-4 py-3 font-medium">{supplier.supplierName}</td>
                      <td className="px-4 py-3">{supplier.phone}</td>
                      <td className="px-4 py-3">{supplier.email}</td>
                      <td className="px-4 py-3">{supplier.groupName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={supplier.debtAmount > 0 ? 'text-red-600 font-semibold' : ''}>
                          {supplier.debtAmount.toLocaleString()} đ
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {supplier.isActive ? 'Hoạt động' : 'Ngừng'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {can('purchasing.suppliers', 'edit') && (
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✏️ Sửa
                          </button>
                        )}
                        {can('purchasing.suppliers', 'delete') && (
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️ Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-2">📊</div>
              <div>Chưa có nhóm nhà cung cấp</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Mã nhóm</th>
                  <th className="px-4 py-3 text-left">Tên nhóm</th>
                  <th className="px-4 py-3 text-left">Mô tả</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{group.groupCode}</td>
                    <td className="px-4 py-3 font-medium">{group.groupName}</td>
                    <td className="px-4 py-3 text-gray-600">{group.description}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {can('purchasing.suppliers', 'edit') && (
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️ Sửa
                        </button>
                      )}
                      {can('purchasing.suppliers', 'delete') && (
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️ Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
            </div>
          )}
        </div>
      </WrapperContent>

      {/* Modal Supplier */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {selectedSupplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã NCC *</label>
                <input
                  type="text"
                  value={formData.supplierCode}
                  onChange={(e) => setFormData({...formData, supplierCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                  disabled={!!selectedSupplier}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên nhà cung cấp *</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nhóm NCC</label>
                <select
                  value={formData.supplierGroupId}
                  onChange={(e) => setFormData({...formData, supplierGroupId: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- Chọn nhóm --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.groupName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {selectedSupplier ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Group */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {selectedGroup ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}
            </h2>
            <form onSubmit={handleSubmitGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã nhóm *</label>
                <input
                  type="text"
                  value={groupFormData.groupCode}
                  onChange={(e) => setGroupFormData({...groupFormData, groupCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                  disabled={!!selectedGroup}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên nhóm *</label>
                <input
                  type="text"
                  value={groupFormData.groupName}
                  onChange={(e) => setGroupFormData({...groupFormData, groupName: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({...groupFormData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {selectedGroup ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
