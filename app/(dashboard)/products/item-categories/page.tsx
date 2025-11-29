"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { PropRowDetails } from "@/types/table";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Select,
  Tag,
} from "antd";
import { useState } from "react";

const { TextArea } = Input;

interface ItemCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  parentId?: number;
  parentName?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ItemCategoriesPage() {
  const { can, loading: permLoading } = usePermissions();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(
    null
  );
  const [form] = Form.useForm();

  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  // Fetch categories using TanStack Query
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
  } = useQuery({
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
      const res = await fetch(`/api/products/item-categories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa danh mục thành công");
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const url = editingCategory
        ? `/api/products/item-categories/${editingCategory.id}`
        : "/api/products/item-categories";
      const method = editingCategory ? "PUT" : "POST";

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
        editingCategory ? "Cập nhật thành công" : "Tạo danh mục thành công"
      );
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    setShowModal(true);
  };

  const handleEdit = (category: ItemCategory) => {
    setEditingCategory(category);
    form.setFieldsValue({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      parentId: category.parentId,
      description: category.description,
    });
    setShowModal(true);
  };

  const onConfirmDelete = (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc chắn muốn xóa danh mục này?",
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

  // Filter categories using useFilter
  const filteredCategories = applyFilter(categories);

  // Define table columns with required properties
  const defaultColumns = [
    {
      title: "Mã danh mục",
      dataIndex: "categoryCode",
      key: "categoryCode",
      width: 120,
      fixed: "left" as const,
    },
    {
      title: "Tên danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 200,
    },
    {
      title: "Danh mục cha",
      dataIndex: "parentName",
      key: "parentName",
      width: 150,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 200,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (value: boolean, record: ItemCategory) => (
        <Tag color={record.isActive ? "success" : "default"}>
          {record.isActive ? "Hoạt động" : "Ngừng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      fixed: "right" as const,
      render: (_: unknown, record: ItemCategory) => (
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
    exportToXlsx(filteredCategories, "item-categories");
  };
  return (
    <>
      <WrapperContent<ItemCategory>
        title="Danh mục hàng hoá"
        isNotAccessible={!can("products", "view")}
        isLoading={permLoading}
        isRefetching={categoriesFetching}
        isEmpty={categories.length === 0}
        header={{
          buttonBackTo: "/dashboard/products",
          refetchDataWithKeys: ["item-categories"],
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
            placeholder: "Tìm theo mã, tên danh mục...",
            filterKeys: ["categoryCode", "categoryName"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "isActive",
                label: "Trạng thái",
                options: [
                  { label: "Hoạt động", value: true },
                  { label: "Ngừng", value: false },
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
          DrawerDetails={({ data, onClose }: PropRowDetails<ItemCategory>) => {
            return (
              <div className="space-y-4">
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Mã danh mục">
                    {data?.categoryCode}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tên danh mục">
                    {data?.categoryName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Danh mục cha">
                    {data?.parentName || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Mô tả">
                    {data?.description || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={data?.isActive ? "success" : "default"}>
                      {data?.isActive ? "Hoạt động" : "Ngừng"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày tạo">
                    {data?.createdAt}
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
            );
          }}
          columns={getVisibleColumns()}
          dataSource={filteredCategories as ItemCategory[]}
          loading={permLoading || categoriesLoading || categoriesFetching}
          pagination={{ ...pagination, onChange: handlePageChange }}
        />
      </WrapperContent>

      <Modal
        title={editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="categoryCode"
            label="Mã danh mục"
            rules={[{ required: true, message: "Vui lòng nhập mã" }]}
          >
            <Input placeholder="VD: DM001" disabled={!!editingCategory} />
          </Form.Item>

          <Form.Item
            name="categoryName"
            label="Tên danh mục"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input placeholder="Nhập tên danh mục" />
          </Form.Item>

          <Form.Item name="parentId" label="Danh mục cha">
            <Select
              placeholder="Chọn danh mục cha (nếu có)"
              allowClear
              showSearch
            >
              {categories
                .filter(
                  (c: ItemCategory) =>
                    !editingCategory || c.id !== editingCategory.id
                )
                .map((c: ItemCategory) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.categoryName} ({c.categoryCode})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
