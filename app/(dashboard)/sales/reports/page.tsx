'use client';

import WrapperContent from '@/components/WrapperContent';
import { usePermissions } from '@/hooks/usePermissions';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import {
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

interface SalesSummary {
  totalOrders: number;
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  completedOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  waitingMaterialOrders: number;
  inProductionOrders: number;
  cancelledOrders: number;
  topCustomers: Array<{
    id: number;
    customerCode: string;
    customerName: string;
    totalOrders: number;
    totalAmount: number;
  }>;
  topProducts: Array<{
    id: number;
    productCode: string;
    productName: string;
    unit: string;
    totalQuantity: number;
    totalAmount: number;
  }>;
}

interface MonthlyData {
  month: string;
  orders: number;
  revenue: number;
  paid: number;
  unpaid: number;
}

interface DailyData {
  date: string;
  orders: number;
  revenue: number;
  paid: number;
  unpaid: number;
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

export default function SalesReportsPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<SalesSummary>({
    totalOrders: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    completedOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    waitingMaterialOrders: 0,
    inProductionOrders: 0,
    cancelledOrders: 0,
    topCustomers: [],
    topProducts: [],
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (!can('sales.orders', 'view')) {
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
      const summaryRes = await fetch(`/api/sales/reports/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${branchParam}`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // Fetch monthly trend
      const monthlyRes = await fetch(`/api/sales/reports/monthly?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${branchParam}`);
      const monthlyDataRes = await monthlyRes.json();
      if (monthlyDataRes.success) {
        setMonthlyData(monthlyDataRes.data);
      }

      // Fetch daily trend
      const dailyRes = await fetch(`/api/sales/reports/daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}${branchParam}`);
      const dailyDataRes = await dailyRes.json();
      if (dailyDataRes.success) {
        setDailyData(dailyDataRes.data);
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

  const orderStatusData = [
    { name: 'Hoàn thành', value: summary.completedOrders, color: '#10B981' },
    { name: 'Đang sản xuất', value: summary.inProductionOrders, color: '#8B5CF6' },
    { name: 'Chờ nguyên liệu', value: summary.waitingMaterialOrders, color: '#F97316' },
    { name: 'Đã xác nhận', value: summary.confirmedOrders, color: '#3B82F6' },
    { name: 'Chờ xác nhận', value: summary.pendingOrders, color: '#F59E0B' },
    { name: 'Đã hủy', value: summary.cancelledOrders, color: '#EF4444' },
  ].filter(item => item.value > 0);

  return (
    <>
      <WrapperContent
        title="Báo cáo bán hàng"
        isNotAccessible={!can('sales.orders', 'view')}
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
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Tổng đơn hàng</div>
              <div className="text-2xl font-bold text-blue-700">
                {summary.totalOrders}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {summary.completedOrders} hoàn thành
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600 mb-1">Tổng doanh thu</div>
              <div className="text-2xl font-bold text-green-700">
                {summary.totalAmount.toLocaleString()} đ
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-600 mb-1">Đã thu</div>
              <div className="text-2xl font-bold text-purple-700">
                {summary.totalPaid.toLocaleString()} đ
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-orange-600 mb-1">Còn nợ</div>
              <div className="text-2xl font-bold text-orange-700">
                {summary.totalUnpaid.toLocaleString()} đ
              </div>
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Xu hướng doanh thu theo tháng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Doanh thu" strokeWidth={2} />
                <Line type="monotone" dataKey="paid" stroke="#8B5CF6" name="Đã thu" strokeWidth={2} />
                <Line type="monotone" dataKey="unpaid" stroke="#F59E0B" name="Còn nợ" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Doanh thu theo ngày</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                <Legend />
                <Bar dataKey="revenue" fill="#10B981" name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Trạng thái đơn hàng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Customers and Products */}
          <div className="grid grid-cols-2 gap-6">
            {/* Top Customers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top 10 khách hàng</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mã KH</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tên KH</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Số ĐH</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.topCustomers.map((customer, index) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          <span className="font-medium text-blue-600">#{index + 1}</span> {customer.customerCode}
                        </td>
                        <td className="px-4 py-2 text-sm">{customer.customerName}</td>
                        <td className="px-4 py-2 text-sm text-center">{customer.totalOrders}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-green-600">
                          {parseFloat(customer.totalAmount.toString()).toLocaleString()} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top 10 sản phẩm bán chạy</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mã SP</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tên SP</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">SL bán</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summary.topProducts.map((product, index) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">
                          <span className="font-medium text-blue-600">#{index + 1}</span> {product.productCode}
                        </td>
                        <td className="px-4 py-2 text-sm">{product.productName}</td>
                        <td className="px-4 py-2 text-sm text-center">
                          {parseFloat(product.totalQuantity.toString()).toLocaleString()} {product.unit}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-green-600">
                          {parseFloat(product.totalAmount.toString()).toLocaleString()} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </WrapperContent>
    </>
  );
}
