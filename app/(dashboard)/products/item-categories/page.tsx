"use client";

import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import { useFileExport } from "@/hooks/useFileExport";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useCreateItemCategory,
  useDeleteItemCategory,
  useItemCategories,
  useUpdateItemCategory,
} from "@/hooks/useProductQuery";
import { ItemCategory } from "@/services/productService";
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { App, Form, Input, Modal, Select, Table, Tag } from "antd";
import { useState } from "react";

const { TextArea } = Input;

export default function ItemCategoriesPage() {
  const { can, loading: permLoading } = usePermissions();
  const { modal } = App.useApp();
  const { data: categories = [], isLoading } = useItemCategories();
  const createMutation = useCreateItemCategory();
  const updateMutation = useUpdateItemCategory();
  const deleteMutation = useDeleteItemCategory();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(
    null
  );
  const [filterQueries, setFilterQueries] = useState<Record<string, string>>(
    {}
  );
  const [form] = Form.useForm();

  const tableColumns = [
    {
      title: "Mã danh mục",
      dataIndex: "categoryCode",
      key: "categoryCode",
      render: (text: string) => <span className="font-mono">{text}</span>,
    },
    {
      title: "Tên danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Danh mục cha",
      dataIndex: "parentName",
      key: "parentName",
      render: (text: string) => (
        <span className="text-gray-600">{text || "-"}</span>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (text: string) => (
        <span className="text-gray-600">{text || "-"}</span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "default"}>
          {isActive ? "Hoạt động" : "Ngừng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: unknown, record: ItemCategory) => (
        <TableActions
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record.id)}
          canEdit={can("products", "edit")}
          canDelete={can("products", "delete")}
        />
      ),
    },
  ];

  const { exportToXlsx } = useFileExport<ItemCategory>(tableColumns);

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

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa danh mục",
      content: "Bạn có chắc chắn muốn xóa danh mục này không?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCategory) {
        updateMutation.mutate(
          { id: editingCategory.id, data: values },
          {
            onSuccess: () => {
              setShowModal(false);
              form.resetFields();
              setEditingCategory(null);
            },
          }
        );
      } else {
        createMutation.mutate(values, {
          onSuccess: () => {
            setShowModal(false);
            form.resetFields();
          },
        });
      }
    } catch {
      // validation error
    }
  };

  // Filter categories
  const filteredCategories = categories.filter((cat) => {
    const searchKey = "search,categoryCode,categoryName";
    const searchValue = filterQueries[searchKey] || "";
    const matchSearch =
      !searchValue ||
      cat.categoryCode.toLowerCase().includes(searchValue.toLowerCase()) ||
      cat.categoryName.toLowerCase().includes(searchValue.toLowerCase());

    return matchSearch;
  });

  return (
    <>
      <WrapperContent<ItemCategory>
        isNotAccessible={!can("products", "view")}
        isLoading={permLoading || isLoading}
        header={{
          buttonBackTo: "/products/items",
          buttonEnds: can("products", "create")
            ? [
                {
                  type: "default",
                  name: "Đặt lại",
                  onClick: () => setFilterQueries({}),
                  icon: <ReloadOutlined />,
                },
                {
                  type: "default",
                  name: "Xuất Excel",
                  onClick: () =>
                    exportToXlsx(filteredCategories, "item_categories"),
                  icon: <DownloadOutlined />,
                },
                {
                  type: "primary",
                  name: "Thêm danh mục",
                  onClick: handleCreate,
                  icon: <PlusOutlined />,
                },
              ]
            : [
                {
                  type: "default",
                  name: "Đặt lại",
                  onClick: () => setFilterQueries({}),
                  icon: <ReloadOutlined />,
                },
                {
                  type: "default",
                  name: "Xuất Excel",
                  onClick: () =>
                    exportToXlsx(filteredCategories, "item_categories"),
                  icon: <DownloadOutlined />,
                },
              ],
          searchInput: {
            placeholder: "Tìm theo mã, tên danh mục...",
            filterKeys: ["categoryCode", "categoryName"],
          },
          filters: {
            fields: [],
            onApplyFilter: (arr) => {
              const newQueries: Record<string, string> = { ...filterQueries };
              arr.forEach(({ key, value }) => {
                newQueries[key] = value;
              });
              setFilterQueries(newQueries);
            },
            onReset: () => setFilterQueries({}),
            query: filterQueries,
          },
        }}
      >
        <Table
          columns={tableColumns}
          dataSource={filteredCategories}
          rowKey="id"
          loading={isLoading}
          locale={{
            emptyText: (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-2">📁</div>
                <div>Chưa có danh mục</div>
              </div>
            ),
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} mục`,
          }}
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
        confirmLoading={createMutation.isPending || updateMutation.isPending}
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
              optionFilterProp="children"
            >
              {categories
                .filter((c) => !editingCategory || c.id !== editingCategory.id)
                .map((c) => (
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
