"use client";

import { formatQuantity } from "@/utils/format";
import { ArrowRightOutlined, CheckOutlined, LeftOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Descriptions, message, Modal, Row, Space, Spin, Steps, Table, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import FinishProductModal from "./FinishProductModal";
import MaterialImportModal from "./MaterialImportModal";

const { Title } = Typography;

export default function ProductionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const [isMaterialImportModalOpen, setIsMaterialImportModalOpen] = useState(false);
    const [isFinishProductModalOpen, setIsFinishProductModalOpen] = useState(false);
    const [isUpdatingStep, setIsUpdatingStep] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["production-order", id],
        queryFn: async () => {
            const res = await fetch(`/api/production/orders/${id}`);
            const data = await res.json();
            return data.data;
        },
        enabled: !!id,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    });

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    if (!data) {
        return <div>Không tìm thấy đơn sản xuất</div>;
    }

    console.log('Production Order Data:', { status: data.status, currentStep: data.currentStep });

    const steps = [
        { title: "Nhập NVL", key: "MATERIAL_IMPORT" },
        { title: "Cắt", key: "CUTTING" },
        { title: "May", key: "SEWING" },
        { title: "Hoàn thiện", key: "FINISHING" },
        { title: "KCS", key: "QC" },
        { title: "Nhập kho", key: "WAREHOUSE_IMPORT" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.key === data.currentStep);

    const handleNextStep = async () => {
        const nextStep = steps[currentStepIndex + 1];
        if (!nextStep) return;

        Modal.confirm({
            title: `Chuyển sang bước "${nextStep.title}"?`,
            content: `Xác nhận hoàn thành bước "${steps[currentStepIndex].title}" và chuyển sang bước tiếp theo.`,
            okText: "Xác nhận",
            cancelText: "Hủy",
            onOk: async () => {
                setIsUpdatingStep(true);
                try {
                    const res = await fetch(`/api/production/orders/${id}/update-step`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ step: nextStep.key }),
                    });
                    const result = await res.json();
                    if (result.success) {
                        message.success(`Đã chuyển sang bước "${nextStep.title}"`);
                        queryClient.invalidateQueries({ queryKey: ["production-order", id] });
                    } else {
                        message.error(result.error || "Lỗi khi cập nhật");
                    }
                } catch {
                    message.error("Lỗi khi cập nhật");
                } finally {
                    setIsUpdatingStep(false);
                }
            },
        });
    };

    const getActionButton = () => {
        if (data.status === "COMPLETED") return null;

        switch (data.currentStep) {
            case "MATERIAL_IMPORT":
                return (
                    <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        onClick={() => setIsMaterialImportModalOpen(true)}
                    >
                        Tiến hành nhập NVL
                    </Button>
                );
            case "CUTTING":
            case "SEWING":
            case "FINISHING":
                return (
                    <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        onClick={handleNextStep}
                        loading={isUpdatingStep}
                    >
                        Hoàn thành & Chuyển bước tiếp
                    </Button>
                );
            case "QC":
                return (
                    <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        onClick={handleNextStep}
                        loading={isUpdatingStep}
                    >
                        Hoàn thành KCS & Chuyển nhập kho
                    </Button>
                );
            case "WAREHOUSE_IMPORT":
                return (
                    <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => setIsFinishProductModalOpen(true)}
                    >
                        Nhập kho thành phẩm
                    </Button>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <Space>
                    <Button icon={<LeftOutlined />} onClick={() => router.back()}>
                        Quay lại
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        Đơn sản xuất #{data.orderCode}
                    </Title>
                </Space>
                {getActionButton()}
            </div>

            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card className="mb-6">
                        <Steps current={currentStepIndex} items={steps} />
                    </Card>
                </Col>

                <Col span={24}>
                    <Card title="Thông tin chung">
                        <Descriptions bordered column={2}>
                            <Descriptions.Item label="Mã đơn hàng">{data.orderCode}</Descriptions.Item>
                            <Descriptions.Item label="Khách hàng">{data.customerName}</Descriptions.Item>
                            <Descriptions.Item label="Ngày đặt">
                                {new Date(data.orderDate).toLocaleDateString("vi-VN")}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={data.status === "PENDING" ? "orange" : "blue"}>{data.status}</Tag>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card title="Danh sách sản phẩm">
                        <Table
                            dataSource={data.items}
                            rowKey="id"
                            pagination={false}
                            columns={[
                                {
                                    title: "Sản phẩm",
                                    dataIndex: "itemName",
                                    key: "itemName",
                                    render: (text, record: any) => (
                                        <div>
                                            <div className="font-medium">{text}</div>
                                            <div className="text-xs text-gray-500">{record.itemCode}</div>
                                        </div>
                                    ),
                                },
                                {
                                    title: "Số lượng",
                                    dataIndex: "quantity",
                                    key: "quantity",
                                    render: (value) => formatQuantity(value),
                                },
                                {
                                    title: "Thông số",
                                    key: "measurements",
                                    render: (_, record: any) => (
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {record.measurements?.map((m: any) => (
                                                <div key={m.attributeId}>
                                                    <span className="text-gray-500">{m.attributeName}: </span>
                                                    <span>{m.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                </Col>
            </Row>

            <MaterialImportModal
                open={isMaterialImportModalOpen}
                onCancel={() => setIsMaterialImportModalOpen(false)}
                productionOrderId={id}
            />

            <FinishProductModal
                open={isFinishProductModalOpen}
                onCancel={() => setIsFinishProductModalOpen(false)}
                productionOrderId={id}
                orderItems={data.items}
            />
        </div>
    );
}
