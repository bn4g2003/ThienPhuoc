"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, InputNumber, Select, Space, Table, message } from "antd";
import { useState } from "react";

type ImportFormProps = {
  warehouseId: number;
  onSuccess: () => void;
  onCancel: () => void;
};

type ImportItem = {
  key: string;
  materialId?: number;
  productId?: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
};

export default function ImportForm({ warehouseId, onSuccess, onCancel }: ImportFormProps) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Lấy thông tin kho
  const { data: warehouse } = useQuery({
    queryKey: ["warehouse", warehouseId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/warehouses`);
      const body = await res.json();
      const warehouses = body.success ? body.data : [];
      return warehouses.find((w: any) => w.id === warehouseId);
    },
  });

  // Lấy danh sách TẤT CẢ materials hoặc products (không filter theo tồn kho)
  // Vì nhập kho có thể nhập bất kỳ item nào, kể cả item chưa có trong kho
  const { data: availableItems = [] } = useQuery({
    queryKey: ["all-items-import", warehouse?.warehouseType, warehouse?.id],
    enabled: !!warehouse,
    queryFn: async () => {
      const warehouseType = warehouse.warehouseType;
      const allItems: any[] = [];
      
      console.log(`📦 [ImportForm] Warehouse type: ${warehouseType}`);
      
      // Kho NVL hoặc kho hỗn hợp: lấy materials
      if (warehouseType === "NVL" || warehouseType === "HON_HOP") {
        console.log(`📦 [ImportForm] Fetching materials...`);
        const res = await fetch(`/api/products/materials`);
        const body = await res.json();
        console.log(`📦 [ImportForm] Materials response:`, body);
        if (body.success && body.data) {
          allItems.push(...body.data.map((m: any) => ({
            id: m.id,
            itemCode: m.materialCode,
            itemName: m.materialName,
            unit: m.unit,
            quantity: 0,
            itemType: 'NVL',
            materialId: m.id
          })));
        }
      }
      
      // Kho thành phẩm hoặc kho hỗn hợp: lấy products
      if (warehouseType === "THANH_PHAM" || warehouseType === "HON_HOP") {
        console.log(`📦 [ImportForm] Fetching products...`);
        const res = await fetch(`/api/products?limit=1000`);
        const body = await res.json();
        console.log(`📦 [ImportForm] Products response:`, body);
        if (body.success && body.data) {
          const products = body.data.products || body.data || [];
          allItems.push(...products.map((p: any) => ({
            id: p.id,
            itemCode: p.productCode,
            itemName: p.productName,
            unit: p.unit,
            quantity: 0,
            itemType: 'THANH_PHAM',
            productId: p.id
          })));
        }
      }
      
      console.log(`📦 [ImportForm] Total items: ${allItems.length}`, allItems);
      return allItems;
    },
  });

  const handleAddItem = () => {
    const selectedItemCode = form.getFieldValue("selectedItem");
    const quantity = form.getFieldValue("quantity");
    const unitPrice = form.getFieldValue("unitPrice");

    if (!selectedItemCode || !quantity || !unitPrice) {
      message.warning("Vui lòng chọn hàng hóa và nhập số lượng, đơn giá");
      return;
    }

    // Tìm item theo itemCode để hỗ trợ kho hỗn hợp
    const selectedItem = availableItems.find((item: any) => item.itemCode === selectedItemCode);

    if (!selectedItem) return;

    // Kiểm tra đã thêm item này chưa
    if (items.some(item => item.itemCode === selectedItemCode)) {
      message.warning("Hàng hóa này đã được thêm");
      return;
    }

    const newItem: ImportItem = {
      key: Date.now().toString(),
      materialId: selectedItem.materialId || undefined,
      productId: selectedItem.productId || undefined,
      itemCode: selectedItem.itemCode,
      itemName: selectedItem.itemName,
      quantity,
      unit: selectedItem.unit,
      unitPrice,
      totalAmount: quantity * unitPrice,
    };

    setItems([...items, newItem]);
    form.setFieldsValue({ selectedItem: undefined, quantity: undefined, unitPrice: undefined });
  };

  const handleRemoveItem = (key: string) => {
    setItems(items.filter((item) => item.key !== key));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      message.warning("Vui lòng thêm ít nhất một hàng hóa");
      return;
    }

    const notes = form.getFieldValue("notes");

    setLoading(true);
    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toWarehouseId: warehouseId,
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
        message.success("Tạo phiếu nhập kho thành công");
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
    { title: "Số lượng", dataIndex: "quantity", key: "quantity", width: 100, align: "right" as const },
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
      render: (_: any, record: ImportItem) => (
        <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record.key)} />
      ),
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-4">
      <Form form={form} layout="vertical">
        <div className="grid grid-cols-4 gap-4">
          <Form.Item label="Hàng hóa" name="selectedItem" className="col-span-2">
            <Select
              showSearch
              placeholder="Chọn hàng hóa"
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={availableItems.map((item: any) => ({
                label: `${item.itemCode} - ${item.itemName} (${item.itemType === 'NVL' ? 'NVL' : 'SP'})`,
                value: item.itemCode,
              }))}
            />
          </Form.Item>
          <Form.Item label="Số lượng" name="quantity">
            <InputNumber min={1} style={{ width: "100%" }} placeholder="Số lượng" />
          </Form.Item>
          <Form.Item label="Đơn giá" name="unitPrice">
            <InputNumber min={0} style={{ width: "100%" }} placeholder="Đơn giá" />
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
          Tạo phiếu nhập
        </Button>
      </Space>
    </div>
  );
}
