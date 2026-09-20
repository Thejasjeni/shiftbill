// Navigation structure for SwiftBill

export const NAVIGATION_ITEMS = [
  { id: "home", label: "Home", icon: "LayoutDashboard" },
  { id: "parties", label: "Parties", icon: "Users" },
  { id: "items", label: "Items", icon: "Package" },
  { id: "sale", label: "Sale", icon: "TrendingUp" },
  { id: "purchase", label: "Purchase & Expense", icon: "ShoppingBag" },
  { id: "reports", label: "Reports", icon: "FileBarChart" },
  { id: "settings", label: "Settings", icon: "Settings" },
];

export const QUICK_REPORTS = [
  {
    id: "sale-report",
    title: "Sale Report",
    subtitle: "Total sales, tax, discounts & receivables",
    icon: "BadgePercent",
    color: "bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-[var(--color-brand)]/15",
  },
  {
    id: "all-transactions",
    title: "All Transactions",
    subtitle: "Invoices, cash in/out, bills & receipts",
    icon: "ReceiptText",
    color: "bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-[var(--color-brand)]/15",
  },
  {
    id: "daybook-report",
    title: "Daybook Report",
    subtitle: "Daily cash & credit balance movements",
    icon: "BookOpenCheck",
    color: "bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-[var(--color-brand)]/15",
  },
  {
    id: "party-statement",
    title: "Party Statement",
    subtitle: "Ledger statements, balances & payment due",
    icon: "Users2",
    color: "bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-[var(--color-brand)]/15",
  },
];
