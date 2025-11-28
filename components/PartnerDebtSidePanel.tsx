import React, { useState } from 'react';

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
}

interface Props {
  partnerId: number;
  partnerName: string;
  partnerCode: string;
  partnerType: 'customer' | 'supplier';
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalOrders: number;
  unpaidOrders: number;
  bankAccounts: BankAccount[];
  canEdit: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function PartnerDebtSidePanel({
  partnerId,
  partnerName,
  partnerCode,
  partnerType,
  totalAmount,
  paidAmount,
  remainingAmount,
  totalOrders,
  unpaidOrders,
  bankAccounts,
  canEdit,
  onClose,
  onPaymentSuccess,
}: Props) {
  const [paymentFormData, setPaymentFormData] = useState({
    paymentAmount: remainingAmount.toString(),
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH' as 'CASH' | 'BANK' | 'TRANSFER',
    bankAccountId: '',
    notes: '',
  });

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/finance/debts/partners/${partnerId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentFormData,
          paymentAmount: parseFloat(paymentFormData.paymentAmount),
          bankAccountId: paymentFormData.bankAccountId ? parseInt(paymentFormData.bankAccountId) : null,
          partnerType,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Thanh toán thành công!');
        
        // Hỏi có muốn in phiếu không
        if (confirm('Bạn có muốn in phiếu thanh toán không?')) {
          const paymentId = Date.now();
          const params = new URLSearchParams({
            type: partnerType,
            amount: paymentFormData.paymentAmount,
            date: paymentFormData.paymentDate,
            method: paymentFormData.paymentMethod,
            notes: paymentFormData.notes || '',
          });
          
          if (paymentFormData.bankAccountId) {
            params.append('bankAccountId', paymentFormData.bankAccountId);
          }
          
          window.open(`/api/finance/debts/partners/${partnerId}/payment/${paymentId}/pdf?${params.toString()}`, '_blank');
        }
        
        setPaymentFormData({
          paymentAmount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'CASH',
          bankAccountId: '',
          notes: '',
        });
        onPaymentSuccess();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xl font-bold">
            Công nợ - {partnerName}
          </h2>
          <p className="text-sm text-gray-600">{partnerCode}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-3">
            Tổng hợp công nợ {partnerType === 'customer' ? 'khách hàng' : 'nhà cung cấp'}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div className="bg-white p-3 rounded border">
              <div className="text-xs text-gray-600">Tổng tiền</div>
              <div className="font-bold text-lg">
                {totalAmount.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <div className="text-xs text-green-600">Đã trả</div>
              <div className="font-bold text-lg text-green-700">
                {paidAmount.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <div className="text-xs text-orange-600">Còn nợ</div>
              <div className="font-bold text-lg text-orange-700">
                {remainingAmount.toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600 pt-3 border-t">
            <span>Tổng số {partnerType === 'customer' ? 'đơn hàng' : 'đơn mua'}: <span className="font-medium text-gray-900">{totalOrders}</span></span>
            {unpaidOrders > 0 && (
              <span className="text-orange-600">
                Chưa thanh toán: <span className="font-medium">{unpaidOrders}</span>
              </span>
            )}
          </div>
        </div>

        {/* Payment Form */}
        {canEdit && remainingAmount > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-4">Thanh toán công nợ</h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Số tiền thanh toán *</label>
                <input
                  type="number"
                  value={paymentFormData.paymentAmount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentAmount: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                  min="0"
                  max={remainingAmount}
                  step="0.01"
                  placeholder={`Tối đa: ${remainingAmount.toLocaleString('vi-VN')} đ`}
                />
                <div className="mt-1 text-xs text-gray-500">
                  Số tiền còn nợ: {remainingAmount.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ngày thanh toán *</label>
                <input
                  type="date"
                  value={paymentFormData.paymentDate}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phương thức *</label>
                <select
                  value={paymentFormData.paymentMethod}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK">Ngân hàng</option>
                  <option value="TRANSFER">Chuyển khoản</option>
                </select>
              </div>

              {(paymentFormData.paymentMethod === 'BANK' || paymentFormData.paymentMethod === 'TRANSFER') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Tài khoản ngân hàng *</label>
                  <select
                    value={paymentFormData.bankAccountId}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, bankAccountId: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    <option value="">-- Chọn tài khoản --</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="Ghi chú về khoản thanh toán này..."
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Xác nhận thanh toán
              </button>
            </form>
          </div>
        )}

        {remainingAmount === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-green-700 font-medium">✓ Đã thanh toán đủ</div>
            <div className="text-sm text-green-600 mt-1">
              {partnerType === 'customer' ? 'Khách hàng' : 'Nhà cung cấp'} này không còn công nợ
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-2">💡 Lưu ý:</div>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Số tiền thanh toán sẽ được ghi vào sổ quỹ</li>
              <li>Công nợ sẽ tự động giảm sau khi thanh toán</li>
              <li>Nếu thanh toán qua ngân hàng, số dư TK sẽ được cập nhật</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
