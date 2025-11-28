"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AppstoreOutlined,
  DownloadOutlined,
  InboxOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
} from "antd";
import Link from "next/link";
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
  sourceName?: string;
  sourceCode?: string;
}

interface Product {
  id: number;
  productCode: string;
  productName: string;
  unit: string;
  costPrice: number;
}

interface Material {
  id: number;
  materialCode: string;
  materialName: string;
  unit: string;
}

interface ItemCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
}

interface ItemFormValues {
  itemCode: string;
  itemName: string;
  itemType: "PRODUCT" | "MATERIAL";
  productId?: number;
  materialId?: number;
  categoryId?: number;
  unit: string;
  costPrice?: number;
}

export default function ItemsPage() {
  const { can, loading: permLoading } = usePermissions();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form] = Form.useForm();

  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Fetch items with filters
  const {
    data: itemsData,
    isLoading: itemsLoading,
    isRefetching: itemsRefetching,
  } = useQuery({
    queryKey: ["items", query],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          qs.append(key, String(value));
        }
      });
      const res = await fetch(`/api/products/items?${qs}`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: can("products", "view"),
  });

  // Fetch products for dropdown
  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      const data = await res.json();
      return data.success && data.data?.products ? data.data.products : [];
    },
    enabled: can("products", "view"),
  });

  // Fetch materials for dropdown
  const { data: materialsData } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await fetch("/api/products/materials");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: can("products", "view"),
  });

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ["item-categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/item-categories");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: can("products", "view"),
  });

  const items = applyFilter(itemsData ?? []);
  const products = productsData ?? [];
  const materials = materialsData ?? [];
  const categories = categoriesData ?? [];

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const res = await fetch("/api/products/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Tạo hàng hoá thành công");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setShowModal(false);
      form.resetFields();
    },
    onError: (error: Error) => {
      message.error(error.message || "Có lỗi xảy ra");
    },
  });

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: ItemFormValues;
    }) => {
      const res = await fetch(`/api/products/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Cập nhật thành công");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setShowModal(false);
      form.resetFields();
    },
    onError: (error: Error) => {
      message.error(error.message || "Có lỗi xảy ra");
    },
  });

  // Delete item mutation
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
      message.error(error.message || "Có lỗi xảy ra");
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
      productId: item.productId,
      materialId: item.materialId,
      categoryId: item.categoryId,
      unit: item.unit,
      costPrice: item.costPrice,
    });
    setShowModal(true);
  };

  const handleDelete = (item: Item) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: `Bạn có chắc muốn xóa hàng hoá "${item.itemName}"?`,
      okText: "Xóa",
      cancelText: "Hủy",
      onOk: () => deleteMutation.mutate(item.id),
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        updateMutation.mutate({ id: editingItem.id, values });
      } else {
        createMutation.mutate(values);
      }
    } catch {
      // validation error
    }
  };

  const handleItemTypeChange = () => {
    form.setFieldsValue({
      productId: undefined,
      materialId: undefined,
      unit: "",
      costPrice: 0,
    });
  };

  const handleSourceChange = (value: number, type: string) => {
    if (type === "PRODUCT") {
      const product = products.find((p: Product) => p.id === value);
      if (product) {
        form.setFieldsValue({
          unit: product.unit,
          costPrice: product.costPrice || 0,
        });
      }
    } else {
      const material = materials.find((m: Material) => m.id === value);
      if (material) {
        form.setFieldsValue({ unit: material.unit });
      }
    }
  };

  const columns = [
    {
      title: "Mã hàng",
      dataIndex: "itemCode",
      key: "itemCode",
      width: 120,
      fixed: "left" as const,
    },
    {
      title: "Tên hàng hoá",
      dataIndex: "itemName",
      key: "itemName",
      width: 200,
      fixed: "left" as const,
    },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 150,
      render: (value: string) => value || "-",
    },
    {
      title: "Loại",
      dataIndex: "itemType",
      key: "itemType",
      width: 120,
      render: (value: string) => (
        <Tag color={value === "PRODUCT" ? "blue" : "green"}>
          {value === "PRODUCT" ? "Sản phẩm" : "NVL"}
        </Tag>
      ),
    },
    {
      title: "Nguồn",
      key: "source",
      width: 200,
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
      render: (value: number) => `${(value || 0).toLocaleString()} đ`,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      align: "center" as const,
      render: (value: boolean) => (
        <Tag color={value ? "success" : "default"}>
          {value ? "Hoạt động" : "Ngừng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, record: Item) => (
        <TableActions
          onView={() => handleEdit(record)}
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record)}
          canView={can("products", "view")}
          canEdit={can("products", "edit")}
          canDelete={can("products", "delete")}
        />
      ),
    },
  ];

  const { exportToXlsx } = useFileExport<Item>(columns);

  return (
    <>
      {/* Các nút điều hướng nhanh */}
      <div className="mb-4">
        <Space size="middle">
          <Link href="/products/categories">
            <Button icon={<AppstoreOutlined />} type="default">
              Danh mục sản phẩm
            </Button>
          </Link>
          <Link href="/products">
            <Button icon={<AppstoreOutlined />} type="default">
              Sản phẩm
            </Button>
          </Link>
          <Link href="/products/materials">
            <Button icon={<InboxOutlined />} type="default">
              Nguyên vật liệu
            </Button>
          </Link>
        </Space>
      </div>

      <WrapperContent<Item>
        title="Quản lý hàng hoá"
        isNotAccessible={!can("products", "view")}
        isLoading={permLoading || itemsLoading}
        isRefetching={itemsRefetching}
        header={{
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
            ],
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
          refetchDataWithKeys: ["items"],
          buttonEnds: can("products", "create")
            ? [
                {
                  type: "default",
                  name: "Xuất Excel",
                  onClick: () => exportToXlsx(items as Item[], "items"),
                  icon: <DownloadOutlined />,
                },
                {
                  type: "primary",
                  name: "Thêm hàng hoá",
                  onClick: handleCreate,
                  icon: <PlusOutlined />,
                },
              ]
            : [
                {
                  type: "default",
                  name: "Xuất Excel",
                  onClick: () => exportToXlsx(items as Item[], "items"),
                  icon: <DownloadOutlined />,
                },
              ],
        }}
      >
        <CommonTable
          pagination={{ ...pagination, onChange: handlePageChange }}
          columns={columns}
          dataSource={items as Item[]}
          loading={itemsLoading}
          paging
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
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="itemCode"
            label="Mã hàng hoá"
            rules={[{ required: true, message: "Vui lòng nhập mã" }]}
          >
            <Input placeholder="VD: HH001" disabled={!!editingItem} />
          </Form.Item>

          <Form.Item
            name="itemName"
            label="Tên hàng hoá"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="Nhập tên hàng hoá" />
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
          >
            <Select
              placeholder="Chọn loại"
              onChange={handleItemTypeChange}
              disabled={!!editingItem}
            >
              <Select.Option value="PRODUCT">Sản phẩm</Select.Option>
              <Select.Option value="MATERIAL">Nguyên vật liệu</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.itemType !== cur.itemType}
          >
            {({ getFieldValue }) => {
              const itemType = getFieldValue("itemType");
              if (itemType === "PRODUCT") {
                return (
                  <Form.Item
                    name="productId"
                    label="Chọn sản phẩm"
                    rules={[{ required: true, message: "Vui lòng chọn" }]}
                  >
                    <Select
                      placeholder="Chọn sản phẩm"
                      showSearch
                      optionFilterProp="children"
                      onChange={(v) => handleSourceChange(v, "PRODUCT")}
                      disabled={!!editingItem}
                    >
                      {products.map((p: Product) => (
                        <Select.Option key={p.id} value={p.id}>
                          {p.productName} ({p.productCode})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              if (itemType === "MATERIAL") {
                return (
                  <Form.Item
                    name="materialId"
                    label="Chọn NVL"
                    rules={[{ required: true, message: "Vui lòng chọn" }]}
                  >
                    <Select
                      placeholder="Chọn nguyên vật liệu"
                      showSearch
                      optionFilterProp="children"
                      onChange={(v) => handleSourceChange(v, "MATERIAL")}
                      disabled={!!editingItem}
                    >
                      {materials.map((m: Material) => (
                        <Select.Option key={m.id} value={m.id}>
                          {m.materialName} ({m.materialCode})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="unit"
            label="Đơn vị tính"
            rules={[{ required: true, message: "Vui lòng nhập ĐVT" }]}
          >
            <Input placeholder="VD: Cái, Mét, Kg..." />
          </Form.Item>

          <Form.Item name="costPrice" label="Giá bán">
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              placeholder="Nhập giá bán"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
