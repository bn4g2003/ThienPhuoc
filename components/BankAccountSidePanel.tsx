import { usePermissions } from '@/hooks/usePermissions';
import React, { useState } from 'react';

interface BankAccount {
  id: number;
  accountNumber: string;
  accountHolder: string;
  bankName: string;
  branchName?: string;
  balance: number;
  isActive: boolean;
  companyBranchName: string;
  branchId: number;
  createdAt: string;
}

interface Props {
  account: BankAccount;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BankAccountSidePanel({ account, onClose, onUpdate }: Props) {
  const { can } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: account.accountNumber,
    accountHolder: account.accountHolder,
    bankName: account.bankName,
    branchName: account.branchName || '',
    balance: account.balance.toString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/finance/bank-accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          balance: parseFloat(formData.balance),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Cập nhật thành công!');
        setIsEditing(false);
        onUpdate();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    try {
      const res = await fetch(`/api/finance/bank-accounts/${account.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('Xóa thành công!');
        onClose();
        onUpdate();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xl font-bold">Chi tiết tài khoản ngân hàng</h2>
          <p className="text-sm text-gray-600">{account.accountNumber}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-6 space-y-6">
        {!isEditing ? (
          <>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Số tài khoản:</span>
                <span className="font-medium">{account.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Chủ tài khoản:</span>
                <span className="font-medium">{account.accountHolder}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ngân hàng:</span>
                <span className="font-medium">{account.bankName}</span>
              </div>
              {account.branchName && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Chi nhánh NH:</span>
                  <span className="font-medium">{account.branchName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Số dư:</span>
                <span className="font-medium text-lg text-blue-600">
                  {account.balance.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Chi nhánh công ty:</span>
                <span className="font-medium">{account.companyBranchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Trạng thái:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {account.isActive ? 'Hoạt động' : 'Ngừng'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ngày tạo:</span>
                <span className="font-medium">
                  {new Date(account.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {can('finance.bank_accounts', 'edit') && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Sửa
                </button>
              )}
              {can('finance.bank_accounts', 'delete') && (
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Xóa
                </button>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Số tài khoản</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chủ tài khoản</label>
              <input
                type="text"
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngân hàng</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chi nhánh NH</label>
              <input
                type="text"
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số dư</label>
              <input
                type="number"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
