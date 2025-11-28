"use client";

import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Statistic, Row, Col } from "antd";
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
} from "recharts";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";

import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";

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
  const { query, updateQuery, updateQueries, reset } = useFilter();

  // Get current user for admin check
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      return data.success ? data.data.user : null;
    },
  });

  // Get branches for admin filter
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: currentUser?.roleCode === "ADMIN",
  });

  // Get report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["sales-reports", query],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          qs.append(key, String(value));
        }
      });

      const res = await fetch(`/api/sales/reports?${qs}`);
      const data = await res.json();
      return data.success ? data.data : null;
    },
    enabled: can("sales.orders", "view"),
  });

  const summary = reportData?.summary || {
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
  };

  const monthlyData = reportData?.monthlyData || [];
  const dailyData = reportData?.dailyData || [];

  const isAdmin = currentUser?.roleCode === "ADMIN";

  const handleExportPDF = () => {
    alert("Chức năng xuất PDF đang được phát triển");
  };

  const handleRefresh = () => {
    // TanStack Query will automatically refetch
  };

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  const orderStatusData = [
    { name: "Hoàn thành", value: summary.completedOrders, color: "#10B981" },
    {
      name: "Đang sản xuất",
      value: summary.inProductionOrders,
      color: "#8B5CF6",
    },
    {
      name: "Chờ nguyên liệu",
      value: summary.waitingMaterialOrders,
      color: "#F97316",
    },
    { name: "Đã xác nhận", value: summary.confirmedOrders, color: "#3B82F6" },
    { name: "Chờ xác nhận", value: summary.pendingOrders, color: "#F59E0B" },
    { name: "Đã hủy", value: summary.cancelledOrders, color: "#EF4444" },
  ].filter((item) => item.value > 0);

  return (
    <>
      <WrapperContent
        title="Báo cáo bán hàng"
        isNotAccessible={!can("sales.orders", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["sales-reports"],
          buttonEnds: [
            {
              type: "default",
              name: "Làm mới",
              onClick: handleRefresh,
              icon: <ReloadOutlined />,
            },
            {
              type: "primary",
              name: "Xuất PDF",
              onClick: handleExportPDF,
              icon: <DownloadOutlined />,
            },
          ],
          filters: {
            fields: [
              ...(isAdmin
                ? [
                    {
                      type: "select" as const,
                      name: "branchId",
                      label: "Chi nhánh",
                      options: [
                        { label: "Tất cả chi nhánh", value: "all" },
                        ...branches.map((b: any) => ({
                          label: b.branchName,
                          value: b.id.toString(),
                        })),
                      ],
                    },
                  ]
                : []),
              {
                type: "date" as const,
                name: "startDate",
                label: "Từ ngày",
              },
              {
                type: "date" as const,
                name: "endDate",
                label: "Đến ngày",
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Summary Cards */}
          <Card>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title="Tổng đơn hàng"
                  value={summary.totalOrders}
                  suffix="đơn"
                  styles={{
                    content: { color: "#1890ff" },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title="Tổng doanh thu"
                  value={summary.totalAmount}
                  suffix="đ"
                  styles={{
                    content: { color: "#52c41a" },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title="Đã thu"
                  value={summary.totalPaid}
                  suffix="đ"
                  styles={{
                    content: { color: "#8B5CF6" },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Statistic
                  title="Còn nợ"
                  value={summary.totalUnpaid}
                  suffix="đ"
                  styles={{
                    content: { color: "#F97316" },
                  }}
                />
              </Col>
            </Row>
          </Card>

          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Xu hướng doanh thu theo tháng
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString() + " đ"}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  name="Doanh thu"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="paid"
                  stroke="#8B5CF6"
                  name="Đã thu"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="unpaid"
                  stroke="#F59E0B"
                  name="Còn nợ"
                  strokeWidth={2}
                />
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
                <Tooltip
                  formatter={(value: number) => value.toLocaleString() + " đ"}
                />
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
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
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
          <Row gutter={24}>
            {/* Top Customers */}
            <Col xs={24} lg={12}>
              <Card title="Top 10 khách hàng">
                <CommonTable
                  dataSource={summary.topCustomers.map(
                    (customer: any, index: number) => ({
                      ...customer,
                      rank: index + 1,
                      totalAmount: parseFloat(customer.totalAmount.toString()),
                    })
                  )}
                  columns={[
                    {
                      title: "Xếp hạng",
                      dataIndex: "rank",
                      key: "rank",
                      width: 80,
                      align: "center",
                      render: (value: number) => `#${value}`,
                    },
                    {
                      title: "Mã KH",
                      dataIndex: "customerCode",
                      key: "customerCode",
                      width: 100,
                    },
                    {
                      title: "Tên KH",
                      dataIndex: "customerName",
                      key: "customerName",
                      width: 150,
                    },
                    {
                      title: "Số ĐH",
                      dataIndex: "totalOrders",
                      key: "totalOrders",
                      width: 80,
                      align: "center",
                    },
                    {
                      title: "Doanh thu",
                      dataIndex: "totalAmount",
                      key: "totalAmount",
                      width: 120,
                      align: "right",
                      render: (value: number) => `${value.toLocaleString()} đ`,
                    },
                  ]}
                  pagination={{
                    current: 1,
                    pageSize: 10,
                    limit: 10,
                    onChange: () => {},
                  }}
                  paging={false}
                  loading={isLoading}
                />
              </Card>
            </Col>

            {/* Top Products */}
            <Col xs={24} lg={12}>
              <Card title="Top 10 sản phẩm bán chạy">
                <CommonTable
                  dataSource={summary.topProducts.map(
                    (product: any, index: number) => ({
                      ...product,
                      rank: index + 1,
                      totalQuantity: parseFloat(product.totalQuantity.toString()),
                      totalAmount: parseFloat(product.totalAmount.toString()),
                    })
                  )}
                  columns={[
                    {
                      title: "Xếp hạng",
                      dataIndex: "rank",
                      key: "rank",
                      width: 80,
                      align: "center",
                      render: (value: number) => `#${value}`,
                    },
                    {
                      title: "Mã SP",
                      dataIndex: "productCode",
                      key: "productCode",
                      width: 100,
                    },
                    {
                      title: "Tên SP",
                      dataIndex: "productName",
                      key: "productName",
                      width: 150,
                    },
                    {
                      title: "SL bán",
                      dataIndex: "totalQuantity",
                      key: "totalQuantity",
                      width: 100,
                      align: "right",
                      render: (value: number, record: any) =>
                        `${value.toLocaleString()} ${record.unit}`,
                    },
                    {
                      title: "Doanh thu",
                      dataIndex: "totalAmount",
                      key: "totalAmount",
                      width: 120,
                      align: "right",
                      render: (value: number) => `${value.toLocaleString()} đ`,
                    },
                  ]}
                  pagination={{
                    current: 1,
                    pageSize: 10,
                    limit: 10,
                    onChange: () => {},
                  }}
                  paging={false}
                  loading={isLoading}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </WrapperContent>
    </>
  );
}
