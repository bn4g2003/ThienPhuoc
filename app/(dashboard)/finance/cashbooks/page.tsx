'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import WrapperContent from '@/components/WrapperContent';
import { PlusOutlined, DownloadOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import Modal from '@/components/Modal';
import CashbookSidePanel from '@/components/CashbookSidePanel';

interface CashBook {
  id: number;
  transactionCode: string;
  transactionDate: string;
  amount: number;
  transactionType: 'THU' | 'CHI';
  paymentMethod: 'CASH' | 'BANK' | 'TRANSFER';
  description: string;
  categoryName: string;
  categoryCode: string;
  categoryId: number;
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountId?: number;
  createdByName: string;
  branchName: string;
  createdAt: string;
}

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: 'THU' | 'CHI';
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

export default function CashBooksPage() {
  const { can } = usePermissions();
  const [cashbooks, setCashbooks] = useState<CashBook[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCashbook, setSelectedCashbook] = useState<CashBook | null>(null);
  
  const [filterType, setFilterType] = useState<'ALL' | 'THU' | 'CHI'>('ALL');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'ALL' | 'CASH' | 'BANK' | 'TRANSFER'>('ALL');
  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    transactionCode: '',
    transactionDate: new Date().toISOString().split('T')[0],
    financialCategoryId: '',
    amount: '',
    transactionType: 'THU' as 'THU' | 'CHI',
    paymentMethod: 'CASH' as 'CASH' | 'BANK' | 'TRANSFER',
    bankAccountId: '',
    description: '',
  });

  useEffect(() => {
    fetchCashbooks();
    fetchCategories();
    fetchBankAccounts();
  }, []);

  const fetchCashbooks = async () => {
    try {
      const res = await fetch('/api/finance/cashbooks');
      const data = await res.json();
      if (data.success) {
        setCashbooks(data.data);
      }
    } catch (error) {
      console.error('Error fetching cashbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/finance/categories?isActive=true');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/finance/bank-accounts?isActive=true');
      const data = await res.json();
      if (data.success) {
        setBankAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/finance/cashbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          financialCategoryId: parseInt(formData.financialCategoryId),
          bankAccountId: formData.bankAccountId ? parseInt(formData.bankAccountId) : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Tạo phiếu thu/chi thành công!');
        setShowModal(false);
        resetForm();
        fetchCashbooks();
        fetchBankAccounts(); // Refresh để cập nhật số dư
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving cashbook:', error);
      alert('Có lỗi xảy ra');
    }
  };



  const resetForm = () => {
    setFormData({
      transactionCode: '',
      transactionDate: new Date().toISOString().split('T')[0],
      financialCategoryId: '',
      amount: '',
      transactionType: 'THU',
      paymentMethod: 'CASH',
      bankAccountId: '',
      description: '',
    });
  };

  const handleResetAll = () => {
    setFilterQueries({});
    setSearchTerm('');
    setFilterType('ALL');
    setFilterPaymentMethod('ALL');
  };

  const handleExportExcel = () => {
    alert('Chức năng xuất Excel đang được phát triển');
  };

  const handleImportExcel = () => {
    alert('Chức năng nhập Excel đang được phát triển');
  };

  const filteredCashbooks = cashbooks.filter(cb => {
    const searchKey = 'search,transactionCode,categoryName,description';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue || 
      cb.transactionCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      cb.categoryName.toLowerCase().includes(searchValue.toLowerCase()) ||
      cb.description?.toLowerCase().includes(searchValue.toLowerCase());
    
    const typeValue = filterQueries['transactionType'];
    const matchType = !typeValue || cb.transactionType === typeValue;
    
    const methodValue = filterQueries['paymentMethod'];
    const matchMethod = !methodValue || cb.paymentMethod === methodValue;
    
    return matchSearch && matchType && matchMethod;
  });

  const totalThu = filteredCashbooks
    .filter(cb => cb.transactionType === 'THU')
    .reduce((sum, cb) => sum + parseFloat(cb.amount.toString()), 0);

  const totalChi = filteredCashbooks
    .filter(cb => cb.transactionType === 'CHI')
    .reduce((sum, cb) => sum + parseFloat(cb.amount.toString()), 0);

  const filteredCategories = categories.filter(cat => cat.type === formData.transactionType);

  return (
    <>
      <WrapperContent<CashBook>
        title="Sổ quỹ"
        isNotAccessible={!can('finance.cashbooks', 'view')}
        isLoading={loading}
        header={{
          buttonEnds: can('finance.cashbooks', 'create')
            ? [
                {
                  type: 'default',
                  name: 'Đặt lại',
                  onClick: handleResetAll,
                  icon: <ReloadOutlined />,
                },
                {
                  type: 'primary',
                  name: 'Thêm',
                  onClick: () => {
                    resetForm();
                    setShowModal(true);
                  },
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
          searchInput: {
            placeholder: 'Tìm theo mã GD, danh mục, mô tả...',
            filterKeys: ['transactionCode', 'categoryName', 'description'],
          },
          filters: {
            fields: [
              {
                type: 'select',
                name: 'transactionType',
                label: 'Loại',
                options: [
                  { label: 'Thu', value: 'THU' },
                  { label: 'Chi', value: 'CHI' },
                ],
              },
              {
                type: 'select',
                name: 'paymentMethod',
                label: 'Phương thức',
                options: [
                  { label: 'Tiền mặt', value: 'CASH' },
                  { label: 'Ngân hàng', value: 'BANK' },
                  { label: 'Chuyển khoản', value: 'TRANSFER' },
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
              setFilterType('ALL');
              setFilterPaymentMethod('ALL');
            },
            query: filterQueries,
          },
        }}
      >
        <div className="space-y-6">

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 mb-1">Tổng thu</div>
              <div className="text-2xl font-bold text-green-700">
                {totalThu.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-sm text-red-600 mb-1">Tổng chi</div>
              <div className="text-2xl font-bold text-red-700">
                {totalChi.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Chênh lệch</div>
              <div className={`text-2xl font-bold ${totalThu - totalChi >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {(totalThu - totalChi).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã GD</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phương thức</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCashbooks.map((cb) => (
              <tr 
                key={cb.id}
                onClick={() => setSelectedCashbook(cb)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{cb.transactionCode}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(cb.transactionDate).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{cb.categoryName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    cb.transactionType === 'THU' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {cb.transactionType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  {parseFloat(cb.amount.toString()).toLocaleString('vi-VN')} đ
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {cb.paymentMethod === 'CASH' ? 'Tiền mặt' : cb.paymentMethod === 'BANK' ? 'Ngân hàng' : 'Chuyển khoản'}
                  </span>
                  {cb.bankAccountNumber && (
                    <div className="text-xs text-gray-500 mt-1">
                      {cb.bankName} - {cb.bankAccountNumber}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{cb.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </div>
      </WrapperContent>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Thêm phiếu thu/chi"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mã giao dịch *</label>
              <input
                type="text"
                value={formData.transactionCode}
                onChange={(e) => setFormData({ ...formData, transactionCode: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ngày giao dịch *</label>
              <input
                type="date"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Loại *</label>
            <select
              value={formData.transactionType}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as 'THU' | 'CHI', financialCategoryId: '' })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="THU">Thu</option>
              <option value="CHI">Chi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Danh mục *</label>
            <select
              value={formData.financialCategoryId}
              onChange={(e) => setFormData({ ...formData, financialCategoryId: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">-- Chọn danh mục --</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Số tiền *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phương thức thanh toán *</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="CASH">Tiền mặt</option>
              <option value="BANK">Ngân hàng</option>
              <option value="TRANSFER">Chuyển khoản</option>
            </select>
          </div>

          {(formData.paymentMethod === 'BANK' || formData.paymentMethod === 'TRANSFER') && (
            <div>
              <label className="block text-sm font-medium mb-1">Tài khoản ngân hàng *</label>
              <select
                value={formData.bankAccountId}
                onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Chọn tài khoản --</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.accountNumber} (Số dư: {acc.balance.toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Tạo mới
            </button>
          </div>
        </form>
      </Modal>

      {/* Side Panel */}
      {selectedCashbook && (
        <CashbookSidePanel
          cashbook={selectedCashbook}
          onClose={() => setSelectedCashbook(null)}
        />
      )}
    </>
  );
}
