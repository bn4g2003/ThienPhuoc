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
  children?: Array<{
    title: string;
    href: string;
    permission?: string;
    warehouseType?: "NVL" | "THANH_PHAM";
    warehouseCode?: string;
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
    icon: <DollarOutlined />,
    children: [
      {
        title: "Danh mục tài chính",
        href: "/finance/categories",
        permission: "finance.categories",
      },
      {
        title: "Tài khoản ngân hàng",
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
    children: [
      {
        title: "Báo cáo bán hàng",
        href: "/sales/reports",
        permission: "sales.orders",
      },
      {
        title: "Báo cáo tài chính",
        href: "/finance/reports",
        permission: "finance.reports",
      },
      {
        title: "Báo cáo công nợ",
        href: "/reports/debts",
        permission: "finance.debts",
      },
    ],
  },
  {
    title: "Hệ thống",
    icon: <SettingOutlined />,
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
