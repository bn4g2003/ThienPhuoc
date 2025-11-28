"use client";

import { CheckCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Statistic,
} from "antd";
import type { Dayjs } from "dayjs";

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
}

interface PaymentFormValues {
  paymentAmount: string;
  paymentDate: Dayjs;
  paymentMethod: "CASH" | "BANK" | "TRANSFER";
  bankAccountId?: string;
  notes?: string;
}

interface Props {
  partnerId: number;
  partnerName: string;
  partnerCode: string;
  partnerType: "customer" | "supplier";
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalOrders: number;
  unpaidOrders: number;
  bankAccounts: BankAccount[];
  canEdit: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function PartnerDebtSidePanel({
  partnerId,
  partnerName,
  partnerCode,
  partnerType,
  totalAmount,
  paidAmount,
  remainingAmount,
  totalOrders,
  unpaidOrders,
  bankAccounts,
  canEdit,
  onClose,
  onPaymentSuccess,
}: Props) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const paymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      const res = await fetch(
        `/api/finance/debts/partners/${partnerId}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            paymentAmount: parseFloat(values.paymentAmount),
            bankAccountId: values.bankAccountId
              ? parseInt(values.bankAccountId)
              : null,
            partnerType,
          }),
        }
      );

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Có lỗi xảy ra");
      }
      return data;
    },
    onSuccess: () => {
      message.success("Thanh toán thành công!");

      // Hỏi có muốn in phiếu không
      modal.confirm({
        title: "In phiếu thanh toán",
        content: "Bạn có muốn in phiếu thanh toán không?",
        onOk: () => {
          const paymentId = Math.random().toString(36).substr(2, 9);
          const params = new URLSearchParams({
            type: partnerType,
            amount: form.getFieldValue("paymentAmount"),
            date: form.getFieldValue("paymentDate").format("YYYY-MM-DD"),
            method: form.getFieldValue("paymentMethod"),
            notes: form.getFieldValue("notes") || "",
          });

          const bankAccountId = form.getFieldValue("bankAccountId");
          if (bankAccountId) {
            params.append("bankAccountId", bankAccountId.toString());
          }

          window.open(
            `/api/finance/debts/partners/${partnerId}/payment/${paymentId}/pdf?${params.toString()}`,
            "_blank"
          );
        },
      });

      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["supplier-debts"] });
      queryClient.invalidateQueries({ queryKey: ["customer-debts"] });
      onPaymentSuccess();
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const handlePaymentSubmit = async (values: PaymentFormValues) => {
    await paymentMutation.mutateAsync(values);
  };

  return (
    <Drawer
      title={`Công nợ - ${partnerName}`}
      placement="right"
      size={600}
      open={true}
      onClose={onClose}
      destroyOnHidden
    >
      <div className="flex flex-col gap-6">
        <p className="text-sm text-gray-600">{partnerCode}</p>

        {/* Summary */}
        <Card>
          <div className="text-sm text-gray-600 mb-4">
            Tổng hợp công nợ{" "}
            {partnerType === "customer" ? "khách hàng" : "nhà cung cấp"}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Statistic
              title="Tổng tiền"
              value={totalAmount}
              suffix="đ"
              styles={{
                content: { color: "#1890ff" },
              }}
            />
            <Statistic
              title="Đã trả"
              value={paidAmount}
              suffix="đ"
              styles={{
                content: { color: "#52c41a" },
              }}
            />
            <Statistic
              title="Còn nợ"
              value={remainingAmount}
              suffix="đ"
              styles={{
                content: { color: "#fa8c16" },
              }}
            />
          </div>

          <Divider />

          <Space className="w-full justify-between">
            <span className="text-sm text-gray-600">
              Tổng số {partnerType === "customer" ? "đơn hàng" : "đơn mua"}:{" "}
              <span className="font-medium text-gray-600">{totalOrders}</span>
            </span>
            {unpaidOrders > 0 && (
              <span className="text-sm text-orange-600">
                Chưa thanh toán:{" "}
                <span className="font-medium">{unpaidOrders}</span>
              </span>
            )}
          </Space>
        </Card>

        {/* Payment Form */}
        {canEdit && remainingAmount > 0 && (
          <Card title="Thanh toán công nợ">
            <Form
              form={form}
              layout="vertical"
              onFinish={handlePaymentSubmit}
              initialValues={{
                paymentAmount: remainingAmount.toString(),
                paymentDate: null,
                paymentMethod: "CASH",
                bankAccountId: "",
                notes: "",
              }}
            >
              <Form.Item
                label="Số tiền thanh toán"
                name="paymentAmount"
                rules={[
                  { required: true, message: "Vui lòng nhập số tiền" },
                  {
                    type: "number",
                    min: 0,
                    max: remainingAmount,
                    message: "Số tiền không hợp lệ",
                  },
                ]}
              >
                <Input
                  type="number"
                  suffix="đ"
                  placeholder={`Tối đa: ${remainingAmount.toLocaleString(
                    "vi-VN"
                  )} đ`}
                />
              </Form.Item>

              <Form.Item
                label="Ngày thanh toán"
                name="paymentDate"
                rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
              >
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày thanh toán"
                />
              </Form.Item>

              <Form.Item
                label="Phương thức thanh toán"
                name="paymentMethod"
                rules={[
                  { required: true, message: "Vui lòng chọn phương thức" },
                ]}
              >
                <Select placeholder="Chọn phương thức">
                  <Select.Option value="CASH">Tiền mặt</Select.Option>
                  <Select.Option value="BANK">Ngân hàng</Select.Option>
                  <Select.Option value="TRANSFER">Chuyển khoản</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.paymentMethod !== currentValues.paymentMethod
                }
              >
                {({ getFieldValue }) =>
                  (getFieldValue("paymentMethod") === "BANK" ||
                    getFieldValue("paymentMethod") === "TRANSFER") && (
                    <Form.Item
                      label="Tài khoản ngân hàng"
                      name="bankAccountId"
                      rules={[
                        { required: true, message: "Vui lòng chọn tài khoản" },
                      ]}
                    >
                      <Select placeholder="Chọn tài khoản ngân hàng">
                        {bankAccounts.map((acc) => (
                          <Select.Option key={acc.id} value={acc.id}>
                            {acc.bankName} - {acc.accountNumber}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )
                }
              </Form.Item>

              <Form.Item label="Ghi chú" name="notes">
                <Input.TextArea
                  rows={3}
                  placeholder="Ghi chú về khoản thanh toán này..."
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={paymentMutation.isPending}
                  block
                  size="large"
                >
                  Xác nhận thanh toán
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}

        {remainingAmount === 0 && (
          <Alert
            message="Đã thanh toán đủ"
            description={`${
              partnerType === "customer" ? "Khách hàng" : "Nhà cung cấp"
            } này không còn công nợ`}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        )}

        {/* Info */}
        <Alert
          message="Lưu ý"
          description={
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Số tiền thanh toán sẽ được ghi vào sổ quỹ</li>
              <li>Công nợ sẽ tự động giảm sau khi thanh toán</li>
              <li>Nếu thanh toán qua ngân hàng, số dư TK sẽ được cập nhật</li>
            </ul>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </div>
    </Drawer>
  );
}
