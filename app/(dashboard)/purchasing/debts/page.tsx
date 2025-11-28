"use client";

import CommonTable from "@/components/CommonTable";
import PartnerDebtSidePanel from "@/components/PartnerDebtSidePanel";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { App, Card, Statistic } from "antd";
import { useState } from "react";

interface SupplierSummary {
  id: number;
  supplierCode: string;
  supplierName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  unpaidOrders: number;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
}

export default function SupplierDebtsPage() {
  const { can } = usePermissions();
  const { message } = App.useApp();
  const { query, updateQueries, reset, applyFilter } = useFilter();

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      return data.success ? data.data.user : null;
    },
  });

  // Get branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: currentUser?.roleCode === "ADMIN",
  });

  // Get bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/bank-accounts?isActive=true");
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  // Get supplier summaries
  const { data: supplierSummaries = [], isLoading } = useQuery({
    queryKey: ["supplier-debts", query],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          qs.append(key, String(value));
        }
      });

      const res = await fetch(
        `/api/finance/debts/summary?type=suppliers&${qs}`
      );
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: can("finance.debts", "view"),
  });

  const [selectedPartner, setSelectedPartner] = useState<{
    id: number;
    name: string;
    code: string;
    type: "supplier";
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    totalOrders: number;
    unpaidOrders: number;
  } | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);

  const isAdmin = currentUser?.roleCode === "ADMIN";

  const filteredSupplierSummaries = applyFilter(
    supplierSummaries
  ) as SupplierSummary[];

  const totalPayable = filteredSupplierSummaries.reduce(
    (sum: number, s: SupplierSummary) =>
      sum + parseFloat(s.remainingAmount?.toString() || "0"),
    0
  );

  const handleViewPartnerDetails = (supplier: SupplierSummary) => {
    setSelectedPartner({
      id: supplier.id,
      name: supplier.supplierName,
      code: supplier.supplierCode,
      type: "supplier",
      totalAmount: parseFloat(supplier.totalAmount.toString()),
      paidAmount: parseFloat(supplier.paidAmount.toString()),
      remainingAmount: parseFloat(supplier.remainingAmount.toString()),
      totalOrders: supplier.totalOrders,
      unpaidOrders: supplier.unpaidOrders,
    });
    setShowSidePanel(true);
  };

  const handleExportExcel = () => {
    message.info("Chức năng xuất Excel đang được phát triển");
  };

  const handleImportExcel = () => {
    message.info("Chức năng nhập Excel đang được phát triển");
  };

  const columns = [
    {
      title: "Mã NCC",
      dataIndex: "supplierCode",
      key: "supplierCode",
      width: 120,
      fixed: "left" as const,
    },
    {
      title: "Nhà cung cấp",
      dataIndex: "supplierName",
      key: "supplierName",
      width: 200,
      fixed: "left" as const,
    },
    {
      title: "Liên hệ",
      dataIndex: "phone",
      key: "phone",
      width: 180,
      render: (_: string, record: SupplierSummary) => (
        <div>
          <div>📞 {record.phone}</div>
          {record.email && <div className="text-xs">✉️ {record.email}</div>}
        </div>
      ),
    },
    {
      title: "Số ĐM",
      dataIndex: "totalOrders",
      key: "totalOrders",
      width: 100,
      align: "center" as const,
      render: (_: number, record: SupplierSummary) => (
        <div>
          {record.totalOrders} đơn
          {record.unpaidOrders > 0 && (
            <div className="text-xs text-orange-600">
              {record.unpaidOrders} chưa TT
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 140,
      align: "right" as const,
      render: (value: number) =>
        `${parseFloat(value.toString()).toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Đã trả",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: 140,
      align: "right" as const,
      render: (value: number) =>
        `${parseFloat(value.toString()).toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Còn nợ",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 140,
      align: "right" as const,
      render: (value: number) =>
        `${parseFloat(value.toString()).toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right" as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: SupplierSummary) => (
        <TableActions
          onView={() => handleViewPartnerDetails(record)}
          canView={true}
        />
      ),
    },
  ];

  return (
    <>
      <WrapperContent
        isNotAccessible={!can("finance.debts", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["supplier-debts"],
          buttonEnds: [
            ...(isAdmin
              ? [
                  {
                    type: "default" as const,
                    name: "Nhập Excel",
                    onClick: handleImportExcel,
                    icon: <UploadOutlined />,
                  },
                ]
              : []),
            {
              type: "default" as const,
              name: "Xuất Excel",
              onClick: handleExportExcel,
              icon: <DownloadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã NCC, tên, SĐT...",
            filterKeys: ["supplierCode", "supplierName", "phone"],
          },
          filters: {
            fields: [
              ...(isAdmin
                ? [
                    {
                      type: "select" as const,
                      name: "branchId",
                      label: "Chi nhánh",
                      options: [
                        { label: "Tất cả chi nhánh", value: "all" },
                        ...branches.map((b: Branch) => ({
                          label: b.branchName,
                          value: b.id.toString(),
                        })),
                      ],
                    },
                  ]
                : []),
              {
                type: "select" as const,
                name: "hasDebt",
                label: "Công nợ",
                options: [
                  { label: "Có công nợ", value: "true" },
                  { label: "Đã thanh toán", value: "false" },
                ],
              },
            ],
            onApplyFilter: (arr) => updateQueries(arr),
            onReset: () => reset(),
            query,
          },
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <Card>
            <Statistic
              title="Tổng phải trả"
              value={totalPayable}
              suffix="đ"
              styles={{
                content: { color: "#cf1322" },
              }}
            />
            <div className="text-xs text-gray-600 mt-1">
              {filteredSupplierSummaries.length} nhà cung cấp
            </div>
          </Card>

          {/* Supplier Summary Table */}
          <CommonTable
            columns={columns}
            dataSource={filteredSupplierSummaries}
            pagination={{
              current: 1,
              pageSize: 1000,
              limit: 1000,
              onChange: () => {},
            }}
            paging={false}
            loading={isLoading}
          />

          {/* Side Panel */}
          {showSidePanel && selectedPartner && (
            <PartnerDebtSidePanel
              partnerId={selectedPartner.id}
              partnerName={selectedPartner.name}
              partnerCode={selectedPartner.code}
              partnerType={selectedPartner.type}
              totalAmount={selectedPartner.totalAmount}
              paidAmount={selectedPartner.paidAmount}
              remainingAmount={selectedPartner.remainingAmount}
              totalOrders={selectedPartner.totalOrders}
              unpaidOrders={selectedPartner.unpaidOrders}
              bankAccounts={bankAccounts}
              canEdit={can("finance.debts", "edit")}
              onClose={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
              }}
              onPaymentSuccess={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
                // TanStack Query will automatically refetch
              }}
            />
          )}
        </div>
      </WrapperContent>
    </>
  );
}
