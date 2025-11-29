'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface FinancialSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  totalReceivable: number;
  totalPayable: number;
  cashBalance: number;
  bankBalance: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

interface CategoryData {
  name: string;
  value: number;
  type: 'THU' | 'CHI';
  [key: string]: string | number;
}

interface CashFlowData {
  date: string;
  cashIn: number;
  cashOut: number;
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

export default function FinanceReportsPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    totalReceivable: 0,
    totalPayable: 0,
    cashBalance: 0,
    bankBalance: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (!can('finance.reports', 'view')) {
      setLoading(false);
      return;
    }
    if (currentUser) {
      fetchReportData();
    }
  }, [dateRange, selectedBranchId, currentUser]);

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

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const branchParam = selectedBranchId !== 'all' ? `&branchId=${selectedBranchId}` : '';
      
      // Fetch summary
      const summaryRes = await fetch(`/api/finance/reports/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${branchParam}`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // Fetch monthly trend
      const monthlyRes = await fetch(`/api/finance/reports/monthly?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${branchParam}`);
      const monthlyDataRes = await monthlyRes.json();
      if (monthlyDataRes.success) {
        setMonthlyData(monthlyDataRes.data);
      }

      // Fetch category breakdown
      const categoryRes = await fetch(`/api/finance/reports/categories?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const categoryDataRes = await categoryRes.json();
      if (categoryDataRes.success) {
        setCategoryData(categoryDataRes.data);
      }

      // Fetch cash flow
      const cashFlowRes = await fetch(`/api/finance/reports/cashflow?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const cashFlowDataRes = await cashFlowRes.json();
      if (cashFlowDataRes.success) {
        setCashFlowData(cashFlowDataRes.data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    alert('Chức năng xuất PDF đang được phát triển');
  };

  const handleRefresh = () => {
    fetchReportData();
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const revenueCategories = categoryData.filter(c => c.type === 'THU');
  const expenseCategories = categoryData.filter(c => c.type === 'CHI');

  return (
    <>
      <WrapperContent
        title="Báo cáo tài chính"
        isNotAccessible={!can('finance.reports', 'view')}
        isLoading={loading}
        header={{
          customToolbar: isAdmin ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 border rounded"
                style={{ width: 200 }}
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>
          ) : undefined,
          buttonEnds: [
            {
              type: 'default',
              name: 'Làm mới',
              onClick: handleRefresh,
              icon: <ReloadOutlined />,
            },
            {
              type: 'primary',
              name: 'Xuất PDF',
              onClick: handleExportPDF,
              icon: <DownloadOutlined />,
            },
          ],
        }}
      >
        <div className="space-y-6">
          {/* Date Range Filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <button
                onClick={fetchReportData}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Áp dụng
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600 mb-1">Tổng thu</div>
              <div className="text-2xl font-bold text-green-700">
                {summary.totalRevenue.toLocaleString()} đ
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="text-sm text-red-600 mb-1">Tổng chi</div>
              <div className="text-2xl font-bold text-red-700">
                {summary.totalExpense.toLocaleString()} đ
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Lợi nhuận</div>
              <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {summary.netProfit.toLocaleString()} đ
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-600 mb-1">Tổng tiền mặt & NH</div>
              <div className="text-2xl font-bold text-purple-700">
                {(summary.cashBalance + summary.bankBalance).toLocaleString()} đ
              </div>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Xu hướng thu chi theo tháng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Thu" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" name="Chi" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#3B82F6" name="Lợi nhuận" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue vs Expense Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">So sánh thu chi</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                <Legend />
                <Bar dataKey="revenue" fill="#10B981" name="Thu" />
                <Bar dataKey="expense" fill="#EF4444" name="Chi" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown - Pie Charts */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Cơ cấu thu nhập</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Cơ cấu chi phí</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cash Flow Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Dòng tiền</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                <Legend />
                <Area type="monotone" dataKey="cashIn" stackId="1" stroke="#10B981" fill="#10B981" name="Tiền vào" />
                <Area type="monotone" dataKey="cashOut" stackId="2" stroke="#EF4444" fill="#EF4444" name="Tiền ra" />
                <Area type="monotone" dataKey="balance" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Số dư" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Debt Summary */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Công nợ phải thu</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">
                  {summary.totalReceivable.toLocaleString()} đ
                </div>
                <div className="text-sm text-gray-600">Tổng công nợ khách hàng</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Công nợ phải trả</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-red-600 mb-2">
                  {summary.totalPayable.toLocaleString()} đ
                </div>
                <div className="text-sm text-gray-600">Tổng công nợ nhà cung cấp</div>
              </div>
            </div>
          </div>

          {/* Financial Health Indicators */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Chỉ số tài chính</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600 mb-2">Tỷ suất lợi nhuận</div>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.totalRevenue > 0 
                    ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) 
                    : 0}%
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600 mb-2">Tiền mặt</div>
                <div className="text-2xl font-bold text-green-600">
                  {summary.cashBalance.toLocaleString()} đ
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600 mb-2">Tiền ngân hàng</div>
                <div className="text-2xl font-bold text-purple-600">
                  {summary.bankBalance.toLocaleString()} đ
                </div>
              </div>
            </div>
          </div>
        </div>
      </WrapperContent>
    </>
  );
}
