"use client";

import CommonTable from "@/components/CommonTable";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Modal, Select, Tabs, Tag } from "antd";
import { useState } from "react";

interface SupplierGroup {
  id: number;
  groupCode: string;
  groupName: string;
  description?: string;
}

interface Supplier {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone: string;
  email: string;
  address: string;
  groupName: string;
  debtAmount: number;
  isActive: boolean;
}

interface CreateSupplierForm {
  supplierCode: string;
  supplierName: string;
  phone?: string;
  email?: string;
  address?: string;
  supplierGroupId?: string;
}

interface CreateGroupForm {
  groupCode: string;
  groupName: string;
  description?: string;
}

export default function SuppliersPage() {
  const { can } = usePermissions();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const {
    query,
    pagination,
    updateQueries,
    reset,
    applyFilter,
    handlePageChange,
  } = useFilter();

  const [activeTab, setActiveTab] = useState<"suppliers" | "groups">(
    "suppliers"
  );
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [selectedGroup, setSelectedGroup] = useState<SupplierGroup | null>(
    null
  );
  const [supplierForm] = Form.useForm<CreateSupplierForm>();
  const [groupForm] = Form.useForm<CreateGroupForm>();

  // Fetch suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers", query],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          qs.append(key, String(value));
        }
      });

      const res = await fetch(`/api/purchasing/suppliers?${qs}`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: can("purchasing.suppliers", "view"),
  });

  // Fetch groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery<
    SupplierGroup[]
  >({
    queryKey: ["supplier-groups"],
    queryFn: async () => {
      const res = await fetch("/api/purchasing/supplier-groups");
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  const filteredSuppliers = applyFilter(suppliers) as Supplier[];

  // Mutations
  const createSupplierMutation = useMutation({
    mutationFn: async (values: CreateSupplierForm) => {
      const res = await fetch("/api/purchasing/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Tạo nhà cung cấp thành công");
      setShowSupplierModal(false);
      supplierForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: CreateSupplierForm;
    }) => {
      const res = await fetch(`/api/purchasing/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Cập nhật nhà cung cấp thành công");
      setShowSupplierModal(false);
      setSelectedSupplier(null);
      supplierForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/purchasing/suppliers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa nhà cung cấp thành công");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (values: CreateGroupForm) => {
      const res = await fetch("/api/purchasing/supplier-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Tạo nhóm thành công");
      setShowGroupModal(false);
      groupForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: CreateGroupForm;
    }) => {
      const res = await fetch(`/api/purchasing/supplier-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Cập nhật nhóm thành công");
      setShowGroupModal(false);
      setSelectedGroup(null);
      groupForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/purchasing/supplier-groups/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Có lỗi xảy ra");
      return data;
    },
    onSuccess: () => {
      message.success("Xóa nhóm thành công");
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handleCreateSupplier = () => {
    setSelectedSupplier(null);
    supplierForm.resetFields();
    setShowSupplierModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    supplierForm.setFieldsValue({
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      supplierGroupId: "",
    });
    setShowSupplierModal(true);
  };

  const handleSupplierSubmit = async (values: CreateSupplierForm) => {
    if (selectedSupplier) {
      await updateSupplierMutation.mutateAsync({
        id: selectedSupplier.id,
        values,
      });
    } else {
      await createSupplierMutation.mutateAsync(values);
    }
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: `Bạn có chắc chắn muốn xóa nhà cung cấp "${supplier.supplierName}"?`,
      onOk: () => deleteSupplierMutation.mutate(supplier.id),
    });
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    groupForm.resetFields();
    setShowGroupModal(true);
  };

  const handleEditGroup = (group: SupplierGroup) => {
    setSelectedGroup(group);
    groupForm.setFieldsValue({
      groupCode: group.groupCode,
      groupName: group.groupName,
      description: group.description || "",
    });
    setShowGroupModal(true);
  };

  const handleGroupSubmit = async (values: CreateGroupForm) => {
    if (selectedGroup) {
      await updateGroupMutation.mutateAsync({ id: selectedGroup.id, values });
    } else {
      await createGroupMutation.mutateAsync(values);
    }
  };

  const handleDeleteGroup = (group: SupplierGroup) => {
    modal.confirm({
      title: "Xác nhận xóa",
      content: `Bạn có chắc chắn muốn xóa nhóm "${group.groupName}"?`,
      onOk: () => deleteGroupMutation.mutate(group.id),
    });
  };

  const handleExportExcel = () => {
    message.info("Chức năng xuất Excel đang được phát triển");
  };

  const handleImportExcel = () => {
    message.info("Chức năng nhập Excel đang được phát triển");
  };

  return (
    <>
      <WrapperContent
        title="Quản lý nhà cung cấp"
        isNotAccessible={!can("purchasing.suppliers", "view")}
        isLoading={suppliersLoading || groupsLoading}
        header={{
          refetchDataWithKeys: ["suppliers", "supplier-groups"],
          buttonEnds: can("purchasing.suppliers", "create")
            ? [
                {
                  type: "default" as const,
                  name: "Đặt lại",
                  onClick: reset,
                  icon: <ReloadOutlined />,
                },
                {
                  type: "primary" as const,
                  name: activeTab === "suppliers" ? "Thêm NCC" : "Thêm nhóm",
                  onClick:
                    activeTab === "suppliers"
                      ? handleCreateSupplier
                      : handleCreateGroup,
                  icon: <PlusOutlined />,
                },
                {
                  type: "default" as const,
                  name: "Xuất Excel",
                  onClick: handleExportExcel,
                  icon: <DownloadOutlined />,
                },
                {
                  type: "default" as const,
                  name: "Nhập Excel",
                  onClick: handleImportExcel,
                  icon: <UploadOutlined />,
                },
              ]
            : [
                {
                  type: "default" as const,
                  name: "Đặt lại",
                  onClick: reset,
                  icon: <ReloadOutlined />,
                },
              ],
          searchInput:
            activeTab === "suppliers"
              ? {
                  placeholder: "Tìm theo tên, mã, số điện thoại...",
                  filterKeys: ["supplierName", "supplierCode", "phone"],
                }
              : undefined,
          filters:
            activeTab === "suppliers"
              ? {
                  fields: [
                    {
                      type: "select" as const,
                      name: "isActive",
                      label: "Trạng thái",
                      options: [
                        { label: "Hoạt động", value: "true" },
                        { label: "Ngừng", value: "false" },
                      ],
                    },
                  ],
                  onApplyFilter: updateQueries,
                  onReset: reset,
                  query,
                }
              : undefined,
        }}
      >
        <div className="space-y-6">
          {/* Tabs */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "suppliers" | "groups")}
            items={[
              {
                key: "suppliers",
                label: "🏢 Nhà cung cấp",
                children: (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    {filteredSuppliers.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-6xl mb-2">🏢</div>
                        <div>Chưa có nhà cung cấp</div>
                      </div>
                    ) : (
                      <CommonTable
                        columns={[
                          {
                            title: "Mã NCC",
                            dataIndex: "supplierCode",
                            key: "supplierCode",
                            width: 120,
                            fixed: "left",
                          },
                          {
                            title: "Tên nhà cung cấp",
                            dataIndex: "supplierName",
                            key: "supplierName",
                            width: 200,
                            fixed: "left",
                          },
                          {
                            title: "Điện thoại",
                            dataIndex: "phone",
                            key: "phone",
                            width: 120,
                          },
                          {
                            title: "Email",
                            dataIndex: "email",
                            key: "email",
                            width: 180,
                          },
                          {
                            title: "Nhóm",
                            dataIndex: "groupName",
                            key: "groupName",
                            width: 150,
                          },
                          {
                            title: "Công nợ",
                            dataIndex: "debtAmount",
                            key: "debtAmount",
                            width: 120,
                            align: "right",
                            render: (value: number) => (
                              <span
                                className={
                                  value > 0 ? "text-red-600 font-semibold" : ""
                                }
                              >
                                {value.toLocaleString()} đ
                              </span>
                            ),
                          },
                          {
                            title: "Trạng thái",
                            dataIndex: "isActive",
                            key: "isActive",
                            width: 100,
                            align: "center",
                            render: (value: boolean) => (
                              <Tag color={value ? "green" : "default"}>
                                {value ? "Hoạt động" : "Ngừng"}
                              </Tag>
                            ),
                          },
                          {
                            title: "Thao tác",
                            key: "actions",
                            width: 150,
                            fixed: "right",
                            render: (_, record) => (
                              <TableActions
                                onEdit={() =>
                                  handleEditSupplier(record as Supplier)
                                }
                                onDelete={() =>
                                  handleDeleteSupplier(record as Supplier)
                                }
                                canEdit={can("purchasing.suppliers", "edit")}
                                canDelete={can(
                                  "purchasing.suppliers",
                                  "delete"
                                )}
                              />
                            ),
                          },
                        ]}
                        dataSource={filteredSuppliers}
                        loading={suppliersLoading}
                        pagination={{
                          ...pagination,
                          onChange: handlePageChange,
                        }}
                        paging
                      />
                    )}
                  </div>
                ),
              },
              {
                key: "groups",
                label: "📊 Nhóm NCC",
                children: (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    {groups.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-6xl mb-2">📊</div>
                        <div>Chưa có nhóm nhà cung cấp</div>
                      </div>
                    ) : (
                      <CommonTable
                        columns={[
                          {
                            title: "Mã nhóm",
                            dataIndex: "groupCode",
                            key: "groupCode",
                            width: 120,
                            fixed: "left",
                          },
                          {
                            title: "Tên nhóm",
                            dataIndex: "groupName",
                            key: "groupName",
                            width: 200,
                            fixed: "left",
                          },
                          {
                            title: "Mô tả",
                            dataIndex: "description",
                            key: "description",
                            width: 300,
                          },
                          {
                            title: "Thao tác",
                            key: "actions",
                            width: 150,
                            fixed: "right",
                            render: (_, record) => (
                              <TableActions
                                onEdit={() =>
                                  handleEditGroup(record as SupplierGroup)
                                }
                                onDelete={() =>
                                  handleDeleteGroup(record as SupplierGroup)
                                }
                                canEdit={can("purchasing.suppliers", "edit")}
                                canDelete={can(
                                  "purchasing.suppliers",
                                  "delete"
                                )}
                              />
                            ),
                          },
                        ]}
                        dataSource={groups}
                        loading={groupsLoading}
                        pagination={{
                          ...pagination,
                          onChange: handlePageChange,
                        }}
                        paging
                      />
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </WrapperContent>

      {/* Supplier Modal */}
      <Modal
        title={
          selectedSupplier ? "Chỉnh sửa nhà cung cấp" : "Thêm nhà cung cấp mới"
        }
        open={showSupplierModal}
        onCancel={() => {
          setShowSupplierModal(false);
          setSelectedSupplier(null);
          supplierForm.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={supplierForm}
          layout="vertical"
          onFinish={handleSupplierSubmit}
        >
          <Form.Item
            label="Mã NCC"
            name="supplierCode"
            rules={[
              { required: true, message: "Vui lòng nhập mã nhà cung cấp" },
            ]}
          >
            <Input disabled={!!selectedSupplier} />
          </Form.Item>

          <Form.Item
            label="Tên nhà cung cấp"
            name="supplierName"
            rules={[
              { required: true, message: "Vui lòng nhập tên nhà cung cấp" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Điện thoại" name="phone">
            <Input />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                type: "email",
                message: "Email không hợp lệ",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item label="Nhóm NCC" name="supplierGroupId">
            <Select placeholder="Chọn nhóm">
              {groups.map((group: SupplierGroup) => (
                <Select.Option key={group.id} value={group.id}>
                  {group.groupName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              onClick={() => {
                setShowSupplierModal(false);
                setSelectedSupplier(null);
                supplierForm.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={
                createSupplierMutation.isPending ||
                updateSupplierMutation.isPending
              }
            >
              {selectedSupplier ? "Cập nhật" : "Tạo mới"}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Group Modal */}
      <Modal
        title={selectedGroup ? "Chỉnh sửa nhóm" : "Thêm nhóm mới"}
        open={showGroupModal}
        onCancel={() => {
          setShowGroupModal(false);
          setSelectedGroup(null);
          groupForm.resetFields();
        }}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form form={groupForm} layout="vertical" onFinish={handleGroupSubmit}>
          <Form.Item
            label="Mã nhóm"
            name="groupCode"
            rules={[{ required: true, message: "Vui lòng nhập mã nhóm" }]}
          >
            <Input disabled={!!selectedGroup} />
          </Form.Item>

          <Form.Item
            label="Tên nhóm"
            name="groupName"
            rules={[{ required: true, message: "Vui lòng nhập tên nhóm" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              onClick={() => {
                setShowGroupModal(false);
                setSelectedGroup(null);
                groupForm.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={
                createGroupMutation.isPending || updateGroupMutation.isPending
              }
            >
              {selectedGroup ? "Cập nhật" : "Tạo mới"}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
