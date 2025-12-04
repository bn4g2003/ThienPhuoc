"use client";

import { SaveOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, InputNumber, Modal, Select, Table, message } from "antd";
import { useEffect, useState } from "react";

interface MaterialImportModalProps {
    open: boolean;
    onCancel: () => void;
    productionOrderId: string;
}

export default function MaterialImportModal({
    open,
    onCancel,
    productionOrderId,
}: MaterialImportModalProps) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const queryClient = useQueryClient();

    // 1. Fetch Warehouses (NVL)
    const { data: warehouses, isLoading: loadingWarehouses } = useQuery({
        queryKey: ["warehouses", "NVL"],
        queryFn: async () => {
            const res = await fetch("/api/admin/warehouses?type=NVL");
            const data = await res.json();
            return data.data;
        },
        enabled: open,
    });

    // 2. Fetch Material Requirements
    const { data: requirements, isLoading: loadingRequirements } = useQuery({
        queryKey: ["material-requirements", productionOrderId],
        queryFn: async () => {
            const res = await fetch(
                `/api/production/orders/${productionOrderId}/material-requirements`
            );
            const data = await res.json();
            return data.data;
        },
        enabled: open && !!productionOrderId,
    });

    // Initialize form values
    useEffect(() => {
        if (requirements && open) {
            const initialValues: any = {};
            requirements.forEach((item: any) => {
                initialValues[`qty_${item.materialId}`] = item.quantityPlanned;
            });
            form.setFieldsValue(initialValues);
        }
    }, [requirements, form, open]);

    const handleFinish = async (values: any) => {
        if (!values.warehouseId) {
            message.error("Vui lòng chọn kho xuất");
            return;
        }

        setSubmitting(true);
        try {
            const items = requirements.map((req: any) => ({
                materialId: req.materialId,
                quantityPlanned: req.quantityPlanned,
                quantityActual: values[`qty_${req.materialId}`] || 0,
            }));

            const res = await fetch(
                `/api/production/orders/${productionOrderId}/material-import`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        warehouseId: values.warehouseId,
                        items,
                    }),
                }
            );

            const data = await res.json();
            if (data.success) {
                message.success("Đã tạo phiếu xuất kho thành công");
                queryClient.invalidateQueries({
                    queryKey: ["production-order", productionOrderId],
                });
                onCancel();
            } else {
                message.error(data.error || "Lỗi khi tạo phiếu xuất kho");
            }
        } catch (error) {
            console.error("Error creating material import:", error);
            message.error("Lỗi khi tạo phiếu xuất kho");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title="Nhập nguyên vật liệu (Xuất kho sản xuất)"
            open={open}
            onCancel={onCancel}
            width={1000}
            footer={[
                <Button key="back" onClick={onCancel}>
                    Hủy
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={submitting}
                    onClick={() => form.submit()}
                >
                    Tạo phiếu xuất kho
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                    name="warehouseId"
                    label="Chọn kho xuất (Kho NVL)"
                    rules={[{ required: true, message: "Vui lòng chọn kho" }]}
                >
                    <Select placeholder="Chọn kho nguyên vật liệu" loading={loadingWarehouses}>
                        {warehouses?.map((w: any) => (
                            <Select.Option key={w.id} value={w.id}>
                                {w.warehouseName} ({w.address})
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Table
                    dataSource={requirements}
                    rowKey="materialId"
                    pagination={false}
                    loading={loadingRequirements}
                    columns={[
                        {
                            title: "Mã NVL",
                            dataIndex: "materialCode",
                            key: "materialCode",
                        },
                        {
                            title: "Tên NVL",
                            dataIndex: "materialName",
                            key: "materialName",
                        },
                        {
                            title: "Đơn vị",
                            dataIndex: "unit",
                            key: "unit",
                        },
                        {
                            title: "Định mức (Dự kiến)",
                            dataIndex: "quantityPlanned",
                            key: "quantityPlanned",
                            render: (val) => Number(val).toLocaleString("vi-VN"),
                        },
                        {
                            title: "Thực xuất",
                            key: "quantityActual",
                            render: (_, record: any) => (
                                <Form.Item
                                    name={`qty_${record.materialId}`}
                                    style={{ marginBottom: 0 }}
                                    rules={[{ required: true, message: "Nhập số lượng" }]}
                                >
                                    <InputNumber
                                        style={{ width: "100%" }}
                                        min={0}
                                        step={0.01}
                                        formatter={(value) =>
                                            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                        }
                                        parser={(value) =>
                                            (value?.replace(/\$\s?|(,*)/g, "") || 0) as any
                                        }
                                    />
                                </Form.Item>
                            ),
                        },
                    ]}
                />
            </Form>
        </Modal>
    );
}
