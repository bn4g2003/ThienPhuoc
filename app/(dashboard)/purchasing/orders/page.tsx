"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  CloseOutlined,
  DownloadOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Col,
  Select,
  Statistic,
  Tag,
} from "antd";
import { useState } from "react";

interface PurchaseOrder {
  id: number;
  poCode: string;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  totalAmount: number;
  status: string;
  createdBy: string;
  notes?: string;
  details?: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
}

interface Supplier {
  id: number;
  supplierName: string;
}

interface Material {
  id: number;
  materialName: string;
  itemCode?: string;
  unit?: string;
}

interface CreateOrderForm {
  supplierId: number;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  items: CreateOrderItem[];
}

interface CreateOrderItem {
  materialId?: number;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  totalAmount: number;
  notes?: string;
  isCustom: boolean;
}

export default function PurchaseOrdersPage() {
  const { can } = usePermissions();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { query, updateQueries, reset, applyFilter } = useFilter();

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null
  );
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm] = Form.useForm();

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchasing-orders", query],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          qs.append(key, String(value));
        }
      });

      const res = await fetch(`/api/purchasing/orders?${qs}`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: can("purchasing.orders", "view"),
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/purchasing/suppliers");
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  // Fetch materials
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await fetch("/api/products/materials");
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  const filteredOrders = applyFilter(orders) as PurchaseOrder[];

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: async (values: CreateOrderForm) => {
      const res = await fetch("/api/purchasing/orders", {
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
        `Tạo đơn đặt hàng thành công! Mã đơn: ${data.data.poCode}`
      );
      setShowCreateModal(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["purchasing-orders"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/purchasing/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Cập nhật trạng thái thành công");
      queryClient.invalidateQueries({ queryKey: ["purchasing-orders"] });
      setShowDetailDrawer(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const viewDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/purchasing/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
        setShowDetailDrawer(true);
      }
    } catch {
      message.error("Có lỗi khi tải chi tiết đơn hàng");
    }
  };

  const handleCreateOrder = () => {
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (values: CreateOrderForm) => {
    if (!values.items || values.items.length === 0) {
      message.error("Vui lòng thêm ít nhất 1 nguyên liệu");
      return;
    }

    await createOrderMutation.mutateAsync(values);
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    modal.confirm({
      title: "Xác nhận",
      content: `Xác nhận chuyển trạng thái sang ${status}?`,
      onOk: () => updateStatusMutation.mutate({ id, status }),
    });
  };

  const handleExportExcel = () => {
    message.info("Chức năng xuất Excel đang được phát triển");
  };

  const handleImportExcel = () => {
    message.info("Chức năng nhập Excel đang được phát triển");
  };

  const handlePrintPDF = (id: number) => {
    window.open(`/api/purchasing/orders/${id}/pdf`, "_blank");
  };

  return (
    <>
      <WrapperContent
        title="Đơn đặt hàng"
        isNotAccessible={!can("purchasing.orders", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["purchasing-orders"],
          buttonEnds: can("purchasing.orders", "create")
            ? [
                {
                  type: "default" as const,
                  name: "Đặt lại",
                  onClick: reset,
                  icon: <ReloadOutlined />,
                },
                {
                  type: "primary" as const,
                  name: "Thêm",
                  onClick: handleCreateOrder,
                  icon: <PlusOutlined />,
                },
                {
                  type: "default" as const,
                  name: "Xuất Excel",
                  onClick: handleExportExcel,
                  icon: <DownloadOutlined />,
                },
                {
                  type: "default" as const,
                  name: "Nhập Excel",
                  onClick: handleImportExcel,
                  icon: <UploadOutlined />,
                },
              ]
            : [
                {
                  type: "default" as const,
                  name: "Đặt lại",
                  onClick: reset,
                  icon: <ReloadOutlined />,
                },
              ],
          searchInput: {
            placeholder: "Tìm theo mã đơn, nhà cung cấp...",
            filterKeys: ["poCode", "supplierName"],
          },
          filters: {
            fields: [
              {
                type: "select" as const,
                name: "status",
                label: "Trạng thái",
                options: [
                  { label: "Chờ xác nhận", value: "PENDING" },
                  { label: "Đã xác nhận", value: "CONFIRMED" },
                  { label: "Đã giao hàng", value: "DELIVERED" },
                  { label: "Đã hủy", value: "CANCELLED" },
                ],
              },
            ],
            onApplyFilter: updateQueries,
            onReset: reset,
            query,
          },
        }}
      >
        <div className="flex gap-4">
          <div
            className={`space-y-4 transition-all duration-300 ${
              showDetailDrawer ? "w-1/2" : "w-full"
            }`}
          >
            <CommonTable
              columns={[
                {
                  title: "Mã đơn",
                  dataIndex: "poCode",
                  key: "poCode",
                  width: 120,
                  fixed: "left" as const,
                  render: (value: string) => (
                    <span className="font-mono">{value}</span>
                  ),
                },
                {
                  title: "Nhà cung cấp",
                  dataIndex: "supplierName",
                  key: "supplierName",
                  width: 200,
                  fixed: "left" as const,
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
                  dataIndex: "totalAmount",
                  key: "totalAmount",
                  width: 140,
                  align: "right" as const,
                  render: (value: number) =>
                    `${value.toLocaleString("vi-VN")} đ`,
                },
                {
                  title: "Trạng thái",
                  dataIndex: "status",
                  key: "status",
                  width: 140,
                  render: (value: string) => {
                    const statusConfig = {
                      PENDING: { color: "orange", text: "Chờ xác nhận" },
                      CONFIRMED: { color: "blue", text: "Đã xác nhận" },
                      DELIVERED: { color: "green", text: "Đã giao hàng" },
                      CANCELLED: { color: "red", text: "Đã hủy" },
                      COMPLETED: { color: "green", text: "Hoàn thành" },
                    };
                    const config = statusConfig[
                      value as keyof typeof statusConfig
                    ] || { color: "default", text: value };
                    return <Tag color={config.color}>{config.text}</Tag>;
                  },
                },
                {
                  title: "Thao tác",
                  key: "actions",
                  width: 120,
                  fixed: "right" as const,
                  render: (_: unknown, record: PurchaseOrder) => (
                    <TableActions
                      onView={() => viewDetail(record.id)}
                      canView={true}
                    />
                  ),
                },
              ]}
              dataSource={filteredOrders}
              loading={isLoading}
              pagination={{
                current: 1,
                pageSize: 1000,
                limit: 1000,
                onChange: () => {},
              }}
              paging={false}
            />
          </div>

          {/* Detail Drawer */}
          <Drawer
            title={`Chi tiết đơn đặt hàng - ${selectedOrder?.poCode}`}
            placement="right"
            size={600}
            open={showDetailDrawer}
            onClose={() => {
              setShowDetailDrawer(false);
              setSelectedOrder(null);
            }}
            destroyOnClose
          >
            {selectedOrder && (
              <div className="space-y-6">
                <Card>
                  <Row gutter={16} className="text-sm">
                    <Col span={12}>
                      <div>
                        <span className="text-gray-600">Mã đơn:</span>{" "}
                        <span className="font-mono font-medium">
                          {selectedOrder.poCode}
                        </span>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <span className="text-gray-600">Trạng thái:</span>{" "}
                        <Tag
                          color={
                            selectedOrder.status === "PENDING"
                              ? "orange"
                              : selectedOrder.status === "CONFIRMED"
                              ? "blue"
                              : selectedOrder.status === "DELIVERED"
                              ? "green"
                              : "red"
                          }
                        >
                          {selectedOrder.status === "PENDING"
                            ? "Chờ xác nhận"
                            : selectedOrder.status === "CONFIRMED"
                            ? "Đã xác nhận"
                            : selectedOrder.status === "DELIVERED"
                            ? "Đã giao hàng"
                            : "Đã hủy"}
                        </Tag>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <span className="text-gray-600">Nhà cung cấp:</span>{" "}
                        {selectedOrder.supplierName}
                      </div>
                    </Col>
                    <Col span={12}>
                      <div>
                        <span className="text-gray-600">Ngày đặt:</span>{" "}
                        {new Date(selectedOrder.orderDate).toLocaleDateString(
                          "vi-VN"
                        )}
                      </div>
                    </Col>
                    {selectedOrder.expectedDate && (
                      <Col span={12}>
                        <div>
                          <span className="text-gray-600">Ngày dự kiến:</span>{" "}
                          {new Date(
                            selectedOrder.expectedDate
                          ).toLocaleDateString("vi-VN")}
                        </div>
                      </Col>
                    )}
                    <Col span={12}>
                      <div>
                        <span className="text-gray-600">Người tạo:</span>{" "}
                        {selectedOrder.createdBy}
                      </div>
                    </Col>
                  </Row>
                  {selectedOrder.notes && (
                    <div className="mt-3 text-sm">
                      <span className="text-gray-600">Ghi chú:</span>{" "}
                      {selectedOrder.notes}
                    </div>
                  )}
                </Card>

                <Card title="Danh sách nguyên liệu">
                  <CommonTable
                    columns={[
                      {
                        title: "STT",
                        key: "index",
                        width: 60,
                        render: (_: unknown, __: unknown, index: number) =>
                          index + 1,
                      },
                      {
                        title: "Nguyên liệu",
                        dataIndex: "materialName",
                        key: "materialName",
                        width: 150,
                      },
                      {
                        title: "SL",
                        dataIndex: "quantity",
                        key: "quantity",
                        width: 80,
                        align: "right" as const,
                        render: (value: number, record: PurchaseOrderItem) =>
                          `${value} ${record.unit}`,
                      },
                      {
                        title: "Đơn giá",
                        dataIndex: "unitPrice",
                        key: "unitPrice",
                        width: 100,
                        align: "right" as const,
                        render: (value: number) =>
                          value.toLocaleString("vi-VN"),
                      },
                      {
                        title: "Thành tiền",
                        dataIndex: "totalAmount",
                        key: "totalAmount",
                        width: 120,
                        align: "right" as const,
                        render: (value: number) =>
                          `${value.toLocaleString("vi-VN")} đ`,
                      },
                    ]}
                    dataSource={selectedOrder.details || []}
                    pagination={{
                      current: 1,
                      pageSize: 1000,
                      limit: 1000,
                      onChange: () => {},
                    }}
                    paging={false}
                    loading={false}
                  />
                  <div className="mt-4 text-right">
                    <Statistic
                      title="Tổng tiền"
                      value={selectedOrder.totalAmount}
                      suffix="đ"
                      styles={{
                        content: { color: "#1890ff" },
                      }}
                    />
                  </div>
                </Card>

                <div className="flex gap-2 justify-end border-t pt-4">
                  <Button
                    onClick={() => handlePrintPDF(selectedOrder.id)}
                    icon={<PrinterOutlined />}
                  >
                    In PDF
                  </Button>
                  {selectedOrder.status === "PENDING" &&
                    can("purchasing.orders", "edit") && (
                      <>
                        <Button
                          danger
                          onClick={() =>
                            handleUpdateStatus(selectedOrder.id, "CANCELLED")
                          }
                          loading={updateStatusMutation.isPending}
                        >
                          ✗ Hủy đơn
                        </Button>
                        <Button
                          type="primary"
                          onClick={() =>
                            handleUpdateStatus(selectedOrder.id, "CONFIRMED")
                          }
                          loading={updateStatusMutation.isPending}
                        >
                          ✓ Xác nhận
                        </Button>
                      </>
                    )}
                  {selectedOrder.status === "CONFIRMED" &&
                    can("purchasing.orders", "edit") && (
                      <Button
                        type="primary"
                        onClick={() =>
                          handleUpdateStatus(selectedOrder.id, "DELIVERED")
                        }
                        loading={updateStatusMutation.isPending}
                      >
                        ✓ Đã giao hàng
                      </Button>
                    )}
                </div>
              </div>
            )}
          </Drawer>
        </div>

        {/* Create Order Modal */}
        <Modal
          title="Tạo đơn đặt hàng mới"
          open={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          footer={null}
          width={1200}
          destroyOnClose
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateSubmit}
            initialValues={{
              supplierId: "",
              orderDate: new Date().toISOString().split("T")[0],
              expectedDate: "",
              notes: "",
              items: [],
            }}
          >
            <Row gutter={16} className="mb-4">
              <Col span={12}>
                <Form.Item
                  label="Nhà cung cấp"
                  name="supplierId"
                  rules={[
                    { required: true, message: "Vui lòng chọn nhà cung cấp" },
                  ]}
                >
                  <Select placeholder="Chọn nhà cung cấp">
                    {suppliers.map((supplier: Supplier) => (
                      <Select.Option key={supplier.id} value={supplier.id}>
                        {supplier.supplierName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label="Ngày đặt"
                  name="orderDate"
                  rules={[{ required: true, message: "Vui lòng chọn ngày đặt" }]}
                >
                  <Input type="date" />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item label="Ngày dự kiến giao" name="expectedDate">
                  <Input type="date" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Ghi chú" name="notes">
              <Input.TextArea
                rows={2}
                placeholder="Ghi chú về đơn đặt hàng..."
              />
            </Form.Item>

            <Form.Item label="Danh sách nguyên liệu">
              <Form.List name="items">
                {(fields, { add, remove }) => (
                  <>
                    <Button
                      type="dashed"
                      onClick={() =>
                        add({
                          materialId: "",
                          itemCode: "",
                          itemName: "",
                          quantity: 1,
                          unitPrice: 0,
                          unit: "",
                          totalAmount: 0,
                          notes: "",
                          isCustom: false,
                        })
                      }
                      block
                      icon={<PlusOutlined />}
                      className="mb-4"
                    >
                      Thêm nguyên liệu
                    </Button>

                    {fields.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded text-gray-500">
                        Chưa có nguyên liệu
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {fields.map(({ key, name, ...restField }) => (
                          <Card key={key} size="small">
                            <Row gutter={8} align="bottom">
                              <Col span={2}>
                                <Form.Item
                                  {...restField}
                                  name={[name, "isCustom"]}
                                >
                                  <Select placeholder="Loại">
                                    <Select.Option value={false}>
                                      📋 Danh sách
                                    </Select.Option>
                                    <Select.Option value={true}>
                                      ✏️ Tự nhập
                                    </Select.Option>
                                  </Select>
                                </Form.Item>
                              </Col>

                              <Form.Item
                                noStyle
                                shouldUpdate={(prevValues, currentValues) =>
                                  prevValues.items?.[name]?.isCustom !==
                                  currentValues.items?.[name]?.isCustom
                                }
                              >
                                {({ getFieldValue }) => {
                                  const isCustom = getFieldValue([
                                    "items",
                                    name,
                                    "isCustom",
                                  ]);
                                  return (
                                    <>
                                      <Col span={4}>
                                        {isCustom ? (
                                          <Form.Item
                                            {...restField}
                                            name={[name, "itemCode"]}
                                          >
                                            <Input placeholder="Mã" />
                                          </Form.Item>
                                        ) : (
                                          <div className="text-xs text-gray-500 p-2">
                                            {getFieldValue([
                                              "items",
                                              name,
                                              "itemCode",
                                            ]) || "-"}
                                          </div>
                                        )}
                                      </Col>

                                      <Col span={6}>
                                        {isCustom ? (
                                          <Form.Item
                                            {...restField}
                                            name={[name, "itemName"]}
                                            rules={[
                                              {
                                                required: true,
                                                message: "Vui lòng nhập tên",
                                              },
                                            ]}
                                          >
                                            <Input placeholder="Tên sản phẩm/NVL" />
                                          </Form.Item>
                                        ) : (
                                          <Form.Item
                                            {...restField}
                                            name={[name, "materialId"]}
                                            rules={[
                                              {
                                                required: true,
                                                message: "Vui lòng chọn",
                                              },
                                            ]}
                                          >
                                            <Select placeholder="Chọn nguyên liệu">
                                              {materials.map(
                                                (material: Material) => (
                                                  <Select.Option
                                                    key={material.id}
                                                    value={material.id}
                                                  >
                                                    {material.materialName}
                                                  </Select.Option>
                                                )
                                              )}
                                            </Select>
                                          </Form.Item>
                                        )}
                                      </Col>

                                      <Col span={2}>
                                        {isCustom ? (
                                          <Form.Item
                                            {...restField}
                                            name={[name, "unit"]}
                                            rules={[
                                              {
                                                required: true,
                                                message: "Vui lòng nhập ĐVT",
                                              },
                                            ]}
                                          >
                                            <Input placeholder="ĐVT" />
                                          </Form.Item>
                                        ) : (
                                          <div className="text-xs p-2">
                                            {getFieldValue([
                                              "items",
                                              name,
                                              "unit",
                                            ]) || "-"}
                                          </div>
                                        )}
                                      </Col>

                                      <Col span={2}>
                                        <Form.Item
                                          {...restField}
                                          name={[name, "quantity"]}
                                          rules={[
                                            {
                                              required: true,
                                              message: "Vui lòng nhập SL",
                                            },
                                          ]}
                                        >
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="SL"
                                          />
                                        </Form.Item>
                                      </Col>

                                      <Col span={4}>
                                        <Form.Item
                                          {...restField}
                                          name={[name, "unitPrice"]}
                                          rules={[
                                            {
                                              required: true,
                                              message: "Vui lòng nhập đơn giá",
                                            },
                                          ]}
                                        >
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="Đơn giá"
                                          />
                                        </Form.Item>
                                      </Col>

                                      <Col span={2}>
                                        <Form.Item
                                          {...restField}
                                          name={[name, "notes"]}
                                        >
                                          <Input placeholder="Ghi chú" />
                                        </Form.Item>
                                      </Col>

                                      <Col span={2}>
                                        <Button
                                          type="text"
                                          danger
                                          icon={<CloseOutlined />}
                                          onClick={() => remove(name)}
                                        />
                                      </Col>
                                    </>
                                  );
                                }}
                              </Form.Item>
                            </Row>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Form.List>
            </Form.Item>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setShowCreateModal(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createOrderMutation.isPending}
              >
                Tạo đơn đặt hàng
              </Button>
            </div>
          </Form>
        </Modal>
      </WrapperContent>
    </>
  );
}
