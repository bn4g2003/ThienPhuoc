import { useIsMobile } from "@/hooks/useIsMobile";
import type { TableColumnsType } from "antd";
import { Pagination, Space, Table } from "antd";
import { useEffect, useRef, useState } from "react";

interface ICommonTableProps<T> {
  dataSource?: T[];
  columns: TableColumnsType<T>;
  paging?: boolean;
  rank?: boolean;
  loading: boolean;
}

const CommonTable = <T extends object>({
  dataSource,
  columns,
  paging = true,
  rank = false,
  loading = false,
}: ICommonTableProps<T>) => {
  const [page, setPage] = useState(1);
  const pagingRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(10);
  const isMobile = useIsMobile();

  const handlePageChange = (page: number) => {
    setPage(page);
  };
  const hasNo = columns.some((col) => col.key === "stt");
  if (rank && !hasNo && !isMobile) {
    columns.unshift({
      title: "#",
      key: "stt",
      width: 50,
      render: (_, __, index) => <div>{index + 1 + (page - 1) * limit}</div>,
    });
  }
  columns.forEach((col) => {
    if (!col.sorter && "dataIndex" in col && col.dataIndex) {
      col.sorter = (a: T, b: T) => {
        const aValue = a[col.dataIndex as keyof T];
        const bValue = b[col.dataIndex as keyof T];
        if (typeof aValue === "number" && typeof bValue === "number") {
          return aValue - bValue;
        }
        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue);
        }
        return 0;
      };
    }
    if (col.width === undefined) {
      col.width = 100;
    }
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= documentHeight) {
        if (pagingRef.current) {
          pagingRef.current.style.backgroundColor = "transparent";
        }
      } else if (pagingRef.current) {
        pagingRef.current.style.opacity = "0.95";
        pagingRef.current.style.backdropFilter = "blur(30px)";
      }
    };
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <Table<T>
        rowKey="id"
        bordered={true}
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        scroll={{
          x: "horizontal",
        }}
      />
      {paging && (
        <Space
          ref={pagingRef}
          className="sticky bottom-0 flex w-full justify-end py-3"
        >
          <Pagination
            onChange={handlePageChange}
            pageSize={limit}
            total={dataSource?.length || 0}
            showSizeChanger
            onShowSizeChange={(_, size) => setLimit(size)}
            current={page}
          />
        </Space>
      )}
    </>
  );
};
export default CommonTable;
