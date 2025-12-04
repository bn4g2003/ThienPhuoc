"use client";

import { formatQuantity } from "@/utils/format";
import { ArrowRightOutlined, LeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Col, Descriptions, Row, Space, Spin, Steps, Table, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import MaterialImportModal from "./MaterialImportModal";

const { Title } = Typography;

export default function ProductionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const [isMaterialImportModalOpen, setIsMaterialImportModalOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["production-order", id],
        queryFn: async () => {
            const res = await fetch(`/api/production/orders/${id}`);
            const data = await res.json();
            return data.data;
        },
        enabled: !!id,
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

    const steps = [
        { title: "Nhập NVL", key: "MATERIAL_IMPORT" },
        { title: "Cắt", key: "CUTTING" },
        { title: "May", key: "SEWING" },
        { title: "Hoàn thiện", key: "FINISHING" },
        { title: "KCS", key: "QC" },
    ];

    const currentStepIndex = steps.findIndex((s) => s.key === data.currentStep);

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
                {data.currentStep === "MATERIAL_IMPORT" && (
                    <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        onClick={() => setIsMaterialImportModalOpen(true)}
                    >
                        Tiến hành nhập NVL
                    </Button>
                )}
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
        </div>
    );
}
