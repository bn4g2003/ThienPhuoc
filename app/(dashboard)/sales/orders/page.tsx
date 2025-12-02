"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { PropRowDetails } from "@/types/table";
import { formatCurrency, formatQuantity } from "@/utils/format";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  TableColumnsType,
  Tag,
  Typography
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";

const { RangePicker } = DatePicker;

// Define interfaces
interface OrderItem {
  itemId?: number;
  materialId?: number;
  itemName: string;
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalAmount: number;
  notes: string;
  [key: string]: unknown; // Allow dynamic property access
}

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  customerGroupId?: number;
  groupName?: string;
  priceMultiplier?: number;
  debtAmount: number;
  isActive: boolean;
  createdAt: string;
}

interface Order {
  id: number;
  orderCode: string;
  customerId: number;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
  details?: OrderItem[];
  production?: {
    cutting: boolean;
    sewing: boolean;
    finishing: boolean;
    quality_check: boolean;
  };
}


interface MaterialSuggestion {
  materialId: number;
  materialCode: string;
  materialName: string;
  totalNeeded: number;
  unit: string;
  currentStock: number;
  needToImport: number;
  items?: {
    itemName?: string;
    productName?: string;
    quantity: number;
    materialPerItem?: number;
    bomQuantity?: number;
  }[];
}

// Order Detail Drawer Component
interface OrderDetailDrawerProps {
  orderId: number | null;
  canEdit: boolean;
  onUpdateStatus: (id: number, status: string, paymentData?: { paymentAmount: number; paymentMethod: string }) => void;
  onLoadMaterialSuggestion: (orderId: number) => void;
  onExportOrder: (order: Order) => void;
}

function OrderDetailDrawer({
  orderId,
  canEdit,
  onUpdateStatus,
  onLoadMaterialSuggestion,
  onExportOrder,
}: OrderDetailDrawerProps) {
  const [paymentForm] = Form.useForm();
  // Fetch order detail using TanStack Query
  const {
    data: orderData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orders", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await fetch(`/api/sales/orders/${orderId}`);
      const data = await res.json();
      return data.success ? data.data : null;
    },
    enabled: !!orderId,
  });

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

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Alert title="Có lỗi xảy ra khi tải dữ liệu" type="error" showIcon />
      </div>
    );
  }

  const data = orderData;

  return (
    <Space vertical size="large" style={{ width: "100%" }}>
      {/* Thông tin đơn hàng */}
      <Card title="Thông tin đơn hàng" size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Mã đơn">
            <Typography.Text code>{data.orderCode}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag
              color={
                data.status === "PENDING"
                  ? "orange"
                  : data.status === "CONFIRMED"
                    ? "blue"
                    : data.status === "WAITING_MATERIAL"
                      ? "orange"
                      : data.status === "IN_PRODUCTION"
                        ? "purple"
                        : data.status === "COMPLETED"
                          ? "green"
                          : "red"
              }
            >
              {getStatusText(data.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Khách hàng">
            {data.customerName}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày đặt">
            {new Date(data.orderDate).toLocaleDateString("vi-VN")}
          </Descriptions.Item>
          <Descriptions.Item label="Người tạo">
            {data.createdBy}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">
            <Typography.Text strong style={{ color: '#1890ff' }}>
              {formatCurrency(data.finalAmount)}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Đã thanh toán">
            <Typography.Text style={{ color: '#52c41a' }}>
              {formatCurrency(data.paidAmount || 0)}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Còn lại">
            <Typography.Text strong style={{ color: (data.finalAmount - (data.paidAmount || 0)) > 0 ? '#ff4d4f' : '#52c41a' }}>
              {formatCurrency(data.finalAmount - (data.paidAmount || 0))}
            </Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái TT">
            <Tag color={
              data.paymentStatus === 'PAID' ? 'green' :
                data.paymentStatus === 'PARTIAL' ? 'orange' : 'red'
            }>
              {data.paymentStatus === 'PAID' ? 'Đã thanh toán' :
                data.paymentStatus === 'PARTIAL' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        {data.notes && (
          <div style={{ marginTop: 16 }}>
            <Typography.Text strong>Ghi chú:</Typography.Text> {data.notes}
          </div>
        )}

        {/* Payment Form - only show if order is not cancelled/completed and user can edit */}
        {canEdit && data.status !== 'CANCELLED' && data.status !== 'COMPLETED' && (data.finalAmount - (data.paidAmount || 0)) > 0 && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Typography.Text strong style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>
              💰 Thanh toán
            </Typography.Text>
            <Form
              form={paymentForm}
              layout="inline"
              size="small"
              onFinish={(values) => {
                onUpdateStatus(data.id, data.status, {
                  paymentAmount: values.paymentAmount,
                  paymentMethod: values.paymentMethod
                });
                paymentForm.resetFields();
              }}
            >
              <Form.Item name="paymentAmount" label="Số tiền" rules={[{ required: true, message: 'Nhập số tiền' }]}>
                <InputNumber
                  style={{ width: 150 }}
                  placeholder="Nhập số tiền"
                  min={0}
                  max={data.finalAmount - (data.paidAmount || 0)}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                />
              </Form.Item>
              <Button
                type="link"
                size="small"
                onClick={() => paymentForm.setFieldsValue({ paymentAmount: data.finalAmount - (data.paidAmount || 0) })}
                style={{ marginLeft: -10, marginRight: 10 }}
              >
                Trả hết
              </Button>
              <Form.Item name="paymentMethod" label="PT" rules={[{ required: true, message: 'Chọn PT' }]}>
                <Select
                  style={{ width: 120 }}
                  placeholder="Chọn"
                  options={[
                    { label: 'Tiền mặt', value: 'CASH' },
                    { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
                    { label: 'Thẻ', value: 'CARD' },
                  ]}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">✓ TT</Button>
              </Form.Item>
            </Form>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 8 }}>
              Tối đa: {formatCurrency(data.finalAmount - (data.paidAmount || 0))}
            </div>
          </div>
        )}
      </Card>

      {/* Tiến trình đơn hàng */}
      {
        data.status !== "CANCELLED" && (
          <Card title="Tiến trình đơn hàng" size="small">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              {/* Bước 1: Chờ xác nhận */}
              <div
                className={`flex items-start gap-3 ${data.status === "PENDING" ? "opacity-100" : "opacity-50"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${data.status === "PENDING"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-300 text-gray-600"
                    }`}
                >
                  1
                </div>
                <div className="flex-1">
                  <Typography.Text strong>Chờ xác nhận</Typography.Text>
                  <div className="text-xs text-gray-500">
                    Đơn hàng đang chờ xác nhận từ quản lý
                  </div>
                </div>
              </div>

              {/* Bước 2: Đã xác nhận */}
              <div
                className={`flex items-start gap-3 ${[
                  "CONFIRMED",
                  "WAITING_MATERIAL",
                  "IN_PRODUCTION",
                  "COMPLETED",
                ].includes(data.status)
                  ? "opacity-100"
                  : "opacity-50"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${[
                    "CONFIRMED",
                    "WAITING_MATERIAL",
                    "IN_PRODUCTION",
                    "COMPLETED",
                  ].includes(data.status)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-600"
                    }`}
                >
                  2
                </div>
                <div className="flex-1">
                  <Typography.Text strong>Đã xác nhận</Typography.Text>
                  <div className="text-xs text-gray-500">
                    Đơn hàng đã được xác nhận
                  </div>
                </div>
              </div>

              {/* Bước 3: Hoàn thành */}
              <div
                className={`flex items-start gap-3 ${data.status === "COMPLETED" ? "opacity-100" : "opacity-50"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${data.status === "COMPLETED"
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                    }`}
                >
                  3
                </div>
                <div className="flex-1">
                  <Typography.Text strong>Hoàn thành</Typography.Text>
                  <div className="text-xs text-gray-500">
                    {data.status === "COMPLETED"
                      ? "Đơn hàng đã hoàn thành"
                      : data.paymentStatus === "PAID"
                        ? "Đã thanh toán. Cần xuất kho để hoàn thành"
                        : "Xuất kho để hoàn thành đơn hàng"}
                  </div>
                  {data.status === "CONFIRMED" && canEdit && (
                    <Button
                      onClick={() => onExportOrder(data)}
                      size="small"
                      type="primary"
                      style={{ marginTop: 8 }}
                    >
                      → Xuất kho & Hoàn thành
                    </Button>
                  )}
                </div>
              </div>

            </Space>
          </Card>
        )
      }

      {/* Danh sách sản phẩm */}
      <Card title="Danh sách sản phẩm" size="small">
        <Table
          columns={[
            {
              title: "STT",
              key: "index",
              width: 60,
              render: (_, __, index: number) => index + 1,
            },
            {
              title: "Hàng hóa",
              dataIndex: "itemName",
              key: "itemName",
              width: 200,
            },
            {
              title: "SL",
              dataIndex: "quantity",
              key: "quantity",
              width: 80,
              align: "right" as const,
              render: (value: number) => formatQuantity(value),
            },
            {
              title: "Đơn giá",
              dataIndex: "unitPrice",
              key: "unitPrice",
              width: 120,
              align: "right" as const,
              render: (value: number) => formatCurrency(value, ""),
            },
            {
              title: "Thành tiền",
              dataIndex: "totalAmount",
              key: "totalAmount",
              width: 120,
              align: "right" as const,
              render: (value: number) => (
                <Typography.Text strong>
                  {formatCurrency(value, "")}
                </Typography.Text>
              ),
            },
          ]}
          dataSource={data.details || []}
          rowKey={(record, index) => `item-${index}`}
          pagination={false}
          size="small"
          scroll={{ x: true }}
        />
        <div className="mt-4 space-y-2 text-right">
          <div>
            <Typography.Text>Tổng tiền:</Typography.Text>{" "}
            <Typography.Text strong>
              {formatCurrency(data.totalAmount)}
            </Typography.Text>
          </div>
          {data.discountAmount > 0 && (
            <div className="text-red-600">
              <Typography.Text>
                Giảm giá: -{formatCurrency(data.discountAmount)}
              </Typography.Text>
            </div>
          )}
          <div className="text-lg font-bold text-blue-600">
            <Typography.Text>
              Thành tiền: {formatCurrency(data.finalAmount)}
            </Typography.Text>
          </div>
        </div>
      </Card>

      <Space
        style={{
          width: "100%",
          justifyContent: "flex-end",
          borderTop: "1px solid #f0f0f0",
          paddingTop: 16,
        }}
      >
        <Button
          onClick={() =>
            window.open(`/api/sales/orders/${data.id}/pdf`, "_blank")
          }
          icon={<span>🖨️</span>}
        >
          In PDF
        </Button>
        {data.status === "PENDING" && canEdit && (
          <>
            <Button danger onClick={() => onUpdateStatus(data.id, "CANCELLED")}>
              ✗ Hủy đơn
            </Button>
            <Button
              type="primary"
              onClick={() => onUpdateStatus(data.id, "CONFIRMED")}
            >
              ✓ Xác nhận đơn
            </Button>
          </>
        )}
        {data.status === "CONFIRMED" && canEdit && (
          <Button
            type="primary"
            onClick={() => onExportOrder(data)}
            icon={<span>📦</span>}
          >
            Xuất kho & Hoàn thành
          </Button>
        )}
      </Space>
    </Space >
  );
}

interface ExportModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ExportModal({ order, onClose, onSuccess }: ExportModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  useEffect(() => {
    if (order) {
      fetch('/api/inventory/warehouses')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setWarehouses(data.data);
            if (data.data.length === 1) {
              form.setFieldsValue({ warehouseId: data.data[0].id });
            }
          }
        });
    }
  }, [order]);

  const handleExport = async (values: any) => {
    if (!order) return;
    setLoading(true);
    try {
      const exportRes = await fetch('/api/inventory/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: values.warehouseId,
          notes: `Xuất kho cho đơn hàng ${order.orderCode}`,
          items: order.details?.map(item => ({
            productId: item.productId || undefined,
            materialId: item.materialId || undefined,
            quantity: item.quantity,
            notes: item.notes
          }))
        })
      });
      const exportData = await exportRes.json();

      if (!exportData.success) {
        message.error(exportData.error || 'Lỗi khi tạo phiếu xuất');
        setLoading(false);
        return;
      }

      const statusRes = await fetch(`/api/sales/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      const statusData = await statusRes.json();

      if (statusData.success) {
        message.success('Đã xuất kho và hoàn thành đơn hàng');
        onSuccess();
        onClose();
      } else {
        message.error(statusData.error || 'Lỗi khi cập nhật trạng thái đơn hàng');
      }

    } catch (error) {
      message.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Tạo phiếu xuất kho & Hoàn thành"
      open={!!order}
      onCancel={onClose}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={handleExport}>
        <Form.Item
          name="warehouseId"
          label="Chọn kho xuất"
          rules={[{ required: true, message: 'Vui lòng chọn kho' }]}
        >
          <Select placeholder="Chọn kho">
            {warehouses.map(w => (
              <Select.Option key={w.id} value={w.id}>{w.warehouseName}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <div className="mb-4">
          <Typography.Text strong>Danh sách hàng hóa:</Typography.Text>
          <ul className="list-disc pl-4 mt-2">
            {order?.details?.map((item, idx) => (
              <li key={idx}>
                {item.itemName} - SL: {formatQuantity(item.quantity)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Xác nhận xuất kho
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

export default function OrdersPage() {
  const { can, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [exportOrder, setExportOrder] = useState<Order | null>(null);
  const handleExportOrder = (order: Order) => setExportOrder(order);
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Define default columns for useColumn hook
  const defaultColumns: TableColumnsType<Order> = [
    {
      title: "Mã đơn",
      dataIndex: "orderCode",
      key: "orderCode",
      width: 120,
      fixed: "left" as const,
      render: (value: string) => <span className="font-mono">{value}</span>,
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
      render: (value: string) => new Date(value).toLocaleDateString("vi-VN"),
    },
    {
      title: "Tổng tiền",
      dataIndex: "finalAmount",
      key: "finalAmount",
      width: 140,
      align: "right" as const,
      render: (value: number) => (
        <span className="font-semibold">{formatCurrency(value)}</span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (value: string) => (
        <span
          className={`px-2 py-1 rounded text-xs ${value === "PENDING"
            ? "bg-yellow-100 text-yellow-800"
            : value === "CONFIRMED"
              ? "bg-blue-100 text-blue-800"
              : value === "IN_PRODUCTION"
                ? "bg-purple-100 text-purple-800"
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
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record: Order) => (
        <TableActions
          extraActions={[
            {
              title: "Xác nhận",
              icon: <CheckCircleOutlined />,
              onClick: () => updateStatus(record.id, "CONFIRMED"),
              can: record.status === "PENDING" && can("sales.orders", "edit"),
            },
          ]}
        />
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  // Modal and form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMaterialSuggestion, setShowMaterialSuggestion] = useState(false);
  const [materialSuggestion, setMaterialSuggestion] = useState<{
    warehouses: { id: string; warehouseName: string; warehouseCode: string }[];
    materials: MaterialSuggestion[];
  } | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [previewBOM, setPreviewBOM] = useState<MaterialSuggestion[]>([]);
  const [showPreviewBOM, setShowPreviewBOM] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [branches, setBranches] = useState<{ id: number; branchName: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "all">("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "all">("all");
  const [currentUser, setCurrentUser] = useState<{ roleCode: string } | null>(null);
  const { modal } = App.useApp();

  // Form and mutation hooks
  const [form] = Form.useForm();
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: (data) => {
      message.success(
        `Tạo đơn hàng thành công! Mã đơn: ${data.data.orderCode}`
      );
      setShowCreateModal(false);
      form.resetFields();
      setOrderItems([]);
      setSelectedCustomer(null);
      setShowNewCustomer(false);
      setNewCustomer({ customerName: "", phone: "", email: "", address: "" });
      setDiscountAmount(0);
      setDiscountPercent(0);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentAmount, paymentMethod }: { id: number; status: string; paymentAmount?: number; paymentMethod?: string }) => {
      const res = await fetch(`/api/sales/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentAmount, paymentMethod }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Cập nhật thành công");

      // The drawer will automatically refresh due to query invalidation
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Production step update mutation
  const updateProductionStepMutation = useMutation({
    mutationFn: async ({
      orderId,
      step,
    }: {
      orderId: number;
      step: string;
    }) => {
      const res = await fetch(`/api/sales/orders/${orderId}/production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Cập nhật tiến trình thành công");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      // The drawer will automatically refresh due to query invalidation
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Form states
  const [orderForm, setOrderForm] = useState({
    customerId: "",
    orderDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  // TanStack Query for data fetching
  // Fetch current user and branches
  const { data: currentUserData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data.user);
        return data.data.user;
      }
      return null;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
        return data.data;
      }
      return [];
    },
  });

  const isAdmin = currentUserData?.roleCode === "ADMIN";

  const {
    data: orders = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["orders", SuperJSON.stringify(query), dateRange?.[0]?.format("YYYY-MM-DD"), dateRange?.[1]?.format("YYYY-MM-DD"), selectedBranchId, selectedCustomerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.search) params.append("search", query.search);
      if (query.status) params.append("status", query.status);
      if (selectedCustomerId !== "all") params.append("customerId", selectedCustomerId.toString());
      if (dateRange?.[0]) params.append("startDate", dateRange[0].format("YYYY-MM-DD"));
      if (dateRange?.[1]) params.append("endDate", dateRange[1].format("YYYY-MM-DD"));
      if (selectedBranchId !== "all") params.append("branchId", selectedBranchId.toString());

      const res = await fetch("/api/sales/orders?" + params.toString());
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    enabled: can("sales.orders", "view") && !!dateRange?.[0] && !!dateRange?.[1],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/sales/customers");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    enabled: can("sales.orders", "create"),
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items", "sellable"],
    queryFn: async () => {
      // Chỉ lấy những sản phẩm có thể bán
      const res = await fetch("/api/products/items?sellable=true");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    enabled: can("sales.orders", "create"),
  });

  const handleCreateOrder = () => {
    setOrderForm({
      customerId: "",
      orderDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setOrderItems([]);
    setSelectedCustomer(null);
    setShowNewCustomer(false);
    setNewCustomer({ customerName: "", phone: "", email: "", address: "" });
    setDiscountAmount(0);
    setDiscountPercent(0);
    form.setFieldsValue({ discountAmount: 0, discountPercent: 0 });
    setShowCreateModal(true);
  };

  const handleCustomerChange = (customerId: string) => {
    if (customerId === "NEW") {
      setShowNewCustomer(true);
      setSelectedCustomer(null);
      setOrderForm({ ...orderForm, customerId: "" });
      return;
    }

    setShowNewCustomer(false);
    const customer = Array.isArray(customers)
      ? customers.find((c) => c.id === parseInt(customerId))
      : null;
    setSelectedCustomer(customer);
    setOrderForm({ ...orderForm, customerId });

    // Cập nhật giá cho các items đã có
    if (customer && orderItems.length > 0 && Array.isArray(items)) {
      const updatedItems = orderItems.map((item) => {
        const foundItem = items.find((i) => i.id === item.itemId);
        if (foundItem) {
          const basePrice = foundItem.costPrice || 0;
          const discountPercent = customer.priceMultiplier || 0;
          const unitPrice = Math.round(basePrice * (1 - discountPercent / 100));
          return { ...item, unitPrice, totalAmount: item.quantity * unitPrice };
        }
        return item;
      });
      setOrderItems(updatedItems);
    }
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      {
        itemId: undefined,
        itemName: "",
        productId: undefined,
        productName: "",
        quantity: 1,
        unitPrice: 0,
        costPrice: 0,
        totalAmount: 0,
        notes: "",
      },
    ]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: string, value: unknown) => {
    const newItems = [...orderItems];

    if (field === "itemId") {
      // Sử dụng items (hàng hoá) thay vì products
      const item = Array.isArray(items)
        ? items.find((i) => i.id === parseInt(String(value)))
        : null;
      if (item) {
        const basePrice = item.costPrice || 0;
        const discountPercent = selectedCustomer?.priceMultiplier || 0;
        const unitPrice = Math.round(basePrice * (1 - discountPercent / 100));

        newItems[index] = {
          ...newItems[index],
          itemId: item.id,
          itemName: item.itemName,
          unitPrice,
          costPrice: basePrice,
          totalAmount: newItems[index].quantity * unitPrice,
        };
      }
    } else if (field === "productId") {
      // Giữ lại để tương thích ngược
      // Removed products reference
    } else if (field === "quantity") {
      const qty = parseInt(String(value)) || 0;
      newItems[index].quantity = qty;
      newItems[index].totalAmount = qty * newItems[index].unitPrice;
    } else if (field === "unitPrice") {
      const price = parseFloat(String(value)) || 0;
      newItems[index].unitPrice = price;
      newItems[index].totalAmount = newItems[index].quantity * price;
    } else {
      newItems[index][field] = value;
    }

    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    // Kiểm tra khách hàng - có thể là khách hàng mới hoặc đã có
    if (!orderForm.customerId && !showNewCustomer) {
      alert("Vui lòng chọn khách hàng hoặc thêm khách hàng mới");
      return;
    }

    if (showNewCustomer && !newCustomer.customerName) {
      alert("Vui lòng nhập tên khách hàng mới");
      return;
    }

    if (orderItems.length === 0) {
      alert("Vui lòng thêm ít nhất 1 hàng hoá");
      return;
    }

    // Kiểm tra items - ưu tiên itemId, fallback productId
    if (
      orderItems.some(
        (item) => (!item.itemId && !item.productId) || item.quantity <= 0
      )
    ) {
      alert("Vui lòng kiểm tra thông tin hàng hoá");
      return;
    }

    try {
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: orderForm.customerId
            ? parseInt(orderForm.customerId)
            : null,
          newCustomer: showNewCustomer ? newCustomer : null,
          orderDate: orderForm.orderDate,
          notes: orderForm.notes,
          discountAmount: form.getFieldValue('discountAmount') || 0,
          items: orderItems.map((item) => ({
            itemId: item.itemId || null,
            productId: item.productId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            notes: item.notes,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        message.success(
          `Tạo đơn hàng thành công! Mã đơn: ${data.data.orderCode}`
        );
        setShowCreateModal(false);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["items"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch {
      message.error("Có lỗi xảy ra");
    }
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

  const updateStatus = (id: number, status: string, paymentData?: { paymentAmount: number; paymentMethod: string }) => {
    if (paymentData) {
      updateStatusMutation.mutate({ id, status, ...paymentData });
      return;
    }

    modal.confirm({
      title: `Cập nhật trạng thái đơn hàng`,
      content: `Bạn có chắc chắn muốn chuyển trạng thái đơn hàng sang "${getStatusText(
        status
      )}"?`,
      onOk: () => {
        updateStatusMutation.mutate({ id, status });
      },
    });
  };

  const updateProductionStep = (orderId: number, step: string) => {
    updateProductionStepMutation.mutate({ orderId, step });
  };

  const loadMaterialSuggestion = async (orderId: number) => {
    try {
      const res = await fetch(
        `/api/sales/orders/${orderId}/material-suggestion`
      );
      const data = await res.json();
      console.log("Material suggestion response:", data);
      if (data.success) {
        console.log("Warehouses:", data.data.warehouses);
        console.log("Materials:", data.data.materials);
        setMaterialSuggestion(data.data);
        setShowMaterialSuggestion(true);
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch {
      message.error("Có lỗi xảy ra");
    }
  };

  const createImportSuggestion = () => {
    if (!selectedWarehouse) {
      alert("Vui lòng chọn kho nhập");
      return;
    }

    if (!materialSuggestion) {
      alert("Không có dữ liệu gợi ý");
      return;
    }

    const materialsToImport = materialSuggestion.materials.filter(
      (m: MaterialSuggestion) => m.needToImport > 0
    );

    if (materialsToImport.length === 0) {
      alert("Không có nguyên liệu nào cần nhập");
      return;
    }

    // Chuyển đến trang tạo phiếu nhập với dữ liệu gợi ý
    const suggestionData = {
      warehouseId: selectedWarehouse,
      materials: materialsToImport.map((m: MaterialSuggestion) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        quantity: m.needToImport,
        unit: m.unit,
      })),
    };

    localStorage.setItem("importSuggestion", JSON.stringify(suggestionData));
    window.location.href = "/inventory?tab=import";
  };

  // Tính định mức NVL preview khi tạo đơn hàng
  const loadPreviewBOM = async () => {
    if (orderItems.length === 0) {
      setPreviewBOM([]);
      return;
    }

    try {
      // Lấy BOM cho các sản phẩm trong đơn hàng
      const productItems = orderItems.filter(item => {
        const foundItem = items.find((i: { id: number; itemType: string }) => i.id === item.itemId);
        return foundItem?.itemType === 'PRODUCT';
      });

      const materialItems = orderItems.filter(item => {
        const foundItem = items.find((i: { id: number; itemType: string }) => i.id === item.itemId);
        return foundItem?.itemType === 'MATERIAL';
      });

      const bomList: MaterialSuggestion[] = [];

      // Lấy BOM cho sản phẩm
      for (const item of productItems) {
        const foundItem = items.find((i: { id: number; productId?: number }) => i.id === item.itemId);
        if (foundItem?.productId) {
          try {
            const res = await fetch(`/api/products/${foundItem.productId}/bom`);
            const data = await res.json();
            if (data.success && data.data) {
              for (const bom of data.data) {
                const existing = bomList.find(b => b.materialId === bom.materialId);
                const neededQty = (bom.quantity || 0) * (item.quantity || 1);
                if (existing) {
                  existing.totalNeeded += neededQty;
                } else {
                  bomList.push({
                    materialId: bom.materialId,
                    materialCode: bom.materialCode,
                    materialName: bom.materialName,
                    unit: bom.unit,
                    totalNeeded: neededQty,
                    currentStock: 0,
                    needToImport: neededQty,
                    items: [{
                      productName: item.itemName || foundItem.itemName,
                      quantity: item.quantity || 1,
                      bomQuantity: bom.quantity
                    }]
                  });
                }
              }
            }
          } catch (e) {
            console.error('Error fetching BOM:', e);
          }
        }
      }

      // Thêm NVL được bán trực tiếp (chính nó là định mức)
      for (const item of materialItems) {
        const foundItem = items.find((i: { id: number; materialId?: number; itemCode: string; itemName: string; unit: string }) => i.id === item.itemId);
        if (foundItem?.materialId) {
          const existing = bomList.find(b => b.materialId === foundItem.materialId);
          const neededQty = item.quantity || 1;
          if (existing) {
            existing.totalNeeded += neededQty;
          } else {
            bomList.push({
              materialId: foundItem.materialId,
              materialCode: foundItem.itemCode,
              materialName: foundItem.itemName,
              unit: foundItem.unit,
              totalNeeded: neededQty,
              currentStock: 0,
              needToImport: neededQty,
              items: [{
                productName: `${foundItem.itemName} (bán trực tiếp)`,
                quantity: neededQty,
                bomQuantity: 1
              }]
            });
          }
        }
      }

      setPreviewBOM(bomList);
      if (bomList.length > 0) {
        setShowPreviewBOM(true);
      }
    } catch (e) {
      console.error('Error loading preview BOM:', e);
    }
  };

  // In phiếu xuất kho NVL
  const printBOMSheet = () => {
    if (previewBOM.length === 0) {
      message.warning('Không có định mức NVL để in');
      return;
    }

    const printContent = `
      <html>
      <head>
        <title>Phiếu xuất kho NVL</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          .text-right { text-align: right; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; }
          .signature { text-align: center; width: 200px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>PHIẾU XUẤT KHO NGUYÊN VẬT LIỆU</h1>
        <p><strong>Ngày:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã NVL</th>
              <th>Tên NVL</th>
              <th>ĐVT</th>
              <th class="text-right">Số lượng cần</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${previewBOM.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.materialCode}</td>
                <td>${item.materialName}</td>
                <td>${item.unit}</td>
                <td class="text-right">${item.totalNeeded}</td>
                <td>${item.items?.map(i => i.productName).join(', ') || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div class="signature">
            <p>Người lập phiếu</p>
            <br/><br/><br/>
            <p>_______________</p>
          </div>
          <div class="signature">
            <p>Thủ kho</p>
            <br/><br/><br/>
            <p>_______________</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Apply client-side filtering
  const filteredOrders = applyFilter(orders as Order[]);

  const { exportToXlsx } = useFileExport(getVisibleColumns());

  const handleExportExcel = () => {
    exportToXlsx(filteredOrders, "don-hang");
  };

  const handleImportExcel = () => {
    alert("Chức năng nhập Excel đang được phát triển");
  };

  const handleResetAll = () => {
    reset();
    setDateRange([dayjs().startOf("month"), dayjs()]);
    setSelectedBranchId("all");
    setSelectedCustomerId("all");
  };

  return (
    <>
      <WrapperContent<Order>
        title="Quản lý đơn hàng"
        isNotAccessible={!can("sales.orders", "view")}
        isLoading={permLoading || isLoading}
        header={{
          searchInput: {
            placeholder: "Tìm theo mã đơn, khách hàng...",
            filterKeys: ["orderCode", "customerName"],
          },
          customToolbar: (
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD/MM/YYYY"
              placeholder={["Từ ngày", "Đến ngày"]}
              suffixIcon={<CalendarOutlined />}
              presets={[
                { label: "Hôm nay", value: [dayjs(), dayjs()] },
                { label: "Tuần này", value: [dayjs().startOf("week"), dayjs()] },
                { label: "Tháng này", value: [dayjs().startOf("month"), dayjs()] },
                {
                  label: "Tháng trước",
                  value: [
                    dayjs().subtract(1, "month").startOf("month"),
                    dayjs().subtract(1, "month").endOf("month"),
                  ],
                },
                {
                  label: "Quý này",
                  value: [dayjs().startOf("month").subtract(2, "month"), dayjs()],
                },
                { label: "Năm này", value: [dayjs().startOf("year"), dayjs()] },
              ]}
            />
          ),
          customToolbarSecondRow: (
            <>
              {isAdmin && (
                <Select
                  style={{ width: 180 }}
                  placeholder="Chi nhánh"
                  allowClear
                  value={selectedBranchId === "all" ? undefined : selectedBranchId}
                  onChange={(value: number | undefined) => setSelectedBranchId(value || "all")}
                  options={Array.isArray(branchesData) ? branchesData.map((b: { id: number; branchName: string }) => ({
                    label: b.branchName,
                    value: b.id,
                  })) : []}
                />
              )}
              <Select
                style={{ width: 160 }}
                placeholder="Trạng thái"
                allowClear
                value={query.status || undefined}
                onChange={(value) => updateQueries([{ key: "status", value: value || "" }])}
                options={[
                  { label: "Chờ xác nhận", value: "PENDING" },
                  { label: "Đã xác nhận", value: "CONFIRMED" },
                  { label: "Đang sản xuất", value: "IN_PRODUCTION" },
                  { label: "Hoàn thành", value: "COMPLETED" },
                  { label: "Đã hủy", value: "CANCELLED" },
                ]}
              />
              <Select
                style={{ width: 200 }}
                placeholder="Khách hàng"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                value={selectedCustomerId === "all" ? undefined : selectedCustomerId}
                onChange={(value: number | undefined) => setSelectedCustomerId(value || "all")}
                options={Array.isArray(customers) ? customers.map((c) => ({
                  label: `${c.customerName} (${c.customerCode})`,
                  value: c.id,
                })) : []}
              />
            </>
          ),
          buttonEnds: can("sales.orders", "create")
            ? [
              {
                type: "default",
                name: "Đặt lại",
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
              {
                type: "primary",
                name: "Thêm",
                onClick: handleCreateOrder,
                icon: <PlusOutlined />,
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
                onClick: handleResetAll,
                icon: <ReloadOutlined />,
              },
            ],
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
          },
        }}
      >
        <div className="flex gap-4">
          <div className={`space-y-4 transition-all duration-300`}>
            <CommonTable
              DrawerDetails={({ data }: PropRowDetails<Order>) => (
                <OrderDetailDrawer
                  orderId={data?.id || null}
                  canEdit={can("sales.orders", "edit")}
                  onUpdateStatus={updateStatus}
                  onLoadMaterialSuggestion={loadMaterialSuggestion}
                  onExportOrder={handleExportOrder}
                />
              )}
              columns={getVisibleColumns()}
              dataSource={filteredOrders}
              loading={permLoading || isLoading || isFetching}
              pagination={{ ...pagination, onChange: handlePageChange }}
            />
          </div>

          {/* Create Order Modal */}
          <Modal
            title="Tạo đơn hàng mới"
            open={showCreateModal}
            onCancel={() => setShowCreateModal(false)}
            footer={null}
            width={1200}
            destroyOnHidden
          >
            <Form form={form} layout="vertical" onFinish={handleSubmitOrder}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Form.Item
                  name="customerId"
                  label="Khách hàng"
                  rules={[
                    { required: true, message: "Vui lòng chọn khách hàng" },
                  ]}
                >
                  <Select
                    placeholder="-- Chọn khách hàng --"
                    onChange={handleCustomerChange}
                    popupRender={(menu) => (
                      <>
                        {menu}
                        <div className="border-t p-2">
                          <Button
                            type="text"
                            icon={<UserAddOutlined />}
                            onClick={() => setShowNewCustomer(true)}
                            className="w-full text-left text-blue-600"
                          >
                            Thêm khách hàng mới
                          </Button>
                        </div>
                      </>
                    )}
                  >
                    {Array.isArray(customers) &&
                      customers.map((c) => (
                        <Select.Option key={c.id} value={c.id}>
                          {c.customerName}{" "}
                          {c.groupName ? `(${c.groupName})` : ""}
                        </Select.Option>
                      ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="orderDate"
                  label="Ngày đặt"
                  rules={[
                    { required: true, message: "Vui lòng chọn ngày đặt" },
                  ]}
                >
                  <Input type="date" />
                </Form.Item>
              </div>

              {/* Form thêm khách hàng mới */}
              {showNewCustomer && (
                <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <UserAddOutlined className="text-blue-600" />
                      <span className="font-medium text-blue-800">
                        Thêm khách hàng mới
                      </span>
                    </div>
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => {
                        setShowNewCustomer(false);
                        setNewCustomer({ customerName: "", phone: "", email: "", address: "" });
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Tên khách hàng *</label>
                      <Input
                        placeholder="Nhập tên khách hàng"
                        value={newCustomer.customerName}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, customerName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Số điện thoại</label>
                      <Input
                        placeholder="Nhập số điện thoại"
                        value={newCustomer.phone}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Email</label>
                      <Input
                        placeholder="Nhập email"
                        value={newCustomer.email}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Địa chỉ</label>
                      <Input
                        placeholder="Nhập địa chỉ"
                        value={newCustomer.address}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, address: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      size="small"
                      loading={savingCustomer}
                      disabled={!newCustomer.customerName.trim()}
                      onClick={async () => {
                        if (!newCustomer.customerName.trim()) {
                          message.warning("Vui lòng nhập tên khách hàng");
                          return;
                        }
                        setSavingCustomer(true);
                        try {
                          const res = await fetch("/api/sales/customers", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              customerName: newCustomer.customerName,
                              phone: newCustomer.phone || null,
                              email: newCustomer.email || null,
                              address: newCustomer.address || null,
                            }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            message.success(`Đã tạo khách hàng: ${data.data.customerName}`);
                            // Cập nhật danh sách khách hàng
                            queryClient.invalidateQueries({ queryKey: ["customers"] });
                            // Chọn khách hàng vừa tạo
                            setSelectedCustomer(data.data);
                            setOrderForm({ ...orderForm, customerId: data.data.id.toString() });
                            setShowNewCustomer(false);
                            setNewCustomer({ customerName: "", phone: "", email: "", address: "" });
                          } else {
                            message.error(data.error || "Có lỗi xảy ra");
                          }
                        } catch {
                          message.error("Có lỗi xảy ra khi tạo khách hàng");
                        } finally {
                          setSavingCustomer(false);
                        }
                      }}
                    >
                      Lưu khách hàng
                    </Button>
                  </div>
                </div>
              )}

              {selectedCustomer && (
                <p className="text-xs text-gray-600 mb-4">
                  Giảm giá: {selectedCustomer.priceMultiplier || 0}%
                  {(selectedCustomer.priceMultiplier || 0) > 0 && (
                    <span className="text-green-600 ml-1">
                      (Giá = Giá gốc ×{" "}
                      {100 - (selectedCustomer.priceMultiplier || 0)}%)
                    </span>
                  )}
                </p>
              )}

              <Form.Item name="notes" label="Ghi chú">
                <Input.TextArea rows={2} placeholder="Nhập ghi chú..." />
              </Form.Item>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">
                    Danh sách hàng hoá *
                  </label>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={addOrderItem}
                  >
                    Thêm hàng hoá
                  </Button>
                </div>

                {orderItems.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded text-gray-500">
                    Chưa có hàng hoá.{" "}
                    {items.length === 0 && (
                      <span className="text-orange-600">
                        Vui lòng tạo hàng hoá trong mục &quot;Sản phẩm → Hàng
                        hoá&quot; trước.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start border p-3 rounded bg-gray-50">
                        <div className="flex-1 grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <label className="text-xs text-gray-500 block mb-1">Hàng hoá</label>
                            <Select
                              showSearch
                              placeholder="Chọn hàng hoá"
                              optionFilterProp="children"
                              className="w-full"
                              value={item.itemId}
                              onChange={(val) => updateOrderItem(index, "itemId", val)}
                            >
                              {items.map((i: any) => (
                                <Select.Option key={i.id} value={i.id}>
                                  {i.itemName} ({i.itemCode})
                                </Select.Option>
                              ))}
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">Số lượng</label>
                            <InputNumber
                              min={1}
                              className="w-full"
                              value={item.quantity}
                              onChange={(val) => updateOrderItem(index, "quantity", val)}
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="text-xs text-gray-500 block mb-1">Đơn giá</label>
                            <InputNumber
                              min={0}
                              className="w-full"
                              value={item.unitPrice}
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                              onChange={(val) => updateOrderItem(index, "unitPrice", val)}
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="text-xs text-gray-500 block mb-1">Thành tiền</label>
                            <div className="font-medium pt-1 text-right">
                              {formatCurrency(item.totalAmount)}
                            </div>
                          </div>
                          <div className="col-span-12">
                            <Input
                              placeholder="Ghi chú..."
                              value={item.notes}
                              onChange={(e) => updateOrderItem(index, "notes", e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          danger
                          icon={<span className="text-red-500">×</span>}
                          onClick={() => removeOrderItem(index)}
                        />
                      </div>
                    ))}

                    <div className="space-y-2 border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Tổng tiền:</span>
                        <span className="font-semibold text-lg">
                          {formatCurrency(calculateTotal())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="font-medium">Chiết khấu:</span>
                        <div className="flex items-center gap-2">
                          <Form.Item name="discountPercent" noStyle initialValue={0}>
                            <InputNumber
                              min={0}
                              max={100}
                              precision={2}
                              style={{ width: 100 }}
                              placeholder="0"
                              value={discountPercent}
                              onChange={(value: number | null) => {
                                const percent = value || 0;
                                const total = calculateTotal();
                                const amount = Math.round(total * percent / 100);
                                setDiscountPercent(percent);
                                setDiscountAmount(amount);
                                form.setFieldsValue({ discountAmount: amount, discountPercent: percent });
                              }}
                            />
                          </Form.Item>
                          <span>%</span>
                          <span className="mx-2">=</span>
                          <Form.Item name="discountAmount" noStyle initialValue={0}>
                            <InputNumber
                              min={0}
                              style={{ width: 140 }}
                              placeholder="0"
                              value={discountAmount}
                              formatter={(value: number | string | undefined) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(value: string | undefined) => value!.replace(/\$\s?|(,*)/g, '')}
                              onChange={(value: string | number | null) => {
                                const amount = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
                                const total = calculateTotal();
                                const percent = total > 0 ? (amount / total * 100) : 0;
                                setDiscountAmount(amount);
                                setDiscountPercent(Math.round(percent * 100) / 100);
                                form.setFieldsValue({ discountPercent: Math.round(percent * 100) / 100, discountAmount: amount });
                              }}
                            />
                          </Form.Item>
                          <span>đ</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-lg border-t pt-2">
                        <span className="font-bold">Thành tiền:</span>
                        <span className="font-bold text-blue-600 text-xl">
                          {formatCurrency(calculateTotal() - discountAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nút xem định mức NVL */}
                {orderItems.length > 0 && (
                  <div className="mb-4">
                    <Button
                      type="dashed"
                      onClick={loadPreviewBOM}
                      icon={<span>📋</span>}
                    >
                      Xem định mức NVL
                    </Button>

                    {showPreviewBOM && previewBOM.length > 0 && (
                      <div className="mt-3 border rounded-lg p-3 bg-orange-50">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-orange-700">📦 Định mức NVL cần xuất kho</h4>
                          <Button size="small" onClick={printBOMSheet} icon={<span>🖨️</span>}>
                            In phiếu xuất kho
                          </Button>
                        </div>
                        <Table
                          size="small"
                          dataSource={previewBOM}
                          rowKey="materialCode"
                          pagination={false}
                          columns={[
                            { title: 'Mã NVL', dataIndex: 'materialCode', key: 'materialCode', width: 100 },
                            { title: 'Tên NVL', dataIndex: 'materialName', key: 'materialName', width: 200 },
                            { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 60 },
                            {
                              title: 'SL cần',
                              dataIndex: 'totalNeeded',
                              key: 'totalNeeded',
                              width: 80,
                              align: 'right' as const,
                              render: (v: number) => <span className="font-semibold text-orange-600">{formatQuantity(v)}</span>
                            },
                            {
                              title: 'Chi tiết',
                              key: 'details',
                              render: (_: unknown, record: MaterialSuggestion) => (
                                <span className="text-xs text-gray-500">
                                  {record.items?.map(i => i.productName).join(', ')}
                                </span>
                              )
                            }
                          ]}
                        />
                      </div>
                    )}

                    {showPreviewBOM && previewBOM.length === 0 && (
                      <div className="mt-2 text-sm text-gray-500">
                        Không có định mức NVL (sản phẩm chưa có BOM hoặc chỉ bán NVL)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button onClick={() => setShowCreateModal(false)}>Hủy</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={orderItems.length === 0}
                  loading={saveMutation.isPending}
                >
                  ✓ Tạo đơn hàng
                </Button>
              </div>
            </Form>
          </Modal>

          {/* Material Suggestion Modal */}
          <Modal
            title="Gợi ý nhập nguyên liệu"
            open={showMaterialSuggestion}
            onCancel={() => setShowMaterialSuggestion(false)}
            footer={null}
            width={1200}
            destroyOnHidden
          >
            <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
              <p className="font-medium mb-1">
                📊 Phân tích nhu cầu nguyên liệu
              </p>
              <p className="text-gray-600">
                Dựa trên BOM của sản phẩm và tồn kho hiện tại
              </p>
            </div>

            {materialSuggestion?.warehouses &&
              materialSuggestion.warehouses.length > 0 ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Chọn kho nhập:
                </label>
                <Select
                  value={selectedWarehouse}
                  onChange={setSelectedWarehouse}
                  className="w-full"
                  placeholder="-- Chọn kho --"
                >
                  {materialSuggestion.warehouses.map((w) => (
                    <Select.Option key={w.id} value={w.id}>
                      {w.warehouseName} ({w.warehouseCode})
                    </Select.Option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <p className="font-medium text-yellow-800">
                  ⚠️ Chưa có kho nào
                </p>
                <p className="text-yellow-700 mt-1">
                  Vui lòng tạo kho trong mục &quot;Quản lý kho&quot; trước khi
                  sử dụng tính năng này.
                </p>
              </div>
            )}

            <Table
              columns={[
                {
                  title: "Mã NVL",
                  dataIndex: "materialCode",
                  key: "materialCode",
                  width: 120,
                  render: (value: string) => (
                    <span className="font-mono">{value}</span>
                  ),
                },
                {
                  title: "Tên nguyên liệu",
                  dataIndex: "materialName",
                  key: "materialName",
                  width: 200,
                },
                {
                  title: "Cần dùng",
                  dataIndex: "totalNeeded",
                  key: "totalNeeded",
                  width: 120,
                  align: "right" as const,
                  render: (value: number, record: MaterialSuggestion) => (
                    <span className="font-semibold">
                      {formatQuantity(value, record.unit)}
                    </span>
                  ),
                },
                {
                  title: "Tồn kho",
                  dataIndex: "currentStock",
                  key: "currentStock",
                  width: 120,
                  align: "right" as const,
                  render: (value: number, record: MaterialSuggestion) => (
                    <span
                      className={
                        (Number(value) || 0) >= (Number(record.totalNeeded) || 0)
                          ? "text-green-600"
                          : "text-orange-600"
                      }
                    >
                      {formatQuantity(value, record.unit)}
                    </span>
                  ),
                },
                {
                  title: "Cần nhập",
                  dataIndex: "needToImport",
                  key: "needToImport",
                  width: 120,
                  align: "right" as const,
                  render: (value: number, record: MaterialSuggestion) =>
                    (Number(value) || 0) > 0 ? (
                      <span className="font-bold text-red-600">
                        {formatQuantity(value, record.unit)}
                      </span>
                    ) : (
                      <span className="text-green-600">✓ Đủ</span>
                    ),
                },
                {
                  title: "Chi tiết",
                  key: "details",
                  width: 200,
                  render: (_, record: MaterialSuggestion) =>
                    record.items && record.items.length > 0 ? (
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer hover:text-blue-600">
                          Xem chi tiết
                        </summary>
                        <ul className="mt-1 ml-4 list-disc">
                          {record.items.map((item, i: number) => (
                            <li key={i}>
                              {item.itemName}: {item.quantity} x{" "}
                              {item.materialPerItem} {record.unit}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <span className="text-gray-400">-</span>
                    ),
                },
              ]}
              dataSource={materialSuggestion?.materials || []}
              rowKey="materialCode"
              pagination={false}
              scroll={{ x: true }}
              rowClassName={(record: MaterialSuggestion) =>
                record.needToImport > 0 ? "bg-red-50" : ""
              }
              size="small"
            />

            <div className="mt-4 flex gap-2 justify-end">
              <Button onClick={() => setShowMaterialSuggestion(false)}>
                Đóng
              </Button>
              {materialSuggestion?.warehouses &&
                materialSuggestion.warehouses.length > 0 && (
                  <Button
                    type="primary"
                    onClick={createImportSuggestion}
                    disabled={!selectedWarehouse}
                  >
                    📋 Tạo phiếu nhập từ gợi ý
                  </Button>
                )}
            </div>
          </Modal>

          {/* Export Modal */}
          <ExportModal
            order={exportOrder}
            onClose={() => setExportOrder(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["orders"] });
              queryClient.invalidateQueries({ queryKey: ["items"] });
            }}
          />
        </div>
      </WrapperContent>
    </>
  );
}
