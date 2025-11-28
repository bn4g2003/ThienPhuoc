"use client";

import {
  DownloadOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Row, Col, Statistic } from "antd";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";

import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";

interface Order {
  id: number;
  orderCode: string;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  finalAmount: number;
  status: string;
  createdBy: string;
}

export default function OrdersPage() {
  const { can } = usePermissions();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders", query],
    queryFn: async () => {
      const res = await fetch("/api/sales/orders");
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  const filteredOrders = applyFilter(orders);

  const { exportToXlsx } = useFileExport([
    { title: "Mã đơn", dataIndex: "orderCode", key: "orderCode" },
    { title: "Khách hàng", dataIndex: "customerName", key: "customerName" },
    { title: "Ngày đặt", dataIndex: "orderDate", key: "orderDate" },
    { title: "Tổng tiền", dataIndex: "totalAmount", key: "totalAmount" },
    { title: "Thành tiền", dataIndex: "finalAmount", key: "finalAmount" },
    { title: "Trạng thái", dataIndex: "status", key: "status" },
    { title: "Người tạo", dataIndex: "createdBy", key: "createdBy" },
  ]);

  const handleExportExcel = () => {
    exportToXlsx(filteredOrders, "orders");
  };

  const handleImportExcel = () => {
    alert("Chức năng nhập Excel đang được phát triển");
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Đã xác nhận",
      WAITING_MATERIAL: "Chờ nguyên liệu",
      IN_PRODUCTION: "Đang sản xuất",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };
    return statusMap[status] || status;
  };

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce(
    (sum, order) => sum + (order.finalAmount || 0),
    0
  );

  return (
    <>
      <WrapperContent<Order>
        title="Quản lý đơn hàng"
        isNotAccessible={!can("sales.orders", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["orders"],
          buttonEnds: can("sales.orders", "create")
            ? [
                {
                  type: "default",
                  name: "Đặt lại",
                  onClick: () => reset(),
                  icon: <ReloadOutlined />,
                },
                {
                  type: "default",
                  name: "Xuất Excel",
                  onClick: handleExportExcel,
                  icon: <DownloadOutlined />,
                },
                {
                  type: "default",
                  name: "Nhập Excel",
                  onClick: handleImportExcel,
                  icon: <UploadOutlined />,
                },
              ]
            : [
                {
                  type: "default",
                  name: "Đặt lại",
                  onClick: () => reset(),
                  icon: <ReloadOutlined />,
                },
              ],
          searchInput: {
            placeholder: "Tìm theo mã đơn, khách hàng...",
            filterKeys: ["orderCode", "customerName"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "status",
                label: "Trạng thái",
                options: [
                  { label: "Chờ xác nhận", value: "PENDING" },
                  { label: "Đã xác nhận", value: "CONFIRMED" },
                  { label: "Chờ nguyên liệu", value: "WAITING_MATERIAL" },
                  { label: "Đang sản xuất", value: "IN_PRODUCTION" },
                  { label: "Hoàn thành", value: "COMPLETED" },
                  { label: "Đã hủy", value: "CANCELLED" },
                ],
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
        }}
      >
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Statistic
                  title="Tổng đơn hàng"
                  value={totalOrders}
                  suffix="đơn"
                  styles={{
                    content: { color: "#1890ff" },
                  }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Statistic
                  title="Tổng doanh thu"
                  value={totalRevenue}
                  suffix="đ"
                  styles={{
                    content: { color: "#52c41a" },
                  }}
                />
              </Col>
            </Row>
          </Card>

          <CommonTable
            pagination={{ ...pagination, onChange: handlePageChange }}
            columns={[
              {
                title: "Mã đơn",
                dataIndex: "orderCode",
                key: "orderCode",
                width: 120,
                fixed: "left",
                render: (value: string) => (
                  <span className="font-mono">{value}</span>
                ),
              },
              {
                title: "Khách hàng",
                dataIndex: "customerName",
                key: "customerName",
                width: 200,
              },
              {
                title: "Ngày đặt",
                dataIndex: "orderDate",
                key: "orderDate",
                width: 120,
                render: (value: string) =>
                  new Date(value).toLocaleDateString("vi-VN"),
              },
              {
                title: "Tổng tiền",
                dataIndex: "finalAmount",
                key: "finalAmount",
                width: 130,
                align: "right",
                render: (value: number) => `${value.toLocaleString("vi-VN")} đ`,
              },
              {
                title: "Trạng thái",
                dataIndex: "status",
                key: "status",
                width: 140,
                render: (value: string) => (
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      value === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : value === "CONFIRMED"
                        ? "bg-blue-100 text-blue-800"
                        : value === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {getStatusText(value)}
                  </span>
                ),
              },
              {
                title: "Thao tác",
                key: "action",
                width: 150,
                fixed: "right",
                render: () => (
                  <TableActions canView={can("sales.orders", "view")} />
                ),
              },
            ]}
            dataSource={filteredOrders}
            loading={isLoading}
            paging
            rank
          />
        </div>
      </WrapperContent>
    </>
  );
}
