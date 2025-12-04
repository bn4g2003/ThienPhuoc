"use client";

import CompanyConfigModal from "@/components/CompanyConfigModal";
import { allMenuItems } from "@/configs/menu";
import { usePermissions } from "@/hooks/usePermissions";
import { SettingOutlined } from "@ant-design/icons";
import { Button, Card, Col, Flex, Row, Space, Tooltip, Typography } from "antd";
import Link from "next/link";
import { useRef, useState } from "react";

const { Title } = Typography;

export default function DashboardPage() {
  const { can, isAdmin } = usePermissions();
  const [companyModalOpen, setCompanyModalOpen] = useState(false);

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
  const div = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Nút cài đặt công ty - chỉ hiển thị cho admin */}
      {isAdmin && (
        <Flex justify="flex-end" style={{ marginBottom: 16 }}>
          <Tooltip title="Cài đặt thông tin công ty">
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => setCompanyModalOpen(true)}
            >
              Thông tin công ty
            </Button>
            <div id="demoLogs" ref={div} style={{ display: "none" }}></div>
          </Tooltip>
        </Flex>
      )}

      <Row gutter={16} style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* Hiển thị tất cả các danh mục và mục con */}
        <Col span={24}>
          <Space vertical size="large" style={{ width: "100%" }}>
            {/* Hiển thị các danh mục có children */}
            {categoriesWithChildren.map((category) => {
              const visibleChildren =
                category.children?.filter((child) => {
                  if (!child.permission) return true;
                  return isAdmin || can(child.permission, "view");
                }) || [];

              if (visibleChildren.length === 0) return null;

              return (
                <Card
                  key={category.title}
                  title={
                    <Flex align="center" gap={12}>
                      <div
                        style={{
                          fontSize: "24px",
                          color: "var(--ant-color-primary)",
                        }}
                      >
                        {category.icon}
                      </div>
                      <Title level={4} style={{ margin: 0 }}>
                        {category.title}
                      </Title>
                    </Flex>
                  }
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #e8e8e8",
                  }}
                >
                  <Row gutter={[16, 16]}>
                    {visibleChildren.map((child) => (
                      <Col xs={12} sm={8} md={6} lg={4} key={child.href}>
                        <Link
                          href={child.href}
                          style={{ textDecoration: "none" }}
                        >
                          <Card
                            hoverable
                            styles={{
                              body: {
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "20px 12px",
                                minHeight: "100px",
                              },
                            }}
                          >
                            <div
                              style={{
                                fontSize: "32px",
                                marginBottom: "8px",
                                color: "var(--ant-color-primary)",
                              }}
                            >
                              {child.icon}
                            </div>
                            <Typography.Text
                              strong
                              style={{
                                fontSize: "13px",
                                textAlign: "center",
                              }}
                            >
                              {child.title}
                            </Typography.Text>
                          </Card>
                        </Link>
                      </Col>
                    ))}
                  </Row>
                </Card>
              );
            })}

            {/* Hiển thị các mục không có children */}
            {itemsWithoutChildren.length > 0 && (
              <Card
                title={
                  <Title level={4} style={{ margin: 0 }}>
                    Khác
                  </Title>
                }
                style={{
                  borderRadius: "12px",
                  border: "1px solid #e8e8e8",
                }}
              >
                <Row gutter={[16, 16]}>
                  {itemsWithoutChildren.map((item) => {
                    if (!item.href) return null;
                    return (
                      <Col xs={12} sm={8} md={6} lg={4} key={item.href}>
                        <Link
                          href={item.href}
                          style={{ textDecoration: "none" }}
                        >
                          <Card
                            hoverable
                            style={{
                              height: "100%",
                              borderRadius: "8px",
                            }}
                            styles={{
                              body: {
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "20px 12px",
                                minHeight: "100px",
                              },
                            }}
                          >
                            <div
                              style={{
                                fontSize: "32px",
                                marginBottom: "8px",
                                color: "var(--ant-color-primary)",
                              }}
                            >
                              {item.icon}
                            </div>
                            <Typography.Text
                              strong
                              style={{
                                fontSize: "13px",
                                textAlign: "center",
                              }}
                            >
                              {item.title}
                            </Typography.Text>
                          </Card>
                        </Link>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            )}
          </Space>
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
