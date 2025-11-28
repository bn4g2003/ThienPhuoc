"use client";

import CommonTable from "@/components/CommonTable";
import CustomerGroupDetailDrawer from "@/components/customers/CustomerGroupDetailDrawer";
import CustomerGroupFormModal, {
  type CustomerGroupFormValues,
} from "@/components/customers/CustomerGroupFormModal";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import {
  CUSTOMER_GROUP_KEYS,
  useCreateCustomerGroup,
  useCustomerGroups,
  useDeleteCustomerGroup,
  useUpdateCustomerGroup,
} from "@/hooks/useCustomerGroupQuery";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import type { CustomerGroup } from "@/services/customerGroupService";
import {
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { App } from "antd";
import { useState } from "react";

export default function CustomerGroupsPage() {
  const { can } = usePermissions();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();

  // React Query hooks
  const { data: groups = [], isLoading, isFetching } = useCustomerGroups();
  const deleteMutation = useDeleteCustomerGroup();
  const createMutation = useCreateCustomerGroup();
  const updateMutation = useUpdateCustomerGroup();

  // Apply filter to get filtered groups
  const filteredGroups = applyFilter(groups);

  // State for drawer and modal
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(
    null
  );
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();
  const handleView = (group: CustomerGroup) => {
    setSelectedGroup(group);
    setDrawerVisible(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelectedGroup(null);
    setModalVisible(true);
  };

  const handleEdit = (group: CustomerGroup) => {
    setModalMode("edit");
    setSelectedGroup(group);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa nhóm khách hàng này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleModalSubmit = (values: CustomerGroupFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(
        values as unknown as Parameters<typeof createMutation.mutate>[0],
        { onSuccess: () => setModalVisible(false) }
      );
    } else if (selectedGroup) {
      const updatePayload = {
        groupName: values.groupName,
        priceMultiplier: values.priceMultiplier,
        description: values.description,
      };

      updateMutation.mutate(
        { id: selectedGroup.id, data: updatePayload },
        { onSuccess: () => setModalVisible(false) }
      );
    }
  };

  const handleImportExcel = () => {
    modal.info({
      title: "Nhập Excel",
      content: "Tính năng nhập Excel đang được phát triển",
    });
  };

  const columnsAll: TableColumnsType<CustomerGroup> = [
    {
      title: "Mã nhóm",
      dataIndex: "groupCode",
      key: "groupCode",
      width: 150,
      fixed: "left",
    },
    {
      title: "Tên nhóm",
      dataIndex: "groupName",
      key: "groupName",
      width: 200,
    },
    {
      title: "Hệ số giá",
      dataIndex: "priceMultiplier",
      key: "priceMultiplier",
      width: 130,
      align: "right",
      render: (value: number) => (
        <span className="font-semibold text-blue-600">{value}%</span>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 300,
      render: (text: string) => text || "-",
    },
    {
      title: "Số khách hàng",
      dataIndex: "customerCount",
      key: "customerCount",
      width: 130,
      align: "right",
      render: (count: number) => (
        <span className="font-medium">{count || 0}</span>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_: unknown, record: CustomerGroup) => (
        <TableActions
          onView={() => handleView(record)}
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record.id)}
          canView={can("sales.customers", "view")}
          canEdit={can("sales.customers", "edit")}
          canDelete={can("sales.customers", "delete")}
        />
      ),
    },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  const { exportToXlsx } = useFileExport(getVisibleColumns());

  return (
    <>
      <WrapperContent<CustomerGroup>
        isNotAccessible={!can("sales.customers", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: CUSTOMER_GROUP_KEYS.all,
          buttonEnds: can("sales.customers", "create")
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
                  onClick: () =>
                    exportToXlsx(
                      filteredGroups as CustomerGroup[],
                      "customer-groups"
                    ),
                  icon: <DownloadOutlined />,
                },
                {
                  type: "default",
                  name: "Nhập Excel",
                  onClick: handleImportExcel,
                  icon: <UploadOutlined />,
                },
              ]
            : undefined,
          searchInput: {
            placeholder: "Tìm kiếm nhóm khách hàng",
            filterKeys: ["groupName", "groupCode", "description"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "priceMultiplier",
                label: "Hệ số giá",
                options: [
                  { label: "Không giảm (0%)", value: "0" },
                  { label: "Giảm 5%", value: "5" },
                  { label: "Giảm 10%", value: "10" },
                  { label: "Giảm 15%", value: "15" },
                  { label: "Giảm 20%", value: "20" },
                ],
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
          columnSettings: {
            columns: columnsCheck,
            onChange: (cols) => updateColumns(cols),
            onReset: () => resetColumns(),
          },
        }}
      >
        <CommonTable
          pagination={{ ...pagination, onChange: handlePageChange }}
          columns={getVisibleColumns()}
          dataSource={filteredGroups}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging
          rank
        />
      </WrapperContent>

      <CustomerGroupDetailDrawer
        open={drawerVisible}
        group={selectedGroup}
        onClose={() => setDrawerVisible(false)}
        onEdit={(g) => {
          setDrawerVisible(false);
          handleEdit(g);
        }}
        onDelete={(id) => {
          setDrawerVisible(false);
          handleDelete(id);
        }}
        canEdit={can("sales.customers", "edit")}
        canDelete={can("sales.customers", "delete")}
      />

      <CustomerGroupFormModal
        open={modalVisible}
        mode={modalMode}
        group={selectedGroup}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
