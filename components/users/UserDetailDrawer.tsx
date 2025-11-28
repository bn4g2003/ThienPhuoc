"use client";

import React from "react";
import { Drawer, Descriptions, Space, Button, Tag } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import type { User } from "@/services/userService";

type Props = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

export default function UserDetailDrawer({
  open,
  user,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: Props) {
  return (
    <Drawer
      title="Chi tiết người dùng"
      placement="right"
      size={600}
      onClose={onClose}
      open={open}
    >
      {user ? (
        <>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Mã nhân viên">
              {user.userCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tên đăng nhập">
              {user.username}
            </Descriptions.Item>
            <Descriptions.Item label="Họ tên">
              {user.fullName}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {user.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {user.phone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              {user.branchName}
            </Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              {user.roleName}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag
                color={user.isActive ? "success" : "error"}
                icon={user.isActive ? <UnlockOutlined /> : <LockOutlined />}
              >
                {user.isActive ? "Hoạt động" : "Khóa"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Space style={{ marginTop: 16 }}>
            {canEdit && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => onEdit(user)}
              >
                Sửa
              </Button>
            )}
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(user.id)}
              >
                Xóa
              </Button>
            )}
          </Space>
        </>
      ) : null}
    </Drawer>
  );
}
