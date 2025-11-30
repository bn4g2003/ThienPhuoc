"use client";

import CommonTable from "@/components/CommonTable";
import PartnerDebtSidePanel from "@/components/PartnerDebtSidePanel";
import WrapperContent from "@/components/WrapperContent";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import {
    DownloadOutlined,
    MailOutlined,
    PhoneOutlined
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Statistic } from "antd";
import { useState } from "react";

interface CustomerSummary {
  id: number;
  customerCode: string;
  customerName: string;
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

interface User {
  id: number;
  username: string;
  roleCode: string;
  branchId: number | null;
}

export default function CustomerDebtsPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const { query, updateQueries, reset } = useFilter();
  const { exportToXlsx } = useFileExport([]);

  const [selectedPartner, setSelectedPartner] = useState<{
    id: number;
    name: string;
    code: string;
    type: "customer";
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    totalOrders: number;
    unpaidOrders: number;
  } | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        return data.data.user;
      }
      return null;
    },
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches");
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  const { data: bankAccounts = [], isLoading: bankLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/finance/bank-accounts?isActive=true");
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  const {
    data: customerSummaries = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["debts-summary", query["branchId"] || "all"],
    queryFn: async () => {
      const branchParam =
        query["branchId"] && query["branchId"] !== "all"
          ? `&branchId=${query["branchId"]}`
          : "";
      const res = await fetch(
        `/api/finance/debts/summary?type=customers${branchParam}`
      );
      const data = await res.json();
      return data.success ? data.data || [] : [];
    },
  });

  const isAdmin = currentUser?.roleCode === "ADMIN";

  const handleExportExcel = () => {
    exportToXlsx(filteredCustomerSummaries, "debts-customers");
  };

  const handleViewPartnerDetails = (customer: CustomerSummary) => {
    setSelectedPartner({
      id: customer.id,
      name: customer.customerName,
      code: customer.customerCode,
      type: "customer",
      totalAmount: parseFloat(customer.totalAmount.toString()),
      paidAmount: parseFloat(customer.paidAmount.toString()),
      remainingAmount: parseFloat(customer.remainingAmount.toString()),
      totalOrders: customer.totalOrders,
      unpaidOrders: customer.unpaidOrders,
    });
    setShowSidePanel(true);
  };

  const columns = [
    {
      title: "Mã KH",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 120,
      fixed: "left" as const,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 200,
      fixed: "left" as const,
    },
    {
      title: "Liên hệ",
      dataIndex: "phone",
      key: "phone",
      width: 190,
      render: (_: unknown, record: CustomerSummary) => (
        <div className="text-gray-600">
          <div>
            <PhoneOutlined /> {record.phone}
          </div>
          {record.email && (
            <div className="text-xs">
              <MailOutlined /> {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Số ĐH",
      dataIndex: "totalOrders",
      key: "totalOrders",
      width: 100,
      align: "left" as const,
      render: (_: unknown, record: CustomerSummary) => (
        <div>
          <div>{record.totalOrders} đơn</div>
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
      width: 150,
      align: "right" as const,
      render: (value: unknown) =>
        `${parseFloat(String(value || "0")).toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Đã trả",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: 150,
      align: "right" as const,
      render: (value: unknown) => (
        <span className="text-green-600">
          {parseFloat(String(value || "0")).toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      title: "Còn nợ",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 150,
      align: "right" as const,
      render: (value: unknown) => (
        <span className="font-medium text-orange-700">
          {parseFloat(String(value || "0")).toLocaleString("vi-VN")} đ
        </span>
      ),
    },

  ];

  const filteredCustomerSummaries = customerSummaries.filter(
    (c: CustomerSummary) => {
      const searchValue = query["search"] || "";
      const matchSearch =
        !searchValue ||
        c.customerCode.toLowerCase().includes(searchValue.toLowerCase()) ||
        c.customerName.toLowerCase().includes(searchValue.toLowerCase()) ||
        c.phone?.includes(searchValue);

      const hasDebtValue = query["hasDebt"];
      const matchDebt =
        hasDebtValue === undefined ||
        (hasDebtValue === "true"
          ? c.remainingAmount > 0
          : c.remainingAmount === 0);

      return matchSearch && matchDebt;
    }
  );

  const totalReceivable = filteredCustomerSummaries.reduce(
    (sum: number, c: CustomerSummary) =>
      sum + parseFloat(c.remainingAmount?.toString() || "0"),
    0
  );

  return (
    <>
      <WrapperContent
        isRefetching={isFetching}
        title="Công nợ khách hàng"
        isNotAccessible={!can("finance.debts", "view")}
        isLoading={isLoading || branchesLoading || bankLoading}
        header={{
          refetchDataWithKeys: ["debts-summary"],
          buttonEnds: [
            {
              icon: <DownloadOutlined />,
              onClick: handleExportExcel,
              name: "Xuất Excel",
            },
            {
              icon: <DownloadOutlined />,
              onClick: handleExportExcel,
              name: "Xuất Excel",
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã KH, tên, SĐT...",
            filterKeys: ["customerCode", "customerName", "phone"],
          },
          filters: {
            fields: [
              {
                type: "select",
                name: "hasDebt",
                label: "Công nợ",
                options: [
                  { label: "Có công nợ", value: "true" },
                  { label: "Đã thanh toán", value: "false" },
                ],
              },
              {
                type: "select",
                name: "branchId",
                label: "Chi nhánh",
                options: isAdmin
                  ? [
                      { label: "Tất cả", value: "all" },
                      ...branches.map((branch: Branch) => ({
                        label: branch.branchName,
                        value: branch.id,
                      })),
                    ]
                  : branches
                      .filter(
                        (branch: Branch) => branch.id === currentUser?.branchId
                      )
                      .map((branch: Branch) => ({
                        label: branch.branchName,
                        value: branch.id,
                      })),
              },
            ],
            query,
            onApplyFilter: updateQueries,
            onReset: reset,
          },
        }}
      >
        <div className="flex">
          <div className="flex-1">
            <div className="flex flex-col gap-4">
              {/* Summary */}
              <Card>
                <Statistic
                  title="Tổng phải thu"
                  value={totalReceivable}
                  suffix="đ"
                  styles={{
                    content: { color: "#52c41a" },
                  }}
                  formatter={(value) =>
                    `${Number(value).toLocaleString("vi-VN")} đ`
                  }
                />
                <div className="text-xs text-gray-600 mt-2">
                  {filteredCustomerSummaries.length} khách hàng
                </div>
              </Card>

              {/* Customer Summary Table */}
              <CommonTable
                columns={columns}
                dataSource={filteredCustomerSummaries}
                loading={
                  isLoading || branchesLoading || bankLoading || isFetching
                }
                paging={false}
                onRowClick={handleViewPartnerDetails}
              />
            </div>
          </div>

          {/* Side Panel */}
          {selectedPartner && (
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
              open={showSidePanel}
              onClose={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
              }}
              onPaymentSuccess={() => {
                setShowSidePanel(false);
                setSelectedPartner(null);
                queryClient.invalidateQueries({ queryKey: ["debts-summary"] });
              }}
            />
          )}
        </div>
      </WrapperContent>
    </>
  );
}
