import AccessDenied from "@/components/AccessDenied";
import { FilterList } from "@/components/FilterList";
import LoaderApp from "@/components/LoaderApp";
import { IParams } from "@/hooks/useFilter";
import { useSetTitlePage } from "@/hooks/useSetTitlePage";
import {
    BREAK_POINT_WIDTH,
    BreakpointEnum,
    useWindowBreakpoint,
} from "@/hooks/useWindowBreakPoint";
import { ColumnSetting, FilterField } from "@/types";
import { queriesToInvalidate } from "@/utils/refetchData";
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    FilterOutlined,
    SearchOutlined,
    SettingOutlined,
    SyncOutlined,
} from "@ant-design/icons";
import {
    Button,
    Checkbox,
    Divider,
    Empty,
    Form,
    Input,
    Modal,
    Popover,
    Tooltip,
} from "antd";
import debounce from "lodash/debounce";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface WrapperContentProps<T extends object> {
  title?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isNotAccessible?: boolean;
  isEmpty?: boolean;
  header: {
    buttonBackTo?: string;
    refetchDataWithKeys?: string[] | readonly string[];
    buttonEnds?: {
      danger?: boolean;
      isLoading?: boolean;
      type?: "link" | "default" | "text" | "primary" | "dashed" | undefined;
      onClick?: () => void;
      name: string;
      icon: React.ReactNode;
    }[];
    searchInput?: {
      placeholder: string;
      filterKeys: (keyof T)[];
    };
    filters?: {
      fields?: FilterField[];
      query?: IParams;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onApplyFilter: (arr: { key: string; value: any }[]) => void;
      onReset?: () => void;
    };
    columnSettings?: {
      columns: ColumnSetting[];
      onChange: (columns: ColumnSetting[]) => void;
      onReset?: () => void;
    };
    customToolbar?: React.ReactNode;
  };
  className?: string;
}

function WrapperContent<T extends object>({
  children,
  title,
  header,
  isLoading = false,
  isNotAccessible = false,
  isEmpty = false,
  className = "",
}: WrapperContentProps<T>) {
  const router = useRouter();
  const [formFilter] = Form.useForm();

  useSetTitlePage(title || null);
  const [isOpenFilterModal, setIsOpenFilterModal] = useState(false);
  const [isOpenColumnSettings, setIsOpenColumnSettings] = useState(false);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const breakpoint = useWindowBreakpoint();
  const isMobileView =
    BREAK_POINT_WIDTH[breakpoint] <= BREAK_POINT_WIDTH[BreakpointEnum.LG];
  const [searchTerm, setSearchTerm] = useState(() => {
    if (header.searchInput && header.filters && header.filters.query) {
      const keys = ["search", ...header.searchInput.filterKeys].join(",");
      const query = header.filters.query;
      const term = query[keys];
      return term;
    }
    return "";
  });

  const hasActiveFilters = Boolean(
    header.filters &&
      Object.entries(header.filters.query || {}).some(([key, value]) => {
        if (typeof value === "string" && !key.includes("search"))
          return value.trim() !== "";
        if (Array.isArray(value)) return value.length > 0;
        return false;
      })
  );
  const hasFilters = Boolean(
    header.filters &&
      Object.values(header.filters.query || {}).some((v) => {
        if (typeof v === "string") return v.trim() !== "";
        if (Array.isArray(v)) return v.length > 0;
        return false;
      })
  );
  const hasActiveColumnSettings = Boolean(
    header.columnSettings &&
      header.columnSettings.columns.some((c) => c.visible === false)
  );

  const handleResetFilters = () => {
    if (header.filters?.onReset) {
      header.filters.onReset();
    }
    formFilter.resetFields();
    setSearchTerm("");
  };

  useEffect(() => {
    if (!header.filters || typeof header.filters.onApplyFilter !== "function")
      return;
    const getSearchKey = () => {
      if (header.searchInput && header.filters && header.filters.query) {
        const keys = ["search", ...header.searchInput.filterKeys].join(",");
        return keys;
      }
      return "search";
    };
    const searchKey = getSearchKey();

    const debounced = debounce((value: string) => {
      header.filters!.onApplyFilter([{ key: searchKey, value: value }]);
    }, 500);

    debounced(searchTerm);

    return () => {
      debounced.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, String(header.filters)]);

  return (
    <div className={`space-y-10 ${className}`}>
      <div className="flex items-center justify-between">
        {!isMobileView ? (
          <>
            <div className="flex items-center gap-3">
              {header.buttonBackTo && (
                <Button
                  type="default"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push(header.buttonBackTo!)}
                >
                  Quay lại
                </Button>
              )}
              {header.searchInput && (
                <Input
                  style={{ width: 256 }}
                  value={searchTerm}
                  placeholder={header.searchInput.placeholder}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  prefix={<SearchOutlined />}
                  allowClear
                />
              )}
              {header.filters && header.filters?.fields && (
                <Form.Provider>
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    content={
                      <FilterList
                        form={formFilter}
                        onCancel={() => setIsOpenFilterModal(false)}
                        fields={header.filters.fields}
                        onApplyFilter={(arr) =>
                          header.filters?.onApplyFilter(arr)
                        }
                        onReset={() =>
                          header.filters?.onReset && header.filters.onReset()
                        }
                      />
                    }
                    open={isOpenFilterModal}
                    onOpenChange={setIsOpenFilterModal}
                  >
                    <Tooltip title="Bộ lọc">
                      <span>
                        <Button
                          type={hasActiveFilters ? "primary" : "default"}
                          icon={<FilterOutlined />}
                        />
                      </span>
                    </Tooltip>
                  </Popover>
                </Form.Provider>
              )}

              {header.columnSettings && (
                <Popover
                  trigger="click"
                  placement="bottomLeft"
                  content={
                    <div>
                      <div className=" flex  justify-between  items-center">
                        <h3 className=" font-medium  mb-0">Cài đặt cột</h3>
                        {header.columnSettings.onReset && (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              if (header.columnSettings?.onReset) {
                                header.columnSettings.onReset();
                              }
                            }}
                          >
                            Đặt lại
                          </Button>
                        )}
                      </div>
                      <Divider className=" my-2" />

                      <div className="grid grid-rows-5 grid-cols-3 gap-4">
                        {header.columnSettings.columns.map((column) => (
                          <Checkbox
                            key={column.key}
                            checked={column.visible}
                            onChange={(e) => {
                              const newColumns =
                                header.columnSettings!.columns.map((col) =>
                                  col.key === column.key
                                    ? { ...col, visible: e.target.checked }
                                    : col
                                );
                              header.columnSettings!.onChange(newColumns);
                            }}
                          >
                            {column.title}
                          </Checkbox>
                        ))}
                      </div>
                    </div>
                  }
                  open={isOpenColumnSettings}
                  onOpenChange={setIsOpenColumnSettings}
                >
                  <Tooltip title="Cài đặt cột">
                    <span>
                      <Button
                        type={hasActiveColumnSettings ? "primary" : "default"}
                        icon={<SettingOutlined />}
                      />
                    </span>
                  </Tooltip>
                </Popover>
              )}
              {hasFilters && header.filters?.onReset && (
                <Tooltip title="Đặt lại bộ lọc">
                  <span>
                    <Button
                      onClick={handleResetFilters}
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </span>
                </Tooltip>
              )}
            </div>
            <div className="flex gap-3 items-center">
              {header.customToolbar}
              {header.refetchDataWithKeys && (
                <Tooltip title="Tải lại dữ liệu">
                  <span>
                    <Button
                      type="default"
                      icon={<SyncOutlined spin={isLoading} />}
                      onClick={() => {
                        if (header.refetchDataWithKeys) {
                          queriesToInvalidate(header.refetchDataWithKeys);
                        }
                      }}
                    />
                  </span>
                </Tooltip>
              )}
              {header.buttonEnds &&
                header.buttonEnds
                  .sort((a, b) => {
                    if (a.type === "primary" && b.type !== "primary") return 1;
                    if (a.type !== "primary" && b.type === "primary") return -1;
                    return 0;
                  })
                  .map((buttonEnd, index) => (
                    <Tooltip key={index} title={buttonEnd.name}>
                      <span>
                        <Button
                          loading={buttonEnd.isLoading}
                          danger={buttonEnd.danger}
                          type={buttonEnd.type}
                          onClick={buttonEnd.onClick}
                          icon={buttonEnd.icon}
                        >
                          {buttonEnd.name}
                        </Button>
                      </span>
                    </Tooltip>
                  ))}
            </div>
          </>
        ) : (
          <>
            <div>
              {header.buttonBackTo && (
                <Button
                  type="default"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push(header.buttonBackTo!)}
                />
              )}
            </div>
            <div className="flex gap-2 items-center">
              {header.refetchDataWithKeys && (
                <Tooltip title="Tải lại dữ liệu">
                  <span>
                    <Button
                      type="default"
                      icon={<SyncOutlined spin={isLoading} />}
                      onClick={() => {
                        if (header.refetchDataWithKeys) {
                          queriesToInvalidate(header.refetchDataWithKeys);
                        }
                      }}
                    />
                  </span>
                </Tooltip>
              )}

              {hasFilters && header.filters?.onReset && (
                <Tooltip title="Đặt lại bộ lọc">
                  <span>
                    <Button
                      onClick={handleResetFilters}
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </span>
                </Tooltip>
              )}

              {header.buttonEnds &&
                header.buttonEnds
                  .sort((a, b) => {
                    if (a.type === "primary" && b.type !== "primary") return 1;
                    if (a.type !== "primary" && b.type === "primary") return -1;
                    return 0;
                  })
                  .map((buttonEnd, index) => (
                    <Tooltip key={index} title={buttonEnd.name}>
                      <span>
                        <Button
                          loading={buttonEnd.isLoading}
                          danger={buttonEnd.danger}
                          type={buttonEnd.type}
                          onClick={buttonEnd.onClick}
                          icon={buttonEnd.icon}
                        />
                      </span>
                    </Tooltip>
                  ))}

              <Button
                type={
                  hasActiveFilters || hasActiveColumnSettings
                    ? "primary"
                    : "default"
                }
                icon={<FilterOutlined />}
                onClick={() => setIsMobileOptionsOpen(true)}
              />
            </div>
          </>
        )}
      </div>

      {/* Mobile modal for filters / settings */}
      <Modal
        title="Tùy chọn"
        open={isMobileOptionsOpen}
        onCancel={() => setIsMobileOptionsOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div className="space-y-4">
          {header.searchInput && (
            <Input
              value={searchTerm}
              placeholder={header.searchInput.placeholder}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          )}

          {header.filters && header.filters.fields && (
            <FilterList
              form={formFilter}
              onCancel={() => setIsMobileOptionsOpen(false)}
              fields={header.filters?.fields || []}
              onApplyFilter={(arr) => header.filters?.onApplyFilter(arr)}
              onReset={() =>
                header.filters?.onReset && header.filters.onReset()
              }
            />
          )}
          <Divider className=" my-2" />

          {header.columnSettings && (
            <div>
              <div className=" flex  justify-between  items-center">
                <h3 className=" font-medium  mb-0">Cài đặt cột</h3>
                {header.columnSettings.onReset && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      header.columnSettings?.onReset &&
                      header.columnSettings.onReset()
                    }
                  >
                    Đặt lại
                  </Button>
                )}
              </div>
              <Divider className=" my-2" />
              <div className="grid grid-rows-5 grid-cols-2 justify-between gap-4">
                {header.columnSettings.columns.map((column) => (
                  <Checkbox
                    key={column.key}
                    checked={column.visible}
                    onChange={(e) => {
                      const newColumns = header.columnSettings!.columns.map(
                        (col) =>
                          col.key === column.key
                            ? { ...col, visible: e.target.checked }
                            : col
                      );
                      header.columnSettings!.onChange(newColumns);
                    }}
                  >
                    {column.title}
                  </Checkbox>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
      {isNotAccessible && !isLoading && <AccessDenied />}
      {isEmpty && !isNotAccessible && !isLoading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <Empty description="Không có dữ liệu" />
        </div>
      )}
      {isLoading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <LoaderApp />
        </div>
      )}
      {!isLoading && !isNotAccessible && children}
    </div>
  );
}

export default WrapperContent;
