"use client";

import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import useFilter from "@/hooks/useFilter";
import {
  useCustomers,
  useDeleteCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useCustomerGroups,
  CUSTOMER_KEYS,
} from "@/hooks/useCustomerQuery";
import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import { Button, Tag, Modal, App } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  MoreOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import useColumn from "@/hooks/useColumn";
import { Dropdown } from "antd";
import type { Customer } from "@/services/customerService";
import CustomerDetailDrawer from "@/components/customers/CustomerDetailDrawer";
import CustomerFormModal, {
  type CustomerFormValues,
} from "@/components/customers/CustomerFormModal";

export default function CustomersPage() {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();

  // React Query hooks
  const { data: customers = [], isLoading, isFetching } = useCustomers();
  const { data: groups = [] } = useCustomerGroups();
  const deleteMutation = useDeleteCustomer();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  // Apply filter to get filtered customers
  const filteredCustomers = applyFilter(customers);

  // State for drawer and modal
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const { modal } = App.useApp();

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDrawerVisible(true);
  };

  const handleCreate = () => {
    setModalMode("create");
    setSelectedCustomer(null);
    setModalVisible(true);
  };

  const handleEdit = (customer: Customer) => {
    setModalMode("edit");
    setSelectedCustomer(customer);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa khách hàng này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleModalSubmit = (values: CustomerFormValues) => {
    if (modalMode === "create") {
      createMutation.mutate(
        values as unknown as Parameters<typeof createMutation.mutate>[0],
        { onSuccess: () => setModalVisible(false) }
      );
    } else if (selectedCustomer) {
      const updatePayload = {
        customerName: values.customerName,
        phone: values.phone,
        email: values.email,
        address: values.address,
        customerGroupId: values.customerGroupId,
        isActive: !!values.isActive,
      };

      updateMutation.mutate(
        { id: selectedCustomer.id, data: updatePayload },
        { onSuccess: () => setModalVisible(false) }
      );
    }
  };

  const handleExportExcel = () => {
    // TODO: Implement Excel export
    modal.info({
      title: "Xuất Excel",
      content: "Tính năng xuất Excel đang được phát triển",
    });
  };

  const handleImportExcel = () => {
    // TODO: Implement Excel import
    modal.info({
      title: "Nhập Excel",
      content: "Tính năng nhập Excel đang được phát triển",
    });
  };

  const columnsAll: TableColumnsType<Customer> = [
    {
      title: "Mã KH",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 120,
      fixed: "left",
    },
    {
      title: "Tên khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 200,
    },
    {
      title: "Điện thoại",
      dataIndex: "phone",
      key: "phone",
      width: 130,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      width: 200,
    },
    {
      title: "Nhóm KH",
      dataIndex: "groupName",
      key: "groupName",
      width: 150,
    },
    {
      title: "Công nợ",
      dataIndex: "debtAmount",
      key: "debtAmount",
      width: 130,
      align: "right",
      render: (amount: number) => (
        <span className={amount > 0 ? "text-red-600 font-semibold" : ""}>
          {amount.toLocaleString()} đ
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean) => (
        <Tag
          color={isActive ? "success" : "error"}
          icon={isActive ? <UnlockOutlined /> : <LockOutlined />}
        >
          {isActive ? "Hoạt động" : "Ngừng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_: unknown, record: Customer) => {
        const menuItems = [
          {
            key: "view",
            label: "Xem",
            icon: <EyeOutlined />,
            onClick: () => handleView(record),
          },
        ];

        if (can("sales.customers", "edit")) {
          menuItems.push({
            key: "edit",
            label: "Sửa",
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          });
        }

        if (can("sales.customers", "delete")) {
          menuItems.push({
            key: "delete",
            label: "Xóa",
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record.id),
          });
        }

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
      <WrapperContent<Customer>
        isNotAccessible={!can("sales.customers", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: CUSTOMER_KEYS.all,
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
                  onClick: handleExportExcel,
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
            placeholder: "Tìm kiếm khách hàng",
            filterKeys: ["customerName", "customerCode", "phone", "email"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "customerGroupId",
                label: "Nhóm khách hàng",
                options: groups.map((g) => ({
                  label: g.groupName,
                  value: g.id.toString(),
                })),
              },
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
          columns={getVisibleColumns()}
          dataSource={filteredCustomers}
          loading={isLoading || deleteMutation.isPending || isFetching}
          paging
          rank
        />
      </WrapperContent>

      <CustomerDetailDrawer
        open={drawerVisible}
        customer={selectedCustomer}
        onClose={() => setDrawerVisible(false)}
        onEdit={(c) => {
          setDrawerVisible(false);
          handleEdit(c);
        }}
        onDelete={(id) => {
          setDrawerVisible(false);
          handleDelete(id);
        }}
        canEdit={can("sales.customers", "edit")}
        canDelete={can("sales.customers", "delete")}
      />

      <CustomerFormModal
        open={modalVisible}
        mode={modalMode}
        customer={selectedCustomer}
        groups={groups}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
      />
    </>
  );
}
