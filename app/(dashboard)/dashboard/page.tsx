"use client";

import CompanyConfigModal from "@/components/CompanyConfigModal";
import { allMenuItems } from "@/configs/menu";
import { usePermissions } from "@/hooks/usePermissions";
import { SettingOutlined } from "@ant-design/icons";
import { Button, Card, Col, Row, Tooltip, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";

const { Title } = Typography;

export default function DashboardPage() {
  const { can, isAdmin } = usePermissions();
  const [companyModalOpen, setCompanyModalOpen] = useState(false);

  const visibleMenuItems = allMenuItems.filter((item) => {
    if (item.permission === null || item.permission === undefined) {
      return true;
    }
    return isAdmin || can(item.permission, "view");
  });

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

      <Row gutter={[16, 16]}>
        {visibleMenuItems.map((item) => {
        if (item.children && item.children.length > 0) {
          const firstAccessibleChild = item.children.find((child) => {
            if (!child.permission) return true;
            return isAdmin || can(child.permission, "view");
          });

          if (!firstAccessibleChild) return null;

          return (
            <Col xs={24} sm={12} md={8} lg={6} key={item.title}>
              <Link
                href={firstAccessibleChild.href}
                style={{ textDecoration: "none" }}
              >
                <Card
                  hoverable
                  style={{ height: "100%" }}
                  styles={{
                    body: {
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "32px 24px",
                      minHeight: "160px",
                    },
                  }}
                >
                  <div
                    style={{
                      fontSize: "48px",
                      marginBottom: "16px",
                      color: "var(--ant-color-primary)",
                    }}
                  >
                    {item.icon}
                  </div>
                  <Title level={4} style={{ margin: 0, textAlign: "center" }}>
                    {item.title}
                  </Title>
                  {item.children.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        opacity: 0.7,
                        textAlign: "center",
                      }}
                    >
                      {item.children.length} mục con
                    </div>
                  )}
                </Card>
              </Link>
            </Col>
          );
        }

        // For items without children but with href
        if (item.href) {
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={item.title}>
              <Link href={item.href} style={{ textDecoration: "none" }}>
                <Card
                  hoverable
                  style={{ height: "100%" }}
                  styles={{
                    body: {
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "32px 24px",
                      minHeight: "160px",
                    },
                  }}
                >
                  <div
                    style={{
                      fontSize: "48px",
                      marginBottom: "16px",
                      color: "var(--ant-color-primary)",
                    }}
                  >
                    {item.icon}
                  </div>
                  <Title level={4} style={{ margin: 0, textAlign: "center" }}>
                    {item.title}
                  </Title>
                </Card>
              </Link>
            </Col>
          );
        }

        return null;
      })}
      </Row>

      {/* Modal cài đặt công ty */}
      <CompanyConfigModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
      />
    </>
  );
}
