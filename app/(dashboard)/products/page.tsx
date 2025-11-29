"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useBranches } from "@/hooks/useCommonQuery";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PRODUCT_KEYS,
  useCategories,
  useProducts,
} from "@/hooks/useProductQuery";
import type { Product } from "@/services/productService";
import { PropRowDetails } from "@/types/table";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  PlusOutlined,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Tag,
  type TableColumnsType,
} from "antd";
import { useState } from "react";

export default function ProductsPage() {
  const { can, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();

  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [form] = Form.useForm();

  // Filter hook
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Column visibility hook
  const defaultColumns = [
    {
      title: "Mã",
      dataIndex: "productCode",
      key: "productCode",
      width: 100,
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "productName",
      key: "productName",
      width: 160,
      fixed: "left" as const,
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 200,
    },
    {
      title: "Danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 150,
      render: (text: string) => text || "-",
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 100,
    },
    {
      title: "Giá vốn",
      dataIndex: "costPrice",
      key: "costPrice",
      width: 120,
      render: (value: number) =>
        value ? `${value.toLocaleString("vi-VN")}đ` : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag
          color={isActive ? "success" : "error"}
          icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}
        >
          {isActive ? "Hoạt động" : "Khóa"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right" as const,
      render: (_: unknown, record: Product) => (
        <TableActions
          canEdit={can("products.products", "edit")}
          canDelete={can("products.products", "delete")}
          onEdit={() => handleEdit(record)}
          onDelete={() => onConfirmDelete(record.id)}
        />
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns });

  // Data hooks
  const { data: branches = [] } = useBranches();
  const { data: products = [], isLoading, isFetching } = useProducts();
  const { data: categories = [] } = useCategories();

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa thành công");
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editingItem
        ? `/api/products/${editingItem.id}`
        : "/api/products";
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
      message.success(editingItem ? "Cập nhật thành công" : "Tạo thành công");
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Event handlers
  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (item: Product) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setShowModal(true);
  };

  const handleView = (item: Product) => {
    setEditingItem(item);
  };

  const onConfirmDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa sản phẩm này?",
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

  // Apply client-side filtering
  const filteredProducts = applyFilter(products);

  // Export handler (placeholder)
  const handleExportExcel = () => {
    // TODO: Implement export functionality
  };

  const columns: TableColumnsType<Product> = getVisibleColumns();

  return (
    <>
      <WrapperContent<Product>
        title="Sản phẩm"
        isNotAccessible={!can("products.products", "view")}
        isLoading={isLoading || isFetching}
        isEmpty={!products?.length}
        header={{
          buttonBackTo: "/products/items",
          refetchDataWithKeys: PRODUCT_KEYS.all,
          buttonEnds: can("products.products", "create")
            ? [
                {
                  type: "primary",
                  name: "Thêm",
                  onClick: handleCreate,
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
                  onClick: () => {},
                  icon: <UploadOutlined />,
                },
              ]
            : undefined,
          searchInput: {
            placeholder: "Tìm kiếm sản phẩm",
            filterKeys: [
              "productCode",
              "productName",
              "categoryName",
              "description",
              "costPrice",
              "unit",
              "branchName",
            ],
          },
          filters: {
            fields: [
              ...(isAdmin
                ? [
                    {
                      type: "select" as const,
                      name: "branchId",
                      label: "Chi nhánh",
                      options: branches.map((branch) => ({
                        label: branch.branchName,
                        value: branch.id.toString(),
                      })),
                    },
                  ]
                : []),
              {
                type: "select",
                name: "categoryId",
                label: "Danh mục",
                options: categories.map((cat) => ({
                  label: cat.categoryName,
                  value: cat.id.toString(),
                })),
              },
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: "true" },
                  { label: "Khóa", value: "false" },
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
          DrawerDetails={({ data }: PropRowDetails<Product>) => (
            <div>
              <Descriptions title="Thông tin sản phẩm" bordered column={2}>
                <Descriptions.Item label="Mã sản phẩm">
                  {data?.productCode}
                </Descriptions.Item>
                <Descriptions.Item label="Tên sản phẩm">
                  {data?.productName}
                </Descriptions.Item>
                <Descriptions.Item label="Chi nhánh">
                  {data?.branchName}
                </Descriptions.Item>
                <Descriptions.Item label="Danh mục">
                  {data?.categoryName || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị">
                  {data?.unit}
                </Descriptions.Item>
                <Descriptions.Item label="Giá vốn">
                  {data?.costPrice
                    ? `${data.costPrice.toLocaleString("vi-VN")}đ`
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag
                    color={data?.isActive ? "success" : "error"}
                    icon={
                      data?.isActive ? (
                        <CheckCircleOutlined />
                      ) : (
                        <StopOutlined />
                      )
                    }
                  >
                    {data?.isActive ? "Hoạt động" : "Khóa"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả">
                  {data?.description || "-"}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
          columns={columns}
          dataSource={filteredProducts as Product[]}
          loading={isLoading || deleteMutation.isPending || isFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
        />
      </WrapperContent>

      <Modal
        title={editingItem ? "Sửa sản phẩm" : "Thêm sản phẩm"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saveMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="productCode"
            label="Mã sản phẩm"
            rules={[{ required: true, message: "Vui lòng nhập mã sản phẩm" }]}
          >
            <Input placeholder="Nhập mã sản phẩm" />
          </Form.Item>
          <Form.Item
            name="productName"
            label="Tên sản phẩm"
            rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
          >
            <Input placeholder="Nhập tên sản phẩm" />
          </Form.Item>
          <Form.Item name="categoryId" label="Danh mục">
            <Select placeholder="Chọn danh mục">
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.categoryName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị">
            <Input placeholder="Nhập đơn vị" />
          </Form.Item>
          <Form.Item name="costPrice" label="Giá vốn">
            <Input type="number" placeholder="Nhập giá vốn" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea placeholder="Nhập mô tả" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
