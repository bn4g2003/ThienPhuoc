"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { PropRowDetails } from "@/types/table";
import { formatCurrency } from "@/utils/format";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tag
} from "antd";
import { useState } from "react";

interface Item {
  id: number;
  itemCode: string;
  itemName: string;
  itemType: "PRODUCT" | "MATERIAL";
  productId?: number;
  materialId?: number;
  categoryId?: number;
  categoryName?: string;
  unit: string;
  costPrice: number;
  isActive: boolean;
  isSellable: boolean;
  sourceName?: string;
  sourceCode?: string;
}



interface ItemCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
}

export default function ItemsPage() {
  const { can, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form] = Form.useForm();
  const { modal, message } = App.useApp();

  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Fetch items using TanStack Query
  const {
    data: items = [],
    isLoading: itemsLoading,
    isFetching: itemsFetching,
  } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetch("/api/products/items");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    enabled: can("products", "view"),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["item-categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/item-categories");
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
    enabled: can("products", "view"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/items/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa hàng hoá thành công");
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editingItem
        ? `/api/products/items/${editingItem.id}`
        : "/api/products/items";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success(
        editingItem ? "Cập nhật thành công" : "Tạo hàng hoá thành công"
      );
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    form.setFieldsValue({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemType: item.itemType,
      categoryId: item.categoryId,
      unit: item.unit,
      costPrice: item.costPrice,
      isSellable: item.isSellable,
    });
    setShowModal(true);
  };

  const onConfirmDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa hàng hoá này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch {
      // validation error
    }
  };

  const handleItemTypeChange = (type: string) => {
    // Khi đổi loại, set giá trị mặc định cho isSellable
    // PRODUCT = true (có thể bán), MATERIAL = false (không bán)
    form.setFieldsValue({
      isSellable: type === "PRODUCT",
      costPrice: 0,
    });
  };

  // Toggle sellable mutation
  const toggleSellableMutation = useMutation({
    mutationFn: async ({ id, isSellable }: { id: number; isSellable: boolean }) => {
      const res = await fetch(`/api/products/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSellable }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Cập nhật thành công");
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handleToggleSellable = (item: Item) => {
    toggleSellableMutation.mutate({ id: item.id, isSellable: !item.isSellable });
  };

  // Filter items using useFilter
  const filteredItems = applyFilter(items);

  // Define table columns with required properties
  const defaultColumns = [
    {
      title: "Mã",
      dataIndex: "itemCode",
      key: "itemCode",
      width: 120,
      fixed: "left" as const,
    },
    {
      title: "Tên",
      dataIndex: "itemName",
      key: "itemName",
      width: 200,
    },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 150,
    },
    {
      title: "Loại",
      dataIndex: "itemType",
      key: "itemType",
      width: 100,
      render: (value: string) => (
        <Tag color={value === "PRODUCT" ? "blue" : "green"}>
          {value === "PRODUCT" ? "Sản phẩm" : "NVL"}
        </Tag>
      ),
    },
    {
      title: "Nguồn",
      dataIndex: "sourceName",
      key: "sourceName",
      width: 150,
      render: (_: unknown, record: Item) =>
        `${record.sourceName} (${record.sourceCode})`,
    },
    {
      title: "ĐVT",
      dataIndex: "unit",
      key: "unit",
      width: 80,
    },
    {
      title: "Giá bán",
      dataIndex: "costPrice",
      key: "costPrice",
      width: 120,
      align: "right" as const,
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Có thể bán",
      dataIndex: "isSellable",
      key: "isSellable",
      width: 110,
      render: (value: boolean, record: Item) => (
        <Switch
          checked={value}
          onChange={() => handleToggleSellable(record)}
          checkedChildren="Có"
          unCheckedChildren="Không"
          loading={toggleSellableMutation.isPending}
          disabled={!can("products", "edit")}
        />
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (value: boolean) => (
        <Tag color={value ? "success" : "default"}>
          {value ? "Hoạt động" : "Ngừng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right" as const,
      render: (_: unknown, record: Item) => (
        <TableActions
          canView={false}
          canEdit={can("products", "edit")}
          canDelete={can("products", "delete")}
          onEdit={() => handleEdit(record)}
          onDelete={() => onConfirmDelete(record.id)}
        />
      ),
    },
  ];

  // Initialize column visibility hook
  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  // Initialize file export hook
  const { exportToXlsx } = useFileExport(getVisibleColumns());

  // Handle export to Excel
  const handleExportExcel = () => {
    exportToXlsx(filteredItems, "items");
  };

  return (
    <>
      <WrapperContent<Item>
        title="Quản lý hàng hoá"
        isNotAccessible={!can("products", "view")}
        isLoading={permLoading}
        isRefetching={itemsFetching}
        isEmpty={items.length === 0}
        header={{
          refetchDataWithKeys: ["items"],
          buttonEnds: [
            {
              can: can("products", "create"),
              type: "primary",
              name: "Thêm",
              onClick: handleCreate,
              icon: <PlusOutlined />,
            },
            {
              can: can("products", "view"),
              type: "default",
              name: "Xuất Excel",
              onClick: handleExportExcel,
              icon: <DownloadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã, tên hàng hoá...",
            filterKeys: ["itemCode", "itemName"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "itemType",
                label: "Loại hàng",
                options: [
                  { label: "Sản phẩm", value: "PRODUCT" },
                  { label: "Nguyên vật liệu", value: "MATERIAL" },
                ],
              },
              {
                type: "select",
                name: "isSellable",
                label: "Có thể bán",
                options: [
                  { label: "Có", value: "true" },
                  { label: "Không", value: "false" },
                ],
              },
            ],
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: updateColumns,
            onReset: resetColumns,
          },
        }}
      >
        <CommonTable
          DrawerDetails={({ data, onClose }: PropRowDetails<Item>) => (
            <div className="space-y-4">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Mã hàng">
                  {data?.itemCode}
                </Descriptions.Item>
                <Descriptions.Item label="Tên hàng hoá">
                  {data?.itemName}
                </Descriptions.Item>
                <Descriptions.Item label="Danh mục">
                  {data?.categoryName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Loại">
                  <Tag color={data?.itemType === "PRODUCT" ? "blue" : "green"}>
                    {data?.itemType === "PRODUCT" ? "Sản phẩm" : "NVL"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Nguồn">
                  {data?.sourceName} ({data?.sourceCode})
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị tính">
                  {data?.unit}
                </Descriptions.Item>
                <Descriptions.Item label="Giá bán">
                  {formatCurrency(data?.costPrice)}
                </Descriptions.Item>
                <Descriptions.Item label="Có thể bán">
                  <Tag color={data?.isSellable ? "green" : "default"}>
                    {data?.isSellable ? "Có" : "Không"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={data?.isActive ? "success" : "default"}>
                    {data?.isActive ? "Hoạt động" : "Ngừng"}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <div className="flex gap-2 justify-end mt-4">
                {can("products", "edit") && (
                  <Button
                    type="primary"
                    onClick={() => {
                      if (data) {
                        handleEdit(data);
                        onClose();
                      }
                    }}
                  >
                    Sửa
                  </Button>
                )}
                {can("products", "delete") && (
                  <Button
                    danger
                    onClick={() => {
                      if (data) {
                        onConfirmDelete(data.id);
                      }
                    }}
                  >
                    Xóa
                  </Button>
                )}
              </div>
            </div>
          )}
          columns={getVisibleColumns()}
          dataSource={filteredItems as Item[]}
          loading={permLoading || itemsLoading || itemsFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
        />
      </WrapperContent>

      <Modal
        title={editingItem ? "Sửa hàng hoá" : "Thêm hàng hoá"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ isSellable: true }}>
          <Form.Item
            name="itemCode"
            label="Mã hàng hoá"
            rules={[{ required: true, message: "Vui lòng nhập mã" }]}
            extra="Mã này cũng sẽ được dùng làm mã sản phẩm/NVL"
          >
            <Input placeholder="VD: HH001" disabled={!!editingItem} />
          </Form.Item>

          <Form.Item
            name="itemName"
            label="Tên hàng hoá"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="VD: Áo thun nam, Vải cotton..." />
          </Form.Item>

          <Form.Item name="categoryId" label="Danh mục">
            <Select
              placeholder="Chọn danh mục (tùy chọn)"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {categories.map((c: ItemCategory) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.categoryName} ({c.categoryCode})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="itemType"
            label="Loại hàng"
            rules={[{ required: true, message: "Vui lòng chọn loại" }]}
            extra="Hệ thống sẽ tự động tạo Sản phẩm hoặc NVL tương ứng"
          >
            <Select
              placeholder="Chọn loại"
              onChange={handleItemTypeChange}
              disabled={!!editingItem}
            >
              <Select.Option value="PRODUCT">Sản phẩm (thành phẩm)</Select.Option>
              <Select.Option value="MATERIAL">Nguyên vật liệu</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="unit"
            label="Đơn vị tính"
            rules={[{ required: true, message: "Vui lòng nhập ĐVT" }]}
          >
            <Input placeholder="VD: Cái, Mét, Kg, Bộ..." />
          </Form.Item>

          <Form.Item name="costPrice" label="Giá bán">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              placeholder="Nhập giá bán"
            />
          </Form.Item>

          <Form.Item
            name="isSellable"
            label="Có thể bán"
            valuePropName="checked"
            extra="Sản phẩm mặc định có thể bán, NVL mặc định không bán"
          >
            <Select>
              <Select.Option value={true}>Có - Hiển thị khi tạo đơn hàng</Select.Option>
              <Select.Option value={false}>Không - Chỉ dùng nội bộ</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
