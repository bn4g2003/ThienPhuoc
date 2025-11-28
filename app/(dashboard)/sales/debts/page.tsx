"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Statistic, type TableColumnsType } from "antd";
import { useState } from "react";

import CommonTable from "@/components/CommonTable";
import PartnerDebtSidePanel from "@/components/PartnerDebtSidePanel";
import TableActions from "@/components/TableActions";
import WrapperContent from "@/components/WrapperContent";

import { useBranches } from "@/hooks/useCommonQuery";
import { useFileExport } from "@/hooks/useFileExport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import SuperJSON from "superjson";

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

interface BankAccount {
  id: number;
  accountNumber: string;
  bankName: string;
  balance: number;
}

export default function CustomerDebtsPage() {
  const { can, isAdmin } = usePermissions();
  const {
    reset,
    applyFilter,
    updateQueries,
    query,
    pagination,
    handlePageChange,
  } = useFilter();
  const { data: branches = [] } = useBranches();

  const { data: customerSummaries = [], isLoading } = useQuery<
    CustomerSummary[]
  >({
    queryKey: ["customer-debts-summary", SuperJSON.stringify(query)],
    queryFn: async () => {
      const branchId = query.branchId || "all";
      const branchParam = branchId !== "all" ? `&branchId=${branchId}` : "";
      const res = await fetch(
        `/api/finance/debts/summary?type=customers${branchParam}`
      );
      const data = await res.json();
      return data.success ? data.data : [];
    },
  });

  const filteredCustomerSummaries = applyFilter(customerSummaries);

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
  const [bankAccounts] = useState<BankAccount[]>([]);
  const [showSidePanel, setShowSidePanel] = useState(false);

  const { exportToXlsx } = useFileExport([
    { title: "Mã KH", dataIndex: "customerCode", key: "customerCode" },
    { title: "Tên khách hàng", dataIndex: "customerName", key: "customerName" },
    { title: "Điện thoại", dataIndex: "phone", key: "phone" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Tổng đơn hàng", dataIndex: "totalOrders", key: "totalOrders" },
    { title: "Tổng tiền", dataIndex: "totalAmount", key: "totalAmount" },
    { title: "Đã trả", dataIndex: "paidAmount", key: "paidAmount" },
    { title: "Còn nợ", dataIndex: "remainingAmount", key: "remainingAmount" },
    {
      title: "Đơn chưa thanh toán",
      dataIndex: "unpaidOrders",
      key: "unpaidOrders",
    },
  ]);

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

  const totalReceivable = filteredCustomerSummaries.reduce(
    (sum, c) => sum + parseFloat(c.remainingAmount?.toString() || "0"),
    0
  );

  const columns: TableColumnsType<CustomerSummary> = [
    {
      title: "Mã KH",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 120,
      fixed: "left",
    },
    {
      title: "Tên khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 200,
    },
    {
      title: "Điện thoại",
      dataIndex: "phone",
      key: "phone",
      width: 130,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
    },
    {
      title: "Tổng đơn hàng",
      dataIndex: "totalOrders",
      key: "totalOrders",
      width: 130,
      align: "right",
      render: (value: number) => `${value} đơn`,
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 130,
      align: "right",
      render: (value: number) => `${value.toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Đã trả",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: 130,
      align: "right",
      render: (value: number) => `${value.toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Còn nợ",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 130,
      align: "right",
      render: (value: number) => `${value.toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Đơn chưa TT",
      dataIndex: "unpaidOrders",
      key: "unpaidOrders",
      width: 130,
      align: "right",
      render: (value: number) => (value > 0 ? `${value} đơn` : "-"),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_: unknown, record: CustomerSummary) => (
        <TableActions
          onView={() => handleViewPartnerDetails(record)}
          canView={can("finance.debts", "view")}
        />
      ),
    },
  ];

  return (
    <>
      <WrapperContent<CustomerSummary>
        isNotAccessible={!can("finance.debts", "view")}
        isLoading={isLoading}
        header={{
          refetchDataWithKeys: ["customer-debts-summary"],
          buttonEnds: [
            {
              type: "default",
              name: "Xuất Excel",
              onClick: () =>
                exportToXlsx(
                  filteredCustomerSummaries as CustomerSummary[],
                  "customer-debts"
                ),
              icon: <DownloadOutlined />,
            },
          ],
          searchInput: {
            placeholder: "Tìm theo mã KH, tên, SĐT...",
            filterKeys: ["customerCode", "customerName", "phone"],
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
                        ...(branches || []).map((b) => ({
                          label: b.branchName,
                          value: b.id.toString(),
                        })),
                      ],
                    },
                  ]
                : []),
              {
                type: "select",
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
              title="Tổng phải thu"
              value={totalReceivable}
              suffix="đ"
              styles={{
                content: {
                  color: "#16a34a",
                  fontSize: "2rem",
                  fontWeight: "bold",
                },
              }}
            />
            <div className="text-xs text-green-600 mt-1">
              {filteredCustomerSummaries.length} khách hàng
            </div>
          </Card>

          <CommonTable
            pagination={{ ...pagination, onChange: handlePageChange }}
            columns={columns}
            dataSource={filteredCustomerSummaries}
            loading={isLoading}
            paging
            rank
          />
        </div>
      </WrapperContent>

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
          }}
        />
      )}
    </>
  );
}
