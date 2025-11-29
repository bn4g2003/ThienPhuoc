import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  Select,
  Statistic,
} from "antd";
import dayjs from "dayjs";

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
}

interface Props {
  partnerId?: number;
  partnerName?: string;
  partnerCode?: string;
  partnerType?: "customer" | "supplier";
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  totalOrders?: number;
  unpaidOrders?: number;
  bankAccounts: BankAccount[];
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

interface PaymentFormValues {
  paymentAmount: string;
  paymentDate: dayjs.Dayjs;
  paymentMethod: "CASH" | "BANK" | "TRANSFER";
  bankAccountId?: string;
  notes?: string;
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
  open,
  onClose,
  onPaymentSuccess,
}: Props) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  const handlePaymentSubmit = async (values: PaymentFormValues) => {
    if (!partnerId || !partnerType) return;

    try {
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

      if (data.success) {
        message.success("Thanh toán thành công!");

        // Hỏi có muốn in phiếu không
        modal.confirm({
          title: "In phiếu thanh toán",
          content: "Bạn có muốn in phiếu thanh toán không?",
          okText: "In phiếu",
          cancelText: "Không",
          onOk: () => {
            const paymentId = new Date().getTime();
            const params = new URLSearchParams({
              type: partnerType,
              amount: values.paymentAmount,
              date: values.paymentDate.format("YYYY-MM-DD"),
              method: values.paymentMethod,
              notes: values.notes || "",
            });

            if (values.bankAccountId) {
              params.append("bankAccountId", values.bankAccountId);
            }

            window.open(
              `/api/finance/debts/partners/${partnerId}/payment/${paymentId}/pdf?${params.toString()}`,
              "_blank"
            );
          },
        });

        form.resetFields();
        onPaymentSuccess();
      } else {
        message.error(data.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Payment error:", err);
      message.error("Có lỗi xảy ra");
    }
  };

  const paymentMethodOptions = [
    { label: "Tiền mặt", value: "CASH" },
    { label: "Ngân hàng", value: "BANK" },
    { label: "Chuyển khoản", value: "TRANSFER" },
  ];

  const bankAccountOptions = bankAccounts.map((acc) => ({
    label: `${acc.bankName} - ${acc.accountNumber}`,
    value: acc.id,
  }));

  return (
    <Drawer
      title={
        <div>
          <div className="text-lg font-semibold">
            Công nợ - {partnerName || "N/A"}
          </div>
          <div className="text-sm text-gray-500">{partnerCode || "N/A"}</div>
        </div>
      }
      open={open}
      onClose={onClose}
      width={600}
      destroyOnClose
    >
      <div className="flex flex-col gap-6">
        {/* Summary */}
        <Card>
          <div className="text-sm text-gray-600 mb-4">
            Tổng hợp công nợ{" "}
            {partnerType === "customer" ? "khách hàng" : "nhà cung cấp"}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Statistic
              title="Tổng tiền"
              value={totalAmount || 0}
              suffix="đ"
              styles={{ content: { color: "#1890ff" } }}
            />
            <Statistic
              title="Đã trả"
              value={paidAmount || 0}
              suffix="đ"
              styles={{ content: { color: "#52c41a" } }}
            />
            <Statistic
              title="Còn nợ"
              value={remainingAmount || 0}
              suffix="đ"
              styles={{ content: { color: "#fa8c16" } }}
            />
          </div>

          <div className="flex justify-between text-sm text-gray-600 pt-4 border-t">
            <span>
              Tổng số {partnerType === "customer" ? "đơn hàng" : "đơn mua"}:{" "}
              <span className="font-medium text-gray-900">
                {totalOrders || 0}
              </span>
            </span>
            {(unpaidOrders || 0) > 0 && (
              <span className="text-orange-600">
                Chưa thanh toán:{" "}
                <span className="font-medium">{unpaidOrders}</span>
              </span>
            )}
          </div>
        </Card>

        {/* Payment Form */}
        {canEdit && (remainingAmount || 0) > 0 && (
          <Card title="Thanh toán công nợ">
            <Form
              form={form}
              layout="vertical"
              onFinish={handlePaymentSubmit}
              initialValues={{
                paymentAmount: (remainingAmount || 0).toString(),
                paymentDate: dayjs(),
                paymentMethod: "CASH",
                bankAccountId: "",
                notes: "",
              }}
            >
              <Form.Item
                label="Số tiền thanh toán"
                name="paymentAmount"
                rules={[{ required: true, message: "Vui lòng nhập số tiền" }]}
              >
                <Input
                  type="number"
                  min={0}
                  max={remainingAmount || 0}
                  step={0.01}
                  suffix="đ"
                  placeholder={`Tối đa: ${(remainingAmount || 0).toLocaleString(
                    "vi-VN"
                  )} đ`}
                />
              </Form.Item>

              <Form.Item
                label="Ngày thanh toán"
                name="paymentDate"
                rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
              >
                <DatePicker className="w-full" />
              </Form.Item>

              <Form.Item
                label="Phương thức thanh toán"
                name="paymentMethod"
                rules={[
                  { required: true, message: "Vui lòng chọn phương thức" },
                ]}
              >
                <Select options={paymentMethodOptions} />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.paymentMethod !== currentValues.paymentMethod
                }
              >
                {({ getFieldValue }) => {
                  const paymentMethod = getFieldValue("paymentMethod");
                  return paymentMethod === "BANK" ||
                    paymentMethod === "TRANSFER" ? (
                    <Form.Item
                      label="Tài khoản ngân hàng"
                      name="bankAccountId"
                      rules={[
                        { required: true, message: "Vui lòng chọn tài khoản" },
                      ]}
                    >
                      <Select
                        options={bankAccountOptions}
                        placeholder="-- Chọn tài khoản --"
                      />
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>

              <Form.Item label="Ghi chú" name="notes">
                <Input.TextArea
                  rows={3}
                  placeholder="Ghi chú về khoản thanh toán này..."
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Xác nhận thanh toán
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}

        {remainingAmount === 0 && (
          <Card>
            <div className="text-center py-8">
              <div className="text-green-600 text-lg mb-2">
                ✓ Đã thanh toán đủ
              </div>
              <div className="text-gray-600">
                {partnerType === "customer" ? "Khách hàng" : "Nhà cung cấp"} này
                không còn công nợ
              </div>
            </div>
          </Card>
        )}

        {/* Info */}
        <Card>
          <div className="text-sm">
            <div className="font-medium mb-2 flex items-center gap-2">
              <ExclamationCircleOutlined />
              Lưu ý:
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
              <li>Số tiền thanh toán sẽ được ghi vào sổ quỹ</li>
              <li>Công nợ sẽ tự động giảm sau khi thanh toán</li>
              <li>Nếu thanh toán qua ngân hàng, số dư TK sẽ được cập nhật</li>
            </ul>
          </div>
        </Card>
      </div>
    </Drawer>
  );
}
