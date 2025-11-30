"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Select, Space, Table, message } from "antd";
import { useState } from "react";

type TransferFormProps = {
  fromWarehouseId: number;
  onSuccess: () => void;
  onCancel: () => void;
};

type TransferItem = {
  key: string;
  materialId?: number;
  productId?: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  availableQuantity: number;
  unitPrice: number;
  totalAmount: number;
};

export default function TransferForm({ fromWarehouseId, onSuccess, onCancel }: TransferFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToWarehouse, setSelectedToWarehouse] = useState<number | undefined>();

  // Lấy thông tin kho xuất
  const { data: fromWarehouse } = useQuery({
    queryKey: ["warehouse", fromWarehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/warehouses`);
      const body = await res.json();
      const warehouses = body.success ? body.data : [];
      return warehouses.find((w: any) => w.id === fromWarehouseId);
    },
  });

  // Lấy danh sách kho nhập (cùng loại với kho xuất, trừ kho xuất)
  const { data: toWarehouses = [] } = useQuery({
    queryKey: ["warehouses", fromWarehouse?.warehouseType],
    enabled: !!fromWarehouse,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/warehouses`);
      const body = await res.json();
      if (!body.success) return [];
      return body.data.filter(
        (w: any) => 
          w.warehouseType === fromWarehouse.warehouseType && 
          w.id !== fromWarehouseId
      );
    },
  });

  // Lấy danh sách hàng hóa có tồn kho trong kho xuất
  const { data: availableItems = [] } = useQuery({
    queryKey: ["warehouse-balance", fromWarehouseId, fromWarehouse?.warehouseType],
    enabled: !!fromWarehouse,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/balance?warehouseId=${fromWarehouseId}`);
      const body = await res.json();
      if (!body.success) return [];
      // Chỉ lấy items có tồn kho > 0
      return body.data.filter((item: any) => item.quantity > 0);
    },
  });

  const handleAddItem = () => {
    const selectedItemId = form.getFieldValue("selectedItem");
    const quantity = form.getFieldValue("quantity");

    if (!selectedItemId || !quantity) {
      message.warning("Vui lòng chọn hàng hóa và nhập số lượng");
      return;
    }

    const selectedItem = availableItems.find((item: any) => {
      if (fromWarehouse.warehouseType === "NVL") {
        return item.materialId === selectedItemId;
      } else {
        return item.productId === selectedItemId;
      }
    });

    if (!selectedItem) return;

    if (quantity > selectedItem.quantity) {
      message.warning(`Số lượng tồn kho chỉ còn ${selectedItem.quantity} ${selectedItem.unit}`);
      return;
    }

    const newItem: TransferItem = {
      key: Date.now().toString(),
      materialId: fromWarehouse.warehouseType === "NVL" ? selectedItem.materialId : undefined,
      productId: fromWarehouse.warehouseType === "THANH_PHAM" ? selectedItem.productId : undefined,
      itemCode: selectedItem.itemCode,
      itemName: selectedItem.itemName,
      quantity,
      unit: selectedItem.unit,
      availableQuantity: selectedItem.quantity,
      unitPrice: selectedItem.unitPrice || 0,
      totalAmount: quantity * (selectedItem.unitPrice || 0),
    };

    setItems([...items, newItem]);
    form.setFieldsValue({ selectedItem: undefined, quantity: undefined });
  };

  const handleRemoveItem = (key: string) => {
    setItems(items.filter((item) => item.key !== key));
  };

  const handleSubmit = async () => {
    if (!selectedToWarehouse) {
      message.warning("Vui lòng chọn kho nhập");
      return;
    }

    if (items.length === 0) {
      message.warning("Vui lòng thêm ít nhất một hàng hóa");
      return;
    }

    const notes = form.getFieldValue("notes");

    setLoading(true);
    try {
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId,
          toWarehouseId: selectedToWarehouse,
          notes,
          items: items.map((item) => ({
            materialId: item.materialId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      const body = await res.json();

      if (body.success) {
        message.success("Tạo phiếu luân chuyển kho thành công");
        onSuccess();
      } else {
        message.error(body.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      message.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Mã", dataIndex: "itemCode", key: "itemCode", width: 120 },
    { title: "Tên", dataIndex: "itemName", key: "itemName" },
    { 
      title: "Số lượng", 
      dataIndex: "quantity", 
      key: "quantity", 
      width: 100, 
      align: "right" as const,
      render: (val: number, record: TransferItem) => (
        <div>
          <div>{val.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Tồn: {record.availableQuantity}</div>
        </div>
      ),
    },
    { title: "ĐVT", dataIndex: "unit", key: "unit", width: 80 },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      align: "right" as const,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: "Thành tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 120,
      align: "right" as const,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      render: (_: any, record: TransferItem) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record.key)} />
      ),
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-4">
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Form.Item label="Kho xuất">
            <Input value={fromWarehouse?.warehouseName} disabled />
          </Form.Item>
          <Form.Item label="Kho nhập" required>
            <Select
              placeholder="Chọn kho nhập"
              value={selectedToWarehouse}
              onChange={setSelectedToWarehouse}
              options={toWarehouses.map((w: any) => ({
                label: `${w.warehouseName} (${w.branchName || ""})`,
                value: w.id,
              }))}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Form.Item label="Hàng hóa" name="selectedItem" className="col-span-2">
            <Select
              showSearch
              placeholder="Chọn hàng hóa"
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={availableItems.map((item: any) => ({
                label: `${item.itemCode} - ${item.itemName} (Tồn: ${item.quantity} ${item.unit})`,
                value: fromWarehouse?.warehouseType === "NVL" ? item.materialId : item.productId,
              }))}
            />
          </Form.Item>
          <Form.Item label="Số lượng" name="quantity">
            <InputNumber min={1} style={{ width: "100%" }} placeholder="Số lượng" />
          </Form.Item>
        </div>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItem} block>
          Thêm hàng hóa
        </Button>
      </Form>

      <Table
        columns={columns}
        dataSource={items}
        pagination={false}
        size="small"
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={5} align="right">
              <strong>Tổng cộng:</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <strong>{totalAmount.toLocaleString()}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
          </Table.Summary.Row>
        )}
      />

      <Form form={form} layout="vertical">
        <Form.Item label="Ghi chú" name="notes">
          <Input.TextArea rows={3} placeholder="Ghi chú (tùy chọn)" />
        </Form.Item>
      </Form>

      <Space className="flex justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" onClick={handleSubmit} loading={loading}>
          Tạo phiếu luân chuyển
        </Button>
      </Space>
    </div>
  );
}
