"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Button, Select, Spin, Tag } from "antd";
import { useEffect, useState } from "react";

type BalanceItem = {
  warehouseId: number;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  itemType: "NVL" | "THANH_PHAM";
  quantity: number;
  unit: string;
};

type Warehouse = {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: "NVL" | "THANH_PHAM";
  branchId: number;
  branchName?: string;
};

export default function Page() {
  const { can } = usePermissions();
  const { reset, applyFilter, updateQueries, query } = useFilter();
  const [view, setView] = useState<"detail" | "summary">("detail");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

  // Lấy danh sách kho
  const { data: warehousesData = [] } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/warehouses");
      const body = await res.json();
      return body.success ? body.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Tự động chọn kho đầu tiên
  useEffect(() => {
    if (warehousesData.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehousesData[0].id);
    }
  }, [warehousesData, selectedWarehouseId]);

  const columnsAll: TableColumnsType<BalanceItem> = [
    { title: "Mã", dataIndex: "itemCode", key: "itemCode", width: 140 },
    { title: "Tên", dataIndex: "itemName", key: "itemName", width: 300 },
    {
      title: "Loại",
      dataIndex: "itemType",
      key: "itemType",
      width: 120,
      render: (t: string) => (
        <Tag color={t === "NVL" ? "purple" : "green"}>
          {t === "NVL" ? "NVL" : "TP"}
        </Tag>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 140,
      align: "right",
      render: (q: number) => q?.toLocaleString() || "0",
    },
    { title: "Đơn vị", dataIndex: "unit", key: "unit", width: 120 },
  ];

  const { columnsCheck, updateColumns, resetColumns, getVisibleColumns } =
    useColumn({ defaultColumns: columnsAll });

  const { data: balanceData = { details: [], summary: [] }, isLoading } =
    useQuery({
      queryKey: ["inventory", "balance", selectedWarehouseId],
      enabled: !!selectedWarehouseId,
      queryFn: async () => {
        const res = await fetch(
          `/api/inventory/balance?warehouseId=${selectedWarehouseId}`
        );
        const body = await res.json();
        
        if (!body.success) {
          throw new Error(body.error || 'Failed to fetch balance');
        }
        
        return body.data;
      },
      staleTime: 60 * 1000,
    });

  if (!can("inventory.balance", "view")) {
    return <div className="text-center py-12">🔒 Không có quyền truy cập</div>;
  }

  const details: BalanceItem[] = balanceData.details || [];
  type SummaryItem = {
    itemCode: string;
    itemName: string;
    itemType: "NVL" | "THANH_PHAM";
    totalQuantity: number;
    unit: string;
  };
  const summary: SummaryItem[] = (balanceData.summary as SummaryItem[]) || [];

  const filteredDetails = applyFilter<BalanceItem>(details);

  return (
    <WrapperContent<BalanceItem>
      isLoading={isLoading}
      header={{
        searchInput: {
          placeholder: "Tìm kiếm",
          filterKeys: ["itemName", "itemCode"],
        },
        filters: {
          fields: [],
          onApplyFilter: (arr) => updateQueries(arr),
          onReset: () => reset(),
          query,
        },
        columnSettings: {
          columns: columnsCheck,
          onChange: (c) => updateColumns(c),
          onReset: () => resetColumns(),
        },
        customToolbar: (
          <div className="flex items-center gap-2">
            <Select
              style={{ width: 200 }}
              placeholder="Chọn kho"
              value={selectedWarehouseId}
              onChange={(value) => setSelectedWarehouseId(value)}
              options={warehousesData.map((w) => ({
                label: `${w.warehouseName} (${w.branchName || ''})`,
                value: w.id,
              }))}
            />
            {/* <Segmented
              value={view}
              onChange={(v: string | number) => setView(v as "detail" | "summary")}
              options={[
                { label: "Chi tiết", value: "detail" },
                { label: "Tổng hợp", value: "summary" },
              ]}
            /> */}
            <Button icon={<UploadOutlined />}>Nhập Excel</Button>
            <Button icon={<DownloadOutlined />}>Xuất Excel</Button>
          </div>
        ),
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spin />
        </div>
      ) : view === "detail" ? (
        <CommonTable
          loading={isLoading}
          columns={getVisibleColumns()}
          dataSource={filteredDetails}
          paging
          rank
        />
      ) : (
        <table className="w-full bg-white rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mã
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Loại
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Tổng tồn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Đơn vị
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {summary.map((s) => (
              <tr key={s.itemCode} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono">{s.itemCode}</td>
                <td className="px-6 py-4 text-sm font-medium">{s.itemName}</td>
                <td className="px-6 py-4">
                  <Tag color={s.itemType === "NVL" ? "purple" : "green"}>
                    {s.itemType === "NVL" ? "NVL" : "Thành phẩm"}
                  </Tag>
                </td>
                <td className="px-6 py-4 text-sm text-right font-bold">
                  {(s.totalQuantity || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">{s.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WrapperContent>
  );
}
