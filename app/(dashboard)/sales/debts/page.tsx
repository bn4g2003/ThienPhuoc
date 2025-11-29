'use client';

import PartnerDebtSidePanel from '@/components/PartnerDebtSidePanel';
import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useEffect, useState } from 'react';

interface CustomerSummary {
  id: number;
  customerCode: string;
  customerName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  unpaidOrders: number;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
}

interface User {
  id: number;
  username: string;
  roleCode: string;
  branchId: number | null;
}

export default function CustomerDebtsPage() {
  const { can } = usePermissions();
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<{
    id: number;
    name: string;
    code: string;
    type: 'customer';
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    totalOrders: number;
    unpaidOrders: number;
  } | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(false);

  const [filterQueries, setFilterQueries] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchCurrentUser();
    fetchBranches();
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchCustomerSummaries();
    }
  }, [selectedBranchId, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data.user);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const isAdmin = currentUser?.roleCode === 'ADMIN';

  const fetchCustomerSummaries = async () => {
    try {
      const branchParam = selectedBranchId !== 'all' ? `&branchId=${selectedBranchId}` : '';
      const res = await fetch(`/api/finance/debts/summary?type=customers${branchParam}`);
      const data = await res.json();
      if (data.success) setCustomerSummaries(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/finance/bank-accounts?isActive=true');
      const data = await res.json();
      if (data.success) setBankAccounts(data.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleViewPartnerDetails = (customer: CustomerSummary) => {
    setSelectedPartner({
      id: customer.id,
      name: customer.customerName,
      code: customer.customerCode,
      type: 'customer',
      totalAmount: parseFloat(customer.totalAmount.toString()),
      paidAmount: parseFloat(customer.paidAmount.toString()),
      remainingAmount: parseFloat(customer.remainingAmount.toString()),
      totalOrders: customer.totalOrders,
      unpaidOrders: customer.unpaidOrders,
    });
    setShowSidePanel(true);
  };

  const filteredCustomerSummaries = customerSummaries.filter(c => {
    const searchKey = 'search,customerCode,customerName,phone';
    const searchValue = filterQueries[searchKey] || '';
    const matchSearch = !searchValue || 
      c.customerCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchValue.toLowerCase()) ||
      c.phone?.includes(searchValue);
    
    const hasDebtValue = filterQueries['hasDebt'];
    const matchDebt = hasDebtValue === undefined || 
      (hasDebtValue === 'true' ? c.remainingAmount > 0 : c.remainingAmount === 0);
    
    return matchSearch && matchDebt;
  });

  const totalReceivable = filteredCustomerSummaries.reduce((sum, c) => sum + parseFloat(c.remainingAmount?.toString() || '0'), 0);

  return (
    <>
      <WrapperContent
        title="Công nợ khách hàng"
        isNotAccessible={!can('finance.debts', 'view')}
        isLoading={loading}
        header={{
          refetchDataWithKeys: ['debts', 'customers'],
          customToolbar: (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Select
                  style={{ width: 200 }}
                  placeholder="Chọn chi nhánh"
                  value={selectedBranchId}
                  onChange={(value) => setSelectedBranchId(value)}
                  options={[
                    { label: 'Tất cả chi nhánh', value: 'all' },
                    ...branches.map((b) => ({
                      label: b.branchName,
                      value: b.id,
                    })),
                  ]}
                />
              )}
              <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
                <UploadOutlined /> Nhập Excel
              </button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
                <DownloadOutlined /> Xuất Excel
              </button>
            </div>
          ),
          searchInput: {
            placeholder: 'Tìm theo mã KH, tên, SĐT...',
            filterKeys: ['customerCode', 'customerName', 'phone'],
          },
          filters: {
            fields: [
              {
                type: 'select',
                name: 'hasDebt',
                label: 'Công nợ',
                options: [
                  { label: 'Có công nợ', value: 'true' },
                  { label: 'Đã thanh toán', value: 'false' },
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
            },
            query: filterQueries,
          },
        }}
      >
        <div className="flex">
          <div className={`flex-1 transition-all duration-300 ${showSidePanel ? 'mr-[600px]' : ''}`}>
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="text-sm text-green-600 mb-1">Tổng phải thu</div>
                <div className="text-3xl font-bold text-green-700">
                  {totalReceivable.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {filteredCustomerSummaries.length} khách hàng
                </div>
              </div>

              {/* Customer Summary Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã KH</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liên hệ</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Số ĐH</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Đã trả</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Còn nợ</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCustomerSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          Không có khách hàng nào có đơn hàng
                        </td>
                      </tr>
                    ) : (
                      filteredCustomerSummaries.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {customer.customerCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="font-medium">{customer.customerName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div>📞 {customer.phone}</div>
                            {customer.email && <div className="text-xs">✉️ {customer.email}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div>{customer.totalOrders} đơn</div>
                            {customer.unpaidOrders > 0 && (
                              <div className="text-xs text-orange-600">{customer.unpaidOrders} chưa TT</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {parseFloat(customer.totalAmount.toString()).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                            {parseFloat(customer.paidAmount.toString()).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-orange-700">
                            {parseFloat(customer.remainingAmount.toString()).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleViewPartnerDetails(customer)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          {showSidePanel && selectedPartner && (
            <PartnerDebtSidePanel
              partnerId={selectedPartner.id}
              partnerName={selectedPartner.name}
              partnerCode={selectedPartner.code}
              partnerType={selectedPartner.type}
              totalAmount={selectedPartner.totalAmount}
              paidAmount={selectedPartner.paidAmount}
              remainingAmount={selectedPartner.remainingAmount}
              totalOrders={selectedPartner.totalOrders}
              unpaidOrders={selectedPartner.unpaidOrders}
              bankAccounts={bankAccounts}
              canEdit={can('finance.debts', 'edit')}
              onClose={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
              }}
              onPaymentSuccess={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
                fetchCustomerSummaries();
              }}
            />
          )}
        </div>
      </WrapperContent>
    </>
  );
}
