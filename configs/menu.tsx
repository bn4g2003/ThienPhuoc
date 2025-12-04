import {
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ExportOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOutlined,
  HomeOutlined,
  ImportOutlined,
  InboxOutlined,
  LineChartOutlined,
  PieChartOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TagsOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";

export const allMenuItems: Array<{
  title: string;
  icon: React.ReactNode;
  href?: string;
  permission?: string | null;
  children?: Array<{
    icon: React.ReactNode;
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
    permission: "dashboard.view",
  },
  {
    title: "Sản phẩm",
    icon: <AppstoreOutlined />,
    children: [
      {
        icon: <TagsOutlined />,
        title: "Danh mục hàng hoá",
        href: "/products/item-categories",
        permission: "products.item-categories",
      },
      {
        icon: <ShopOutlined />,
        title: "Hàng hoá",
        href: "/products/items",
        permission: "products.items",
      },
    ],
  },
  {
    title: "Khách hàng",
    icon: <TeamOutlined />,
    children: [
      {
        icon: <UsergroupAddOutlined />,
        title: "Nhóm khách hàng",
        href: "/sales/customer-groups",
        permission: "sales.customer-groups",
      },
      {
        icon: <UserOutlined />,
        title: "Khách hàng",
        href: "/sales/customers",
        permission: "sales.customers",
      },
      {
        icon: <CreditCardOutlined />,
        title: "Công nợ",
        href: "/sales/debts",
        permission: "sales.debts",
      },
    ],
  },
  {
    title: "Bán hàng",
    icon: <ShoppingCartOutlined />,
    children: [
      {
        icon: <FileTextOutlined />,
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
        icon: <HomeOutlined />,
        title: "Nhà cung cấp",
        href: "/purchasing/suppliers",
        permission: "purchasing.suppliers",
      },
      {
        icon: <FileSearchOutlined />,
        title: "Đơn đặt hàng",
        href: "/purchasing/orders",
        permission: "purchasing.orders",
      },
      {
        icon: <CreditCardOutlined />,
        title: "Công nợ",
        href: "/purchasing/debts",
        permission: "purchasing.debts",
      },
    ],
  },
  {
    title: "Kho",
    icon: <InboxOutlined />,
    permission: "inventory.balance",
    children: [
      {
        icon: <DatabaseOutlined />,
        title: "Tồn kho",
        href: "/inventory/balance",
        permission: "inventory.balance",
      },
      {
        icon: <ImportOutlined />,
        title: "Nhập kho",
        href: "/inventory/import",
        permission: "inventory.import",
      },
      {
        icon: <ExportOutlined />,
        title: "Xuất kho",
        href: "/inventory/export",
        permission: "inventory.export",
      },
      {
        icon: <SwapOutlined />,
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
        icon: <FolderOutlined />,
        title: "Danh mục tài chính",
        href: "/finance/categories",
        permission: "finance.categories",
      },
      {
        icon: <BankOutlined />,
        title: "Tài khoản ngân hàng",
        href: "/finance/bank-accounts",
        permission: "finance.bank-accounts",
      },
      {
        icon: <WalletOutlined />,
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
        icon: <LineChartOutlined />,
        title: "Báo cáo bán hàng",
        href: "/sales/reports",
        permission: "sales.reports",
      },
      {
        icon: <PieChartOutlined />,
        title: "Báo cáo tài chính",
        href: "/finance/reports",
        permission: "finance.reports",
      },
      {
        icon: <FileSearchOutlined />,
        title: "Báo cáo công nợ",
        href: "/reports/debts",
        permission: "reports.debts",
      },
    ],
  },
  {
    title: "Hệ thống",
    icon: <SettingOutlined />,
    children: [
      {
        icon: <UserOutlined />,
        title: "Người dùng",
        href: "/admin/users",
        permission: "admin.users",
      },
      {
        icon: <SafetyCertificateOutlined />,
        title: "Vai trò",
        href: "/admin/roles",
        permission: "admin.roles",
      },
      {
        icon: <HomeOutlined />,
        title: "Chi nhánh",
        href: "/admin/branches",
        permission: "admin.branches",
      },
      {
        icon: <InboxOutlined />,
        title: "Kho hàng",
        href: "/admin/warehouses",
        permission: "admin.warehouses",
      },
    ],
  },
];
