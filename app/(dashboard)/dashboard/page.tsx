"use client";

import CompanyConfigModal from "@/components/CompanyConfigModal";
import { allMenuItems } from "@/configs/menu";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AccountBookOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  ExportOutlined,
  FileTextOutlined,
  HomeOutlined,
  ImportOutlined,
  InboxOutlined,
  LineChartOutlined,
  SafetyOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TagsOutlined,
  UserOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Row, Tooltip, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";

const { Title } = Typography;

export default function DashboardPage() {
  const { can, isAdmin } = usePermissions();
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const visibleMenuItems = allMenuItems.filter((item) => {
    // Loại bỏ Dashboard vì đây là trang Dashboard
    if (item.href === "/dashboard") return false;
    
    if (item.permission === null || item.permission === undefined) {
      return true;
    }
    return isAdmin || can(item.permission, "view");
  });

  // Lọc các mục có children
  const categoriesWithChildren = visibleMenuItems.filter(
    (item) => item.children && item.children.length > 0
  );

  // Lọc các mục không có children
  const itemsWithoutChildren = visibleMenuItems.filter(
    (item) => !item.children || item.children.length === 0
  );

  // Lấy category được chọn
  const selectedCategoryData = categoriesWithChildren.find(
    (item) => item.title === selectedCategory
  );

  // Lọc children có quyền truy cập
  const visibleChildren = selectedCategoryData?.children?.filter((child) => {
    if (!child.permission) return true;
    return isAdmin || can(child.permission, "view");
  }) || [];

  return (
    <>
      {/* Nút cài đặt công ty - chỉ hiển thị cho admin */}
      {isAdmin && (
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
          <Tooltip title="Cài đặt thông tin công ty">
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => setCompanyModalOpen(true)}
            >
              Thông tin công ty
            </Button>
          </Tooltip>
        </div>
      )}

      <Row gutter={16} style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* Cột bên trái - Danh mục lớn */}
        <Col xs={24} md={6} lg={5}>
          <Card
            title={<span style={{ fontSize: "14px", fontWeight: 600 }}>Danh mục chính</span>}
            style={{ 
              height: "100%", 
              borderRadius: "12px",
              border: "1px solid #e8e8e8",
            }}
            styles={{ 
              body: { padding: "6px" },
              header: { padding: "10px 12px", minHeight: "auto" }
            }}
          >
            {categoriesWithChildren.map((item) => {
              const accessibleChildrenCount = item.children?.filter((child) => {
                if (!child.permission) return true;
                return isAdmin || can(child.permission, "view");
              }).length || 0;

              if (accessibleChildrenCount === 0) return null;

              return (
                <Card
                  key={item.title}
                  hoverable
                  onClick={() => setSelectedCategory(item.title)}
                  style={{
                    marginBottom: 6,
                    cursor: "pointer",
                    border: selectedCategory === item.title ? "2px solid #1890ff" : "1px solid #d9d9d9",
                    backgroundColor: selectedCategory === item.title ? "#e6f7ff" : "white",
                    boxShadow: selectedCategory === item.title ? "0 2px 6px rgba(24, 144, 255, 0.3)" : "none",
                    borderRadius: "8px",
                  }}
                  styles={{
                    body: {
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    },
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      color: selectedCategory === item.title ? "#1890ff" : "#8c8c8c",
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "10px", color: "#8c8c8c" }}>
                      {accessibleChildrenCount} mục
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Các mục không có children */}
            {itemsWithoutChildren.length > 0 && (
              <>
                <div style={{ margin: "12px 0 6px", fontSize: "12px", fontWeight: 600, color: "#8c8c8c", paddingLeft: "4px" }}>
                  Khác
                </div>
                {itemsWithoutChildren.map((item) => {
                  if (!item.href) return null;
                  return (
                    <Link key={item.title} href={item.href} style={{ textDecoration: "none" }}>
                      <Card
                        hoverable
                        style={{ 
                          marginBottom: 6,
                          backgroundColor: "white",
                          border: "1px solid #d9d9d9",
                          borderRadius: "8px",
                        }}
                        styles={{
                          body: {
                            padding: "8px 10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          },
                        }}
                      >
                        <div style={{ fontSize: "22px", color: "#8c8c8c" }}>{item.icon}</div>
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>
                          {item.title}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </>
            )}
          </Card>
        </Col>

        {/* Cột bên phải - Mục con */}
        <Col xs={24} md={18} lg={19}>
          <Card
            title={<span style={{ fontSize: "16px", fontWeight: 600 }}>{selectedCategory || "Chọn danh mục bên trái"}</span>}
            style={{ 
              height: "100%", 
              borderRadius: "12px",
              border: "1px solid #e8e8e8",
            }}
            styles={{ 
              header: { padding: "12px 16px", minHeight: "auto" }
            }}
          >
            {!selectedCategory ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "200px",
                  opacity: 0.4,
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
                <div style={{ fontSize: "14px", color: "#8c8c8c" }}>
                  Chọn một danh mục bên trái để xem các mục con
                </div>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {visibleChildren.map((child, index) => {
                  // Tạo icon đa dạng cho từng mục con
                  const iconMap: Record<string, React.ReactNode> = {
                    "Danh mục hàng hoá": <TagsOutlined />,
                    "Hàng hoá": <AppstoreOutlined />,
                    "Nhóm khách hàng": <UsergroupAddOutlined />,
                    "Khách hàng": <UserOutlined />,
                    "Công nợ": <AccountBookOutlined />,
                    "Đơn hàng": <ShoppingCartOutlined />,
                    "Nhà cung cấp": <ShoppingOutlined />,
                    "Đơn đặt hàng": <FileTextOutlined />,
                    "Tồn kho": <InboxOutlined />,
                    "Nhập kho": <ImportOutlined />,
                    "Xuất kho": <ExportOutlined />,
                    "Luân chuyển kho": <SwapOutlined />,
                    "Danh mục tài chính": <TagsOutlined />,
                    "Tài khoản ngân hàng": <BankOutlined />,
                    "Sổ quỹ": <WalletOutlined />,
                    "Báo cáo bán hàng": <LineChartOutlined />,
                    "Báo cáo tài chính": <BarChartOutlined />,
                    "Báo cáo công nợ": <AccountBookOutlined />,
                    "Người dùng": <UserOutlined />,
                    "Vai trò": <SafetyOutlined />,
                    "Chi nhánh": <HomeOutlined />,
                    "Kho hàng": <InboxOutlined />,
                  };
                  
                  const childIcon = iconMap[child.title] || selectedCategoryData?.icon;
                  
                  return (
                    <Col xs={12} sm={8} lg={6} key={child.title}>
                      <Link href={child.href} style={{ textDecoration: "none" }}>
                        <Card
                          hoverable
                          style={{ 
                            height: "100%",
                            background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)",
                            transition: "all 0.3s ease",
                          }}
                          styles={{
                            body: {
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "20px 16px",
                              minHeight: "110px",
                            },
                          }}
                        >
                          <div
                            style={{
                              fontSize: "32px",
                              marginBottom: "8px",
                              color: "white",
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                            }}
                          >
                            {childIcon}
                          </div>
                          <div style={{ 
                            fontSize: "13px", 
                            fontWeight: 600, 
                            color: "white",
                            textAlign: "center",
                            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          }}>
                            {child.title}
                          </div>
                        </Card>
                      </Link>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {/* Modal cài đặt công ty */}
      <CompanyConfigModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
      />
    </>
  );
}
