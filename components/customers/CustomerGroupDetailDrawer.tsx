"use client";

import { Drawer, Descriptions, Button, Space } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { CustomerGroup } from "@/services/customerGroupService";

interface CustomerGroupDetailDrawerProps {
  open: boolean;
  group: CustomerGroup | null;
  onClose: () => void;
  onEdit: (group: CustomerGroup) => void;
  onDelete: (id: number) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function CustomerGroupDetailDrawer({
  open,
  group,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: CustomerGroupDetailDrawerProps) {
  if (!group) return null;

  return (
    <Drawer
      title="Chi tiết nhóm khách hàng"
      placement="right"
      onClose={onClose}
      open={open}
      size={600}
      extra={
        <Space>
          {canEdit && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => onEdit(group)}
            >
              Sửa
            </Button>
          )}
          {canDelete && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(group.id)}
            >
              Xóa
            </Button>
          )}
        </Space>
      }
    >
      <Descriptions column={1} bordered>
        <Descriptions.Item label="Mã nhóm">
          <span className="font-mono">{group.groupCode}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Tên nhóm">
          <span className="font-medium">{group.groupName}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Hệ số giá">
          <span className="font-semibold text-blue-600">
            {group.priceMultiplier}%
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="Mô tả">
          {group.description || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Số khách hàng">
          <span className="font-semibold">
            {group.customerCount || 0} khách hàng
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="Ngày tạo">
          {new Date(group.createdAt).toLocaleString("vi-VN")}
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  );
}
