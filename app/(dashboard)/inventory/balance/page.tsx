"use client";

import CommonTable from "@/components/CommonTable";
import WrapperContent from "@/components/WrapperContent";
import useColumn from "@/hooks/useColumn";
import { useFileExport } from "@/hooks/useFileExport";
import { useFileImport } from "@/hooks/useFileImport";
import useFilter from "@/hooks/useFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import { Select, Tag } from "antd";
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

  const { exportToXlsx } = useFileExport(columnsAll);
  const { openFileDialog } = useFileImport();

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
  const filteredDetails = applyFilter<BalanceItem>(details);

  const handleExportExcel = () => {
    const warehouseName = warehousesData.find(w => w.id === selectedWarehouseId)?.warehouseName || 'kho';
    exportToXlsx(filteredDetails, `ton-kho-${warehouseName}`);
  };

  const handleImportExcel = () => {
    openFileDialog(
      (data) => {
        console.log('Imported data:', data);
        alert(`Đã đọc ${data.length} dòng. Chức năng xử lý dữ liệu đang được phát triển.`);
      },
      (error) => {
        console.error('Import error:', error);
      }
    );
  };

  return (
    <WrapperContent<BalanceItem>
      isLoading={isLoading}
      header={{
        searchInput: {
          placeholder: "Tìm kiếm",
          filterKeys: ["itemName", "itemCode"],
        },
        filters: {
          fields: [
            {
              type: "select",
              name: "itemType",
              label: "Loại",
              options: [
                { label: "Nguyên vật liệu", value: "NVL" },
                { label: "Thành phẩm", value: "THANH_PHAM" },
              ],
            },
          ],
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
        ),
        buttonEnds: [
          {
            type: 'default',
            name: 'Nhập Excel',
            onClick: handleImportExcel,
            icon: <UploadOutlined />,
          },
          {
            type: 'default',
            name: 'Xuất Excel',
            onClick: handleExportExcel,
            icon: <DownloadOutlined />,
          },
        ],
      }}
    >
      <CommonTable
        loading={isLoading}
        columns={getVisibleColumns()}
        dataSource={filteredDetails}
        paging
        rank
      />
    </WrapperContent>
  );
}
