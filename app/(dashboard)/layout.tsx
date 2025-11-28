"use client";

import FastPageTransition from "@/components/FastPageTransition";
import ItemColorTheme from "@/components/ItemColorTheme";
import LoaderApp from "@/components/LoaderApp";
import { allMenuItems, breadcrumbMap } from "@/configs/menu";
import { themeColors } from "@/configs/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/providers/AppThemeProvider";
import { queryClient } from "@/providers/ReactQueryProvider";
import { useSiteTitleStore } from "@/stores/setSiteTitle";
import {
  DashboardOutlined,
  DoubleRightOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { MenuProps } from "antd";
import {
  Avatar,
  Breadcrumb,
  Button,
  Drawer,
  Dropdown,
  Layout,
  Menu,
  Typography,
  theme,
} from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface User {
  id: number;
  username: string;
  fullName: string;
  roleCode: string;
}

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: "NVL" | "THANH_PHAM";
  branchId: number;
  branchName: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pageTitle = useSiteTitleStore((state) => state.title);
  const router = useRouter();
  const pathname = usePathname();
  const { can, loading: permLoading } = usePermissions();
  const { mode, themeName, setMode, setThemeName } = useTheme();
  const { token } = theme.useToken();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.resetQueries();
    router.push("/login");
  };

  // Use TanStack Query to fetch current user (me)
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const body = await res.json();
      return body;
    },
  });
  const loading = meLoading || permLoading;

  // If not authenticated, redirect to login
  useEffect(() => {
    if (meData && !meData.success) {
      router.push("/login");
    }
  }, [meData, router]);

  const user: User | null = meData?.data?.user || null;

  const getBreadcrumbTitle = (path: string) => {
    // Kiểm tra exact match
    if (breadcrumbMap[path]) return breadcrumbMap[path];

    // Kiểm tra dynamic routes (có /[id]/)
    for (const [key, value] of Object.entries(breadcrumbMap)) {
      if (path.startsWith(key + "/")) {
        return value;
      }
    }

    return path.split("/").pop() || "Trang";
  };

  const menuItems = allMenuItems
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter(
          (child) => !child.permission || can(child.permission, "view")
        );

        if (filteredChildren.length === 0) return null;

        return { ...item, children: filteredChildren };
      }

      if (item.permission && !can(item.permission, "view")) return null;

      return item;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const antdMenuItems: MenuProps["items"] = menuItems.map((item, idx) => {
    // Use href path as the stable key for both root items and children
    const ellipsisStyle: React.CSSProperties = {
      display: "inline-block",
      maxWidth: 140,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      verticalAlign: "middle",
    };

    if (item.href) {
      return {
        key: item.href,
        icon: item.icon,
        label: (
          <Link href={item.href}>
            <span style={ellipsisStyle}>{item.title}</span>
          </Link>
        ),
      };
    }

    // Group item (has children)
    return {
      key: `group-${idx}`,
      icon: item.icon,
      label: <span style={ellipsisStyle}>{item.title}</span>,
      children: item.children?.map((child) => ({
        key: child.href,
        label: (
          <Link href={child.href}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={ellipsisStyle}>{child.title}</span>
            </div>
          </Link>
        ),
      })),
    };
  });

  // Helper: normalize a menu key (strip query string and trailing slash)
  const normalizeKey = (key?: React.Key) => {
    if (!key) return "";
    const withoutQuery = String(key).split("?")[0];
    // remove trailing slash except when the path is just '/'
    return withoutQuery === "/" ? "/" : withoutQuery.replace(/\/$/, "");
  };

  // normalized current pathname (no trailing slash)
  const normPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  // Find the most specific menu key matching the current pathname
  const getSelectedKey = () => {
    let bestKey: string | null = null;
    let bestLen = 0;

    for (const item of antdMenuItems || []) {
      // children entries (sub menu)
      if (item && "children" in item && item.children) {
        for (const child of item.children) {
          if (!child || !("key" in child)) continue;
          const key = normalizeKey(child.key);
          if (!key) continue;
          if (normPath === key || normPath.startsWith(key + "/")) {
            if (key.length > bestLen) {
              bestLen = key.length;
              bestKey = String(child.key);
            }
          }
        }
      }

      // top-level direct link entries
      if (
        item &&
        "key" in item &&
        typeof item.key === "string" &&
        !item.key.startsWith("group-")
      ) {
        const key = normalizeKey(item.key);
        if (!key) continue;
        if (normPath === key || normPath.startsWith(key + "/")) {
          if (key.length > bestLen) {
            bestLen = key.length;
            bestKey = item.key as string;
          }
        }
      }
    }

    return bestKey ? [bestKey] : [];
  };

  const getOpenKeys = () => {
    const openKeys: string[] = [];
    for (const item of antdMenuItems || []) {
      if (!item || !("children" in item) || !item.children) continue;
      const hasActiveChild = item.children.some((child) => {
        if (!child || !("key" in child)) return false;
        const key = normalizeKey(child.key);
        return key && (normPath === key || normPath.startsWith(key + "/"));
      });
      if (hasActiveChild && item.key) openKeys.push(String(item.key));
    }
    return openKeys;
  };

  // Controlled open keys for accordion behavior: keep only one submenu open at a time
  const [openKeys, setOpenKeys] = useState<string[]>(getOpenKeys());

  useEffect(() => {
    // update open keys when pathname changes (e.g. navigation)
    setOpenKeys(getOpenKeys());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Ensure menu open state matches current path on initial mount and when
  // menuItems change (for example when permissions load). This guarantees
  // that after a full page reload the parent submenu containing the current
  // route will be expanded.
  useEffect(() => {
    setOpenKeys(getOpenKeys());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, menuItems.length]);

  const handleOpenChange = (keys: string[]) => {
    // keep only the most recently opened key (accordion)
    if (!keys || keys.length === 0) {
      setOpenKeys([]);
      return;
    }
    setOpenKeys([keys[keys.length - 1]]);
  };

  const getBreadcrumbItems = () => {
    const items = [
      {
        title: (
          <Link href="/dashboard">
            <span className="flex gap-2 items-center">
              <DashboardOutlined /> <span>Dashboard</span>
            </span>
          </Link>
        ),
      },
    ];

    if (pathname !== "/dashboard") {
      items.push({
        title: <span>{getBreadcrumbTitle(pathname)}</span>,
      });
    }

    return items;
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "mode",
      icon: mode === "dark" ? <MoonOutlined /> : <SunOutlined />,
      label: mode === "dark" ? "Chế độ sáng" : "Chế độ tối",
      onClick: () => setMode(mode === "dark" ? "light" : "dark"),
    },
    {
      type: "divider",
    },
    {
      key: "color",
      label: "Màu chủ đề",
      type: "group",
    },
    {
      key: "default",
      label: (
        <ItemColorTheme
          isChecked={themeName === "default"}
          themeColor={themeColors.default.primary}
          title="Cam"
        />
      ),
      onClick: () => setThemeName("default"),
    },
    {
      key: "blue",
      label: (
        <ItemColorTheme
          isChecked={themeName === "blue"}
          themeColor={themeColors.blue.primary}
          title="Xanh"
        />
      ),
      onClick: () => setThemeName("blue"),
    },
    {
      key: "yellow",
      label: (
        <ItemColorTheme
          isChecked={themeName === "yellow"}
          themeColor={themeColors.yellow.primary}
          title="Vàng"
        />
      ),
      onClick: () => setThemeName("yellow"),
    },
    {
      key: "pink",
      label: (
        <ItemColorTheme
          isChecked={themeName === "pink"}
          themeColor={themeColors.pink.primary}
          title="Hồng"
        />
      ),
      onClick: () => setThemeName("pink"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      onClick: handleLogout,
      danger: true,
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoaderApp />
      </div>
    );
  }
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={!isMobile && !sidebarOpen}
          width={240}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          {!isMobile && (
            <>
              <div
                style={{
                  height: 64,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!isMobile && sidebarOpen ? (
                  <Text
                    style={{
                      color: token.colorPrimary,
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    POS System
                  </Text>
                ) : (
                  <span
                    style={{ fontSize: 24 }}
                    className="text-primary font-bold"
                  >
                    P
                  </span>
                )}
              </div>

              <Menu
                mode="inline"
                selectedKeys={getSelectedKey()}
                openKeys={openKeys}
                onOpenChange={handleOpenChange}
                items={antdMenuItems}
                onClick={() => {
                  /* no-op on desktop */
                }}
              />
            </>
          )}
        </Sider>
      )}
      {isMobile && (
        <Drawer
          title={
            <Text
              style={{
                color: token.colorPrimary,
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              POS System
            </Text>
          }
          placement="left"
          onClose={() => setSidebarOpen(false)}
          open={isMobile && sidebarOpen}
          closable={true}
          size={240}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <div>
              <Menu
                mode="inline"
                selectedKeys={getSelectedKey()}
                openKeys={openKeys}
                onOpenChange={handleOpenChange}
                items={antdMenuItems}
                onClick={() => setSidebarOpen(false)}
              />
            </div>

            <div
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "user-info",
                      label: (
                        <div className="flex flex-col items-center p-2">
                          <Text strong>{user?.fullName}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {user?.roleCode}
                          </Text>
                        </div>
                      ),
                    },
                    ...userMenuItems,
                  ],
                }}
                placement="topLeft"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <Avatar
                    icon={<UserOutlined />}
                    style={{
                      marginRight: 8,
                      backgroundColor: token.colorPrimary,
                    }}
                  />
                  <div className="flex flex-col">
                    <Text strong>{user?.fullName}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {user?.roleCode}
                    </Text>
                  </div>
                </div>
              </Dropdown>
            </div>
          </div>
        </Drawer>
      )}
      <Layout
        style={{
          marginLeft: !isMobile && sidebarOpen ? 240 : isMobile ? 0 : 80,
          transition: "all 0.2s",
        }}
      >
        <Header
          style={{
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorder}`,
            borderLeft: `1px solid ${token.colorBorder}`,
            position: "sticky",
            top: 0,
            zIndex: 88,
          }}
        >
          <div className="flex gap-3 items-center">
            <Button
              type="text"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              icon={sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            />

            <Breadcrumb items={getBreadcrumbItems()} />
            {pageTitle && (
              <>
                <DoubleRightOutlined />
                <Text strong>{pageTitle}</Text>
              </>
            )}
          </div>

          {!isMobile && (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <Avatar
                  icon={<UserOutlined />}
                  style={{
                    marginRight: 8,
                    backgroundColor: token.colorPrimary,
                  }}
                />
                <div className="flex flex-col">
                  <Text strong>{user?.fullName}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {user?.roleCode}
                  </Text>
                </div>
              </div>
            </Dropdown>
          )}
        </Header>

        <Content
          style={{
            margin: "10px",
            padding: 20,
            background: token.colorBgContainer,
            minHeight: 280,
            borderRadius: token.borderRadius,
          }}
        >
          <FastPageTransition>{children}</FastPageTransition>
        </Content>
      </Layout>
    </Layout>
  );
}
