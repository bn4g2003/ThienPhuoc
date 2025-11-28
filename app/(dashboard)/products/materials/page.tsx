"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useBranches } from "@/hooks/useCommonQuery";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
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
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Tag,
} from "antd";
import Link from "next/link";
import { useState } from "react";

interface Material {
  id: number;
  materialCode: string;
  materialName: string;
  unit: string;
  description?: string;
  branchName: string;
}

type MaterialFormValues = {
  materialCode: string;
  materialName: string;
  unit: string;
  description?: string;
};

const UNIT_OPTIONS = [
  {
    label: "Độ dài",
    options: [
      { label: "mét (m)", value: "mét" },
      { label: "centimet (cm)", value: "cm" },
      { label: "milimét (mm)", value: "mm" },
    ],
  },
  {
    label: "Khối lượng",
    options: [
      { label: "kilogram (kg)", value: "kg" },
      { label: "gram (g)", value: "gram" },
      { label: "tấn", value: "tấn" },
    ],
  },
  {
    label: "Thể tích",
    options: [
      { label: "lít (l)", value: "lít" },
      { label: "mililít (ml)", value: "ml" },
    ],
  },
  {
    label: "Số lượng",
    options: [
      { label: "cái", value: "cái" },
      { label: "chiếc", value: "chiếc" },
      { label: "bộ", value: "bộ" },
      { label: "hộp", value: "hộp" },
      { label: "thùng", value: "thùng" },
      { label: "cuộn", value: "cuộn" },
      { label: "tấm", value: "tấm" },
      { label: "viên", value: "viên" },
    ],
  },
];

export default function MaterialsPage() {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const queryClient = useQueryClient();
  const { data: branches = [] } = useBranches();

  const {
    data: materials = [],
    isLoading,
    isFetching,
  } = useQuery<Material[]>({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await fetch("/api/products/materials");
      const body = await res.json();
      return body.success ? body.data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MaterialFormValues) => {
      const res = await fetch("/api/products/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<MaterialFormValues>;
    }) => {
      const res = await fetch(`/api/products/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materials"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/materials/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materials"] }),
  });

  const filtered = applyFilter<Material>(materials);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Material | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();

  const handleView = (row: Material) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelected(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Material) => {
    setModalMode("edit");
    setSelected(row);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa nguyên vật liệu này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleSubmit = (values: MaterialFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: () => setModalOpen(false) });
    } else if (selected) {
      updateMutation.mutate(
        { id: selected.id, data: values },
        { onSuccess: () => setModalOpen(false) }
      );
    }
  };

  const columnsAll: TableColumnsType<Material> = [
    {
      title: "Mã NVL",
      dataIndex: "materialCode",
      key: "materialCode",
      width: 120,
    },
    {
      title: "Tên nguyên vật liệu",
      dataIndex: "materialName",
      key: "materialName",
      width: 180,
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 100,
      render: (unit: string) => <Tag color="blue">{unit}</Tag>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (val: string | undefined) => val || "-",
    },
    {
      title: "Chi nhánh",
      dataIndex: "branchName",
      key: "branchName",
      width: 180,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_value: unknown, record: Material) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
        ];
        if (can("products.materials", "edit"))
          menuItems.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
        if (can("products.materials", "delete"))
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

      <WrapperContent<Material>
        isNotAccessible={!can("products.materials", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["materials"],
          buttonEnds: can("products.materials", "create")
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
            placeholder: "Tìm kiếm nguyên vật liệu",
            filterKeys: ["materialName", "materialCode", "description", "unit"],
          },
          filters: {
            fields: [
              {
                type: "select",
                label: "Đơn vị",
                name: "unit",
                options: UNIT_OPTIONS.flatMap((group) => group.options),
              },
              {
                type: "select" as const,
                name: "branchId",
                label: "Chi nhánh",
                options: branches.map((branch) => ({
                  label: branch.branchName,
                  value: branch.id.toString(),
                })),
              },
            ],
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
        title="Chi tiết nguyên vật liệu"
      >
        {selected ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Mã NVL">
              {selected.materialCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên nguyên vật liệu">
              {selected.materialName}
            </Descriptions.Item>
            <Descriptions.Item label="Đơn vị">
              <Tag color="blue">{selected.unit}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {selected.description || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              {selected.branchName}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={
          modalMode === "create" ? "Tạo nguyên vật liệu" : "Sửa nguyên vật liệu"
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        key={selected?.id || "create"}
        destroyOnHidden
      >
        <MaterialForm
          mode={modalMode}
          initialValues={
            selected
              ? {
                  materialCode: selected.materialCode,
                  materialName: selected.materialName,
                  unit: selected.unit,
                  description: selected.description,
                }
              : undefined
          }
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </>
  );
}

function MaterialForm({
  mode,
  initialValues,
  onCancel,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  initialValues?: Partial<MaterialFormValues>;
  onCancel: () => void;
  onSubmit: (v: MaterialFormValues) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm<MaterialFormValues>();

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(v) => onSubmit(v as MaterialFormValues)}
    >
      <Form.Item
        name="materialCode"
        label="Mã NVL"
        rules={[{ required: true, message: "Vui lòng nhập mã NVL" }]}
      >
        <Input disabled={mode === "edit"} />
      </Form.Item>
      <Form.Item
        name="materialName"
        label="Tên nguyên vật liệu"
        rules={[{ required: true, message: "Vui lòng nhập tên NVL" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="unit"
        label="Đơn vị"
        rules={[{ required: true, message: "Vui lòng chọn đơn vị" }]}
        extra="Chọn đơn vị phù hợp với loại nguyên vật liệu"
      >
        <Select
          placeholder="-- Chọn đơn vị --"
          options={UNIT_OPTIONS}
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>
      <Form.Item name="description" label="Mô tả">
        <Input.TextArea rows={3} />
      </Form.Item>
      <div className="flex gap-2 justify-end">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          Lưu
        </Button>
      </div>
    </Form>
  );
}
