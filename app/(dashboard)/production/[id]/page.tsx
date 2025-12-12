"use client";

import { useGetCompany } from "@/hooks/useCompany";
import { formatQuantity } from "@/utils/format";
import { ArrowRightOutlined, CalendarOutlined, CheckOutlined, DeleteOutlined, LeftOutlined, PrinterOutlined, UserAddOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Checkbox, Col, DatePicker, Descriptions, Form, Input, message, Modal, Popconfirm, Row, Select, Space, Spin, Steps, Table, Tag, Typography, type CheckboxProps } from "antd";
import dayjs from "dayjs";
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
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [selectedItemsForPrint, setSelectedItemsForPrint] = useState<number[]>([]);
    const [showWorkerModal, setShowWorkerModal] = useState(false);
    const [workerForm] = Form.useForm();
    const [showDatesModal, setShowDatesModal] = useState(false);
    const [datesForm] = Form.useForm();

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

    // Lấy danh sách nhân viên đã phân công
    const { data: assignedWorkers = [], isLoading: isLoadingWorkers } = useQuery({
        queryKey: ["production-order-workers", id],
        queryFn: async () => {
            const res = await fetch(`/api/production/orders/${id}/workers`);
            const data = await res.json();
            return data.data || [];
        },
        enabled: !!id,
    });

    // Lấy danh sách tất cả nhân viên sản xuất
    const { data: allWorkers = [] } = useQuery({
        queryKey: ["production-workers-all"],
        queryFn: async () => {
            const res = await fetch("/api/production/workers?isActive=true&pageSize=1000");
            const data = await res.json();
            return data.data || [];
        },
    });

    // Mutation thêm nhân viên
    const addWorkerMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch(`/api/production/orders/${id}/workers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Đã thêm nhân viên");
                queryClient.invalidateQueries({ queryKey: ["production-order-workers", id] });
                setShowWorkerModal(false);
                workerForm.resetFields();
            } else {
                message.error(data.error);
            }
        },
    });

    // Mutation xóa nhân viên
    const removeWorkerMutation = useMutation({
        mutationFn: async (assignmentId: number) => {
            const res = await fetch(`/api/production/orders/${id}/workers?assignmentId=${assignmentId}`, {
                method: "DELETE",
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Đã xóa phân công");
                queryClient.invalidateQueries({ queryKey: ["production-order-workers", id] });
            } else {
                message.error(data.error);
            }
        },
    });

    // Mutation cập nhật ngày
    const updateDatesMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch(`/api/production/orders/${id}/dates`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workerHandoverDate: values.workerHandoverDate?.format("YYYY-MM-DD"),
                    fittingDate: values.fittingDate?.format("YYYY-MM-DD"),
                    completionDate: values.completionDate?.format("YYYY-MM-DD"),
                    salePerson: values.salePerson,
                }),
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                message.success("Đã cập nhật thông tin");
                queryClient.invalidateQueries({ queryKey: ["production-order", id] });
                setShowDatesModal(false);
            } else {
                message.error(data.error);
            }
        },
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

    // Hàm in phiếu sản xuất A5 cho từng sản phẩm
    const handlePrintProductionA5 = () => {
        if (selectedItemsForPrint.length === 0) {
            message.warning('Vui lòng chọn ít nhất một sản phẩm để in');
            return;
        }

        const selectedItems = data.items.filter((item: any) => 
            selectedItemsForPrint.includes(item.id)
        );

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Hàm tạo dòng field - không có dấu chấm khi có giá trị
        const fieldRow = (label: string, value: string = '') => {
            if (value) {
                return `<div class="field-row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
            }
            return `<div class="field-row"><span class="label">${label}</span><span class="dots"></span></div>`;
        };

        // Hàm chia mảng thành các nhóm 3 phần tử
        const chunkArray = (arr: any[], size: number) => {
            const result = [];
            for (let i = 0; i < arr.length; i += size) {
                result.push(arr.slice(i, i + size));
            }
            return result;
        };

        // Hàm tạo grid 3 cột cho NVL hoặc thông số
        const renderGrid3Col = (items: { label: string; value: string }[]) => {
            const chunks = chunkArray(items, 3);
            return chunks.map(chunk => {
                const cols = chunk.map(item => 
                    `<div class="col"><span class="label">${item.label}:</span> <span class="val">${item.value}</span></div>`
                ).join('');
                // Thêm cột trống nếu không đủ 3
                const emptyCols = Array(3 - chunk.length).fill('<div class="col"></div>').join('');
                return `<div class="grid-row">${cols}${emptyCols}</div>`;
            }).join('');
        };

        const pagesHtml = selectedItems.map((item: any) => {
            const m = item.measurements || [];
            
            // Tìm Mã Invoice trong measurements
            const invoiceMeasurement = m.find((measurement: any) => 
                measurement.attributeName?.toLowerCase().includes('invoice') || 
                measurement.attributeName?.toLowerCase().includes('mã invoice')
            );
            const invoiceCode = invoiceMeasurement?.value || '';
            
            // Lấy định mức NVL cho sản phẩm này
            const itemMaterials = materialRequirements?.filter((mat: any) => mat.productId === item.itemId) || [];
            const materialsData = itemMaterials.map((mat: any) => ({
                label: mat.materialName,
                value: mat.materialCode
            }));
            
            // Chỉ hiển thị thông số đã được nhập (có giá trị), loại bỏ Mã Invoice
            const measurementsData = m
                .filter((measurement: any) => 
                    measurement.value && 
                    !measurement.attributeName?.toLowerCase().includes('invoice')
                )
                .map((measurement: any) => ({
                    label: measurement.attributeName,
                    value: measurement.value
                }));
            
            return `
                <div class="page">
                    <div class="header">
                        <div class="product-title">${item.itemName} x${item.quantity} (Số phiếu: ${data.orderCode})</div>
                    </div>
                    
                    <div class="content">
                        ${fieldRow('MÃ Invoice:', invoiceCode)}
                        ${fieldRow('TÊN Khách hàng:', data.customerName)}
                        
                        ${materialsData.length > 0 ? `<div class="section-grid">${renderGrid3Col(materialsData)}</div>` : ''}
                        
                        ${measurementsData.length > 0 ? `<div class="section-grid">${renderGrid3Col(measurementsData)}</div>` : ''}
                        
                        <div class="notes-section">
                            <div class="notes-header">Ghi Chú mẫu mã:</div>
                            <div class="watermark">MANGII</div>
                            <div class="notes-lines">
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                                <div class="note-line"></div>
                            </div>
                        </div>
                        
                        ${fieldRow('Ngày giao thợ:', data.workerHandoverDate ? new Date(data.workerHandoverDate).toLocaleDateString('vi-VN') : '')}
                        ${fieldRow('Ngày thử đồ:', data.fittingDate ? new Date(data.fittingDate).toLocaleDateString('vi-VN') : '')}
                        ${fieldRow('Ngày lấy thành phẩm:', data.completionDate ? new Date(data.completionDate).toLocaleDateString('vi-VN') : '')}
                        ${fieldRow('Sale:', data.salePerson || '')}
                    </div>
                </div>
            `;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Phiếu Sản Xuất A5 - ${data.orderCode}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Times New Roman', Times, serif; font-size: 12px; }
                    
                    .page {
                        width: 148mm;
                        height: 210mm;
                        padding: 6mm 8mm;
                        page-break-after: always;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                    }
                    .page:last-child { page-break-after: auto; }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 8px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 5px;
                    }
                    
                    .product-title {
                        font-size: 14px;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    
                    .content { 
                        line-height: 1.6;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .field-row {
                        display: flex;
                        align-items: baseline;
                        margin-bottom: 3px;
                    }
                    
                    .label {
                        font-weight: bold;
                        white-space: nowrap;
                    }
                    
                    .value {
                        margin-left: 5px;
                    }
                    
                    .dots {
                        flex: 1;
                        border-bottom: 1px dotted #000;
                        min-width: 30px;
                        margin-left: 5px;
                        height: 14px;
                    }
                    
                    .section-grid {
                        margin: 5px 0;
                        padding: 5px 0;
                        border-top: 1px dashed #ccc;
                        border-bottom: 1px dashed #ccc;
                    }
                    
                    .grid-row {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 2px;
                    }
                    
                    .grid-row .col {
                        flex: 1;
                        font-size: 11px;
                    }
                    
                    .grid-row .col .label {
                        font-weight: bold;
                    }
                    
                    .grid-row .col .val {
                        margin-left: 3px;
                    }
                    
                    .notes-section {
                        flex: 1;
                        margin: 8px 0;
                        position: relative;
                        min-height: 100px;
                    }
                    
                    .notes-header {
                        font-weight: bold;
                        margin-bottom: 3px;
                    }
                    
                    .watermark {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 28px;
                        font-weight: bold;
                        color: rgba(0, 0, 0, 0.06);
                        letter-spacing: 8px;
                        pointer-events: none;
                    }
                    
                    .notes-lines {
                        position: relative;
                    }
                    
                    .note-line {
                        border-bottom: 1px dotted #000;
                        height: 16px;
                    }
                    
                    @media print {
                        @page {
                            size: A5 portrait;
                            margin: 0;
                        }
                        body { margin: 0; }
                        .page {
                            width: 148mm;
                            height: 210mm;
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                ${pagesHtml}
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setShowPrintModal(false);
        setSelectedItemsForPrint([]);
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
                    <Button icon={<PrinterOutlined />} onClick={() => setShowPrintModal(true)}>
                        In phiếu SX
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
                    <Card 
                        title="Thông tin chung"
                        extra={
                            <Button 
                                icon={<CalendarOutlined />} 
                                onClick={() => {
                                    datesForm.setFieldsValue({
                                        workerHandoverDate: data.workerHandoverDate ? dayjs(data.workerHandoverDate) : null,
                                        fittingDate: data.fittingDate ? dayjs(data.fittingDate) : null,
                                        completionDate: data.completionDate ? dayjs(data.completionDate) : null,
                                        salePerson: data.salePerson || '',
                                    });
                                    setShowDatesModal(true);
                                }}
                            >
                                Cập nhật ngày
                            </Button>
                        }
                    >
                        <Descriptions bordered column={2}>
                            <Descriptions.Item label="Mã đơn hàng">{data.orderCode}</Descriptions.Item>
                            <Descriptions.Item label="Khách hàng">{data.customerName}</Descriptions.Item>
                            <Descriptions.Item label="Ngày đặt">
                                {new Date(data.orderDate).toLocaleDateString("vi-VN")}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={data.status === "PENDING" ? "orange" : "blue"}>{data.status}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày giao thợ">
                                {data.workerHandoverDate ? new Date(data.workerHandoverDate).toLocaleDateString("vi-VN") : "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày thử đồ">
                                {data.fittingDate ? new Date(data.fittingDate).toLocaleDateString("vi-VN") : "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày lấy thành phẩm">
                                {data.completionDate ? new Date(data.completionDate).toLocaleDateString("vi-VN") : "-"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Sale">
                                {data.salePerson || "-"}
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

                <Col span={24}>
                    <Card 
                        title="Nhân viên sản xuất" 
                        loading={isLoadingWorkers}
                        extra={
                            <Button 
                                type="primary" 
                                icon={<UserAddOutlined />} 
                                onClick={() => setShowWorkerModal(true)}
                            >
                                Thêm nhân viên
                            </Button>
                        }
                    >
                        <Table
                            dataSource={assignedWorkers}
                            rowKey="id"
                            pagination={false}
                            columns={[
                                {
                                    title: "Mã NV",
                                    dataIndex: "worker_code",
                                    key: "worker_code",
                                    width: 100,
                                },
                                {
                                    title: "Họ tên",
                                    dataIndex: "full_name",
                                    key: "full_name",
                                },
                                {
                                    title: "SĐT",
                                    dataIndex: "phone",
                                    key: "phone",
                                    width: 120,
                                },
                                {
                                    title: "Danh mục",
                                    dataIndex: "category_name",
                                    key: "category_name",
                                    render: (value: string) => value || "-",
                                },
                                {
                                    title: "Công đoạn",
                                    dataIndex: "assigned_step",
                                    key: "assigned_step",
                                    render: (step: string) => {
                                        if (!step) return "-";
                                        const stepMap: Record<string, string> = {
                                            CUTTING: "Cắt",
                                            SEWING: "May",
                                            FINISHING: "Hoàn thiện",
                                            QC: "KCS",
                                        };
                                        return <Tag>{stepMap[step] || step}</Tag>;
                                    },
                                },
                                {
                                    title: "Ghi chú",
                                    dataIndex: "notes",
                                    key: "notes",
                                    render: (value: string) => value || "-",
                                },
                                {
                                    title: "",
                                    key: "actions",
                                    width: 60,
                                    render: (_: any, record: any) => (
                                        <Popconfirm
                                            title="Xóa phân công này?"
                                            onConfirm={() => removeWorkerMutation.mutate(record.id)}
                                        >
                                            <Button type="text" danger icon={<DeleteOutlined />} />
                                        </Popconfirm>
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

            {/* Modal chọn sản phẩm để in phiếu SX A5 */}
            <Modal
                title="Chọn sản phẩm để in phiếu sản xuất"
                open={showPrintModal}
                onCancel={() => {
                    setShowPrintModal(false);
                    setSelectedItemsForPrint([]);
                }}
                onOk={handlePrintProductionA5}
                okText="In phiếu"
                cancelText="Hủy"
                width={600}
            >
                <div className="mb-4">
                    <Checkbox
                        checked={selectedItemsForPrint.length === data.items.length}
                        indeterminate={selectedItemsForPrint.length > 0 && selectedItemsForPrint.length < data.items.length}
                        onChange={((e: Parameters<NonNullable<CheckboxProps['onChange']>>[0]) => {
                            if (e.target.checked) {
                                setSelectedItemsForPrint(data.items.map((item: any) => item.id));
                            } else {
                                setSelectedItemsForPrint([]);
                            }
                        })}
                    >
                        Chọn tất cả
                    </Checkbox>
                </div>
                <Table
                    dataSource={data.items}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    rowSelection={{
                        selectedRowKeys: selectedItemsForPrint,
                        onChange: (selectedRowKeys) => {
                            setSelectedItemsForPrint(selectedRowKeys as number[]);
                        },
                    }}
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
                            width: 80,
                            render: (value) => formatQuantity(value),
                        },
                    ]}
                />
                <div className="mt-4 text-sm text-gray-500">
                    Đã chọn {selectedItemsForPrint.length} sản phẩm. Mỗi sản phẩm sẽ được in trên 1 trang A5.
                </div>
            </Modal>

            {/* Modal thêm nhân viên vào đơn sản xuất */}
            <Modal
                title="Thêm nhân viên vào đơn sản xuất"
                open={showWorkerModal}
                onCancel={() => {
                    setShowWorkerModal(false);
                    workerForm.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={workerForm}
                    layout="vertical"
                    onFinish={(values) => addWorkerMutation.mutate(values)}
                >
                    <Form.Item
                        name="workerId"
                        label="Nhân viên"
                        rules={[{ required: true, message: "Vui lòng chọn nhân viên" }]}
                    >
                        <Select
                            showSearch
                            placeholder="Chọn nhân viên"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={allWorkers.map((w: any) => ({
                                label: `${w.worker_code} - ${w.full_name}${w.category_name ? ` (${w.category_name})` : ''}`,
                                value: w.id,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="assignedStep" label="Công đoạn">
                        <Select
                            placeholder="Chọn công đoạn (không bắt buộc)"
                            allowClear
                            options={[
                                { label: "Cắt", value: "CUTTING" },
                                { label: "May", value: "SEWING" },
                                { label: "Hoàn thiện", value: "FINISHING" },
                                { label: "KCS", value: "QC" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="notes" label="Ghi chú">
                        <Select
                            mode="tags"
                            placeholder="Nhập ghi chú"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item className="mb-0 text-right">
                        <Space>
                            <Button onClick={() => {
                                setShowWorkerModal(false);
                                workerForm.resetFields();
                            }}>
                                Hủy
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={addWorkerMutation.isPending}
                            >
                                Thêm
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal cập nhật ngày */}
            <Modal
                title="Cập nhật thông tin ngày"
                open={showDatesModal}
                onCancel={() => {
                    setShowDatesModal(false);
                    datesForm.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={datesForm}
                    layout="vertical"
                    onFinish={(values) => updateDatesMutation.mutate(values)}
                >
                    <Form.Item name="workerHandoverDate" label="Ngày giao thợ">
                        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="fittingDate" label="Ngày thử đồ">
                        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="completionDate" label="Ngày lấy thành phẩm">
                        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="salePerson" label="Sale">
                        <Input placeholder="Tên nhân viên sale" />
                    </Form.Item>
                    <Form.Item className="mb-0 text-right">
                        <Space>
                            <Button onClick={() => {
                                setShowDatesModal(false);
                                datesForm.resetFields();
                            }}>
                                Hủy
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={updateDatesMutation.isPending}
                            >
                                Lưu
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
