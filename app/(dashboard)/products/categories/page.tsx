"use client";

import CategoryForm from "@/components/categories/CategoryForm";
import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { Category, CategoryFormValues } from "@/types/category";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  PlusOutlined,
  UploadOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { App, Button, Descriptions, Drawer, Dropdown, Modal } from "antd";
import Link from "next/link";
import { useState } from "react";

export default function CategoriesPage() {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();

  const {
    data: categories = [],
    isLoading,
    isFetching,
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/categories");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await fetch("/api/products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CategoryFormValues>;
    }) => {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const filtered = applyFilter<Category>(categories);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  const handleView = (row: Category) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Category) => {
    setModalMode("edit");
    setSelected(row);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa danh mục này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleSubmit = (values: CategoryFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate(
        { id: selected.id, data: values },
        { onSuccess: () => setModalOpen(false) }
      );
    }
  };

  const columnsAll: TableColumnsType<Category> = [
    {
      title: "Mã danh mục",
      dataIndex: "categoryCode",
      key: "categoryCode",
      width: 140,
    },
    {
      title: "Tên danh mục",
      dataIndex: "categoryName",
      key: "categoryName",
      width: 220,
    },
    {
      title: "Danh mục cha",
      dataIndex: "parentName",
      key: "parentName",
      width: 180,
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Category) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
        ];
        if (can("products.categories", "edit"))
          menuItems.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
        if (can("products.categories", "delete"))
          menuItems.push({
            key: "delete",
            label: "Xóa",
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record.id),
          });

        return (
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomLeft"
          >
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  return (
    <>
      {/* Nút trở lại Hàng hoá */}
      <div className="mb-4">
        <Link href="/products/items">
          <Button icon={<ArrowLeftOutlined />} type="default">
            Trở lại Hàng hoá
          </Button>
        </Link>
      </div>

      <WrapperContent<Category>
        isNotAccessible={!can("products.categories", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["categories"],
          buttonEnds: can("products.categories", "create")
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
                  onClick: () => {},
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
            placeholder: "Tìm kiếm danh mục",
            filterKeys: ["categoryName", "categoryCode", "description"],
          },
          filters: {
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: (c) => updateColumns(c),
            onReset: () => resetColumns(),
          },
        }}
      >
        <CommonTable
          columns={getVisibleColumns()}
          dataSource={filtered}
          loading={isLoading || isFetching || deleteMutation.isPending}
          paging
          rank
        />
      </WrapperContent>

      <Drawer
        size={640}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Chi tiết danh mục"
      >
        {selected ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Mã danh mục">
              {selected.categoryCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên danh mục">
              {selected.categoryName}
            </Descriptions.Item>
            <Descriptions.Item label="Danh mục cha">
              {selected.parentName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {selected.description || "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={modalMode === "create" ? "Tạo danh mục" : "Sửa danh mục"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        key={selected?.id || "create"}
        destroyOnHidden
      >
        <CategoryForm
          mode={modalMode}
          initialValues={
            selected
              ? {
                  categoryCode: selected.categoryCode,
                  categoryName: selected.categoryName,
                  parentId: selected.parentId,
                  description: selected.description,
                }
              : undefined
          }
          categories={categories}
          excludeId={selected?.id}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </>
  );
}
