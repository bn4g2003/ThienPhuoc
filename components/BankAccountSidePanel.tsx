'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/utils/format';
import { useRouter } from 'next/navigation';
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
  accountType?: 'BANK' | 'CASH';
}

interface Props {
  account: BankAccount;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BankAccountSidePanel({ account, onClose, onUpdate }: Props) {
  const { can } = usePermissions();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: account.accountNumber,
    accountHolder: account.accountHolder,
    bankName: account.bankName,
    branchName: account.branchName || '',
    balance: account.balance.toString(),
  });

  const isCash = account.accountType === 'CASH' || account.bankName === 'Tiền mặt';

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

  const handleToggleStatus = async () => {
    const action = account.isActive ? 'ngừng hoạt động' : 'kích hoạt';
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) return;
    try {
      const res = await fetch(`/api/finance/bank-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Đã ${action} tài khoản!`);
        onUpdate();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleViewDetail = () => {
    router.push(`/finance/bank-accounts/${account.id}`);
    onClose();
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      {/* Header với gradient */}
      <div className={`sticky top-0 z-10 ${isCash ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
        <div className="p-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{isCash ? '💵' : '🏦'}</div>
              <div>
                <div className="text-sm opacity-80">{isCash ? 'Quỹ tiền mặt' : 'Tài khoản ngân hàng'}</div>
                <div className="text-xl font-bold mt-1">{account.accountNumber}</div>
                <div className="text-sm opacity-80 mt-1">{account.accountHolder}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Số dư lớn */}
          <div className="mt-6 pt-4 border-t border-white/20">
            <div className="text-sm opacity-80">Số dư hiện tại</div>
            <div className="text-3xl font-bold mt-1">{formatCurrency(account.balance)}</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {!isEditing ? (
          <>
            {/* Chi tiết thông tin */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 mb-3">📋 Thông tin chi tiết</h3>

              {!isCash && (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-500">Ngân hàng</span>
                    <span className="font-medium text-gray-800">{account.bankName}</span>
                  </div>
                  {account.branchName && (
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-500">Chi nhánh NH</span>
                      <span className="font-medium text-gray-800">{account.branchName}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-500">Chi nhánh công ty</span>
                <span className="font-medium text-gray-800">{account.companyBranchName || 'Chưa có'}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-500">Loại</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${isCash ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                  {isCash ? '💵 Tiền mặt' : '🏦 Ngân hàng'}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-500">Trạng thái</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${account.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                  {account.isActive ? '● Hoạt động' : '○ Ngừng'}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-gray-500">Ngày tạo</span>
                <span className="font-medium text-gray-800">
                  {new Date(account.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Nút xem chi tiết */}
            <button
              onClick={handleViewDetail}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              📊 Xem lịch sử giao dịch chi tiết
            </button>

            {/* Các nút điều khiển */}
            <div className="grid grid-cols-3 gap-3">
              {can('finance.bank_accounts', 'edit') && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex flex-col items-center gap-1 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <span className="text-xl">✏️</span>
                  <span className="text-xs font-medium">Sửa</span>
                </button>
              )}
              <button
                onClick={handleToggleStatus}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${account.isActive
                    ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
              >
                <span className="text-xl">{account.isActive ? '⏸️' : '▶️'}</span>
                <span className="text-xs font-medium">{account.isActive ? 'Tạm ngừng' : 'Kích hoạt'}</span>
              </button>
              {can('finance.bank_accounts', 'delete') && (
                <button
                  onClick={handleDelete}
                  className="flex flex-col items-center gap-1 p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <span className="text-xl">🗑️</span>
                  <span className="text-xs font-medium">Xóa</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isCash ? 'Tên quỹ' : 'Số tài khoản'}
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isCash ? 'Người quản lý' : 'Chủ tài khoản'}
              </label>
              <input
                type="text"
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            {!isCash && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh NH</label>
                  <input
                    type="text"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số dư</label>
              <input
                type="number"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Lưu thay đổi
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
