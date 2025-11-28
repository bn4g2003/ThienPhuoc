import {
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  InboxOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from "@ant-design/icons";

export const allMenuItems: Array<{
  title: string;
  icon: React.ReactNode;
  href?: string;
  permission?: string | null;
  prefix?: string;
  children?: Array<{
    title: string;
    href: string;
    permission?: string;
    warehouseType?: "NVL" | "THANH_PHAM";
    warehouseCode?: string;
    noPrefix?: boolean;
  }>;
}> = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <DashboardOutlined />,
    permission: null,
  },
  {
    title: "Sản phẩm",
    icon: <AppstoreOutlined />,
    prefix: "Quản lý",
    children: [
      {
        title: "Danh mục hàng hoá",
        href: "/products/item-categories",
        permission: "products",
      },
      {
        title: "Hàng hoá",
        href: "/products/items",
        permission: "products",
      },
    ],
  },
  {
    title: "Khách hàng",
    icon: <TeamOutlined />,
    prefix: "Quản lý",
    children: [
      {
        title: "Nhóm khách hàng",
        href: "/sales/customer-groups",
        permission: "sales.customers",
      },
      {
        title: "Khách hàng",
        href: "/sales/customers",
        permission: "sales.customers",
      },
      {
        title: "Công nợ",
        href: "/sales/debts",
        permission: "finance.debts",
      },
    ],
  },
  {
    title: "Bán hàng",
    icon: <ShoppingCartOutlined />,
    prefix: "Quản lý",
    children: [
      {
        title: "Đơn hàng",
        href: "/sales/orders",
        permission: "sales.orders",
      },
    ],
  },
  {
    title: "Mua hàng",
    icon: <ShoppingOutlined />,
    prefix: "Quản lý",
    children: [
      {
        title: "Nhà cung cấp",
        href: "/purchasing/suppliers",
        permission: "purchasing.suppliers",
      },
      {
        title: "Đơn đặt hàng",
        href: "/purchasing/orders",
        permission: "purchasing.orders",
      },
      {
        title: "Công nợ",
        href: "/purchasing/debts",
        permission: "finance.debts",
      },
    ],
  },
  {
    title: "Kho",
    prefix: "Quản lý",
    icon: <InboxOutlined />,
    permission: "inventory.balance",
    children: [
      {
        title: "Tồn kho",
        href: "/inventory/balance",
        permission: "inventory.balance",
      },
      {
        title: "Nhập kho",
        href: "/inventory/import",
        permission: "inventory.import",
      },
      {
        title: "Xuất kho",
        href: "/inventory/export",
        permission: "inventory.export",
      },
      {
        title: "Luân chuyển kho",
        href: "/inventory/transfer",
        permission: "inventory.transfer",
      },
    ],
  },
  {
    title: "Tài chính",
    prefix: "Quản lý",
    icon: <DollarOutlined />,
    children: [
      {
        title: "Danh mục",
        href: "/finance/categories",
        permission: "finance.categories",
      },
      {
        title: "Tài khoản",
        href: "/finance/bank-accounts",
        permission: "finance.cashbooks",
      },
      {
        title: "Sổ quỹ",
        href: "/finance/cashbooks",
        permission: "finance.cashbooks",
      },
    ],
  },
  {
    title: "Báo cáo",
    icon: <BarChartOutlined />,
    prefix: "Báo cáo",
    children: [
      {
        title: "Bán hàng",
        href: "/sales/reports",
        permission: "sales.orders",
      },
      {
        title: "Tài chính",
        href: "/finance/reports",
        permission: "finance.reports",
      },
      {
        title: "Công nợ",
        href: "/reports/debts",
        permission: "finance.debts",
      },
    ],
  },
  {
    title: "Hệ thống",
    icon: <SettingOutlined />,
    prefix: "Quản lý",
    children: [
      {
        title: "Người dùng",
        href: "/admin/users",
        permission: "admin.users",
      },
      { title: "Vai trò", href: "/admin/roles", permission: "admin.roles" },
      {
        title: "Chi nhánh",
        href: "/admin/branches",
        permission: "admin.branches",
      },
      {
        title: "Kho hàng",
        href: "/admin/warehouses",
        permission: "admin.warehouses",
      },
    ],
  },
];

function normalizePath(p?: string) {
  if (!p) return "";
  let path = p.trim();
  if (!path.startsWith("/")) path = "/" + path;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

function generateBreadcrumbMap(
  items: typeof allMenuItems
): Record<string, string> {
  const map: Record<string, string> = {};

  items.forEach((item) => {
    if (item.href) {
      map[normalizePath(item.href)] = item.title;
    }

    if (item.children && item.children.length) {
      // derive a base path for the parent menu (e.g. '/inventory') from the first child's href
      const firstChildHref = item.children.find((c) => !!c.href)?.href;
      if (firstChildHref) {
        const segments = normalizePath(firstChildHref).split("/");
        const base = segments[1] ? `/${segments[1]}` : "";
        if (base) map[base] = item.title;
      }

      item.children.forEach((child) => {
        if (child.href) {
          map[normalizePath(child.href)] =
            (child.noPrefix ? "" : item.prefix + " ") + child.title;
        }
      });
    }
  });

  return map;
}

export const breadcrumbMap: Record<string, string> =
  generateBreadcrumbMap(allMenuItems);
