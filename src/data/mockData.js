// Baseline empty schema and navigation structure for SwiftBill

export const INITIAL_EMPTY_STATE = {
  totalReceivable: 0,
  totalPayable: 0,
  totalSale: 0,
  cashInHand: 0,
  bankBalance: 0,
  stockValue: 0,
  salesTimeline: [
    { date: "1 Sep", amount: 0, label: "01 Sep" },
    { date: "4 Sep", amount: 0, label: "04 Sep" },
    { date: "8 Sep", amount: 0, label: "08 Sep" },
    { date: "12 Sep", amount: 0, label: "12 Sep" },
    { date: "16 Sep", amount: 0, label: "16 Sep" },
    { date: "20 Sep", amount: 0, label: "20 Sep" },
    { date: "24 Sep", amount: 0, label: "24 Sep" },
    { date: "28 Sep", amount: 0, label: "28 Sep" },
  ],
  transactions: [],
  parties: [],
  items: []
};

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
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: "all-transactions",
    title: "All Transactions",
    subtitle: "Invoices, cash in/out, bills & receipts",
    icon: "ReceiptText",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    id: "daybook-report",
    title: "Daybook Report",
    subtitle: "Daily cash & credit balance movements",
    icon: "BookOpenCheck",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    id: "party-statement",
    title: "Party Statement",
    subtitle: "Ledger statements, balances & payment due",
    icon: "Users2",
    color: "bg-violet-50 text-violet-600 border-violet-100",
  },
];
