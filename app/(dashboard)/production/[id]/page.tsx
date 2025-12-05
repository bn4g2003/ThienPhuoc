"use client";

import { useGetCompany } from "@/hooks/useCompany";
import { formatQuantity } from "@/utils/format";
import { ArrowRightOutlined, CheckOutlined, LeftOutlined, PrinterOutlined } from "@ant-design/icons";
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

    // Fetch company info
    const { data: company } = useGetCompany();

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

    const { data: materialRequirements, isLoading: isLoadingMaterials } = useQuery({
        queryKey: ["production-order-materials", id],
        queryFn: async () => {
            const res = await fetch(`/api/production/orders/${id}/material-requirements`);
            const data = await res.json();
            return data.data || [];
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

    const handlePrintTicket = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const companyName = company?.companyName || "CÔNG TY";
        const companyAddress = company?.address ? `Địa chỉ: ${company.address}` : "";
        const companyPhone = company?.phone ? `Điện thoại: ${company.phone}` : "";
        const companyEmail = company?.email ? `Email: ${company.email}` : "";
        const companyInfo = [companyAddress, companyPhone, companyEmail].filter(Boolean).join(" | ");

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Phiếu Sản Xuất - ${data.orderCode}</title>
                <style>
                    body { font-family: 'Times New Roman', Times, serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                    .company-info { font-size: 13px; margin-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
                    .info-section { margin-bottom: 20px; }
                    .info-row { display: flex; margin-bottom: 5px; }
                    .info-label { font-weight: bold; width: 150px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 13px; }
                    th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .footer { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
                    .signature-box { width: 200px; }
                    .signature-title { font-weight: bold; margin-bottom: 50px; }
                    @media print {
                        @page { size: A4; margin: 10mm; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-name">${companyName}</div>
                    <div class="company-info">${companyInfo}</div>
                    <div class="title">PHIẾU SẢN XUẤT</div>
                </div>

                <div class="info-section">
                    <div class="info-row">
                        <span class="info-label">Mã đơn hàng:</span>
                        <span>${data.orderCode}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Khách hàng:</span>
                        <span>${data.customerName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Ngày đặt:</span>
                        <span>${new Date(data.orderDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Ngày bắt đầu:</span>
                        <span>${data.startDate ? new Date(data.startDate).toLocaleDateString("vi-VN") : "-"}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Trạng thái:</span>
                        <span>${data.status}</span>
                    </div>
                </div>

                <h3>Danh sách sản phẩm</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px">STT</th>
                            <th>Sản phẩm</th>
                            <th>Mã SP</th>
                            <th style="width: 80px">Số lượng</th>
                            <th>Thông số</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map((item: any, index: number) => `
                            <tr>
                                <td class="text-center">${index + 1}</td>
                                <td>${item.itemName}</td>
                                <td>${item.itemCode}</td>
                                <td class="text-center">${formatQuantity(item.quantity)}</td>
                                <td>
                                    ${item.measurements?.map((m: any) => `${m.attributeName}: ${m.value}`).join(", ") || ""}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h3>Định mức vật tư (Dự kiến)</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px">STT</th>
                            <th>Sản phẩm</th>
                            <th>Tên vật tư</th>
                            <th>Mã vật tư</th>
                            <th style="width: 80px">ĐVT</th>
                            <th style="width: 100px">Tổng định mức</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materialRequirements?.map((mat: any, index: number) => `
                            <tr>
                                <td class="text-center">${index + 1}</td>
                                <td>${mat.productName}</td>
                                <td>${mat.materialName}</td>
                                <td>${mat.materialCode}</td>
                                <td class="text-center">${mat.unit}</td>
                                <td class="text-center">${formatQuantity(mat.quantityPlanned)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" class="text-center">Chưa có thông tin định mức</td></tr>'}
                    </tbody>
                </table>

                <div class="footer">
                    <div class="signature-box">
                        <div class="signature-title">Người lập phiếu</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-title">Quản lý sản xuất</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-title">Kho</div>
                    </div>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
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
                <Space>
                    <Button icon={<PrinterOutlined />} onClick={handlePrintTicket}>
                        In phiếu
                    </Button>
                    {getActionButton()}
                </Space>
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

                <Col span={24}>
                    <Card title="Định mức vật tư (Dự kiến)" loading={isLoadingMaterials}>
                        <Table
                            dataSource={materialRequirements}
                            rowKey={(record: any) => `${record.materialId}_${record.productId}`}
                            pagination={false}
                            columns={[
                                {
                                    title: "Sản phẩm",
                                    dataIndex: "productName",
                                    key: "productName",
                                    render: (text, record: any, index) => {
                                        const obj = {
                                            children: <span className="font-medium">{text}</span>,
                                            props: { rowSpan: 1 },
                                        };
                                        // Simple rowSpan logic
                                        if (index > 0 && materialRequirements[index - 1].productId === record.productId) {
                                            obj.props.rowSpan = 0;
                                        } else {
                                            let count = 0;
                                            for (let i = index; i < materialRequirements.length; i++) {
                                                if (materialRequirements[i].productId === record.productId) {
                                                    count++;
                                                } else {
                                                    break;
                                                }
                                            }
                                            obj.props.rowSpan = count;
                                        }
                                        return obj;
                                    },
                                },
                                {
                                    title: "Tên vật tư",
                                    dataIndex: "materialName",
                                    key: "materialName",
                                },
                                {
                                    title: "Mã vật tư",
                                    dataIndex: "materialCode",
                                    key: "materialCode",
                                },
                                {
                                    title: "ĐVT",
                                    dataIndex: "unit",
                                    key: "unit",
                                },
                                {
                                    title: "Tổng định mức",
                                    dataIndex: "quantityPlanned",
                                    key: "quantityPlanned",
                                    render: (value) => formatQuantity(value),
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
