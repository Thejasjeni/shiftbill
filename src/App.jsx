import React, { Component } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import TopAppBar from './components/layout/TopAppBar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import FinancialSummaryCards from './components/dashboard/FinancialSummaryCards';
import SalesChartSection from './components/dashboard/SalesChartSection';
import QuickReportsGrid from './components/dashboard/QuickReportsGrid';
import RecentTransactionsList from './components/dashboard/RecentTransactionsList';
import NewSaleModal from './components/modals/NewSaleModal';
import NewPurchaseModal from './components/modals/NewPurchaseModal';
import NewExpenseModal from './components/modals/NewExpenseModal';
import ReportViewerModal from './components/modals/ReportViewerModal';
import CommandPalette from './components/CommandPalette';
import CheckoutBottomSheet from './components/pos/CheckoutBottomSheet';
import PartiesView from './components/views/PartiesView';
import ItemsView from './components/views/ItemsView';
import SettingsView from './components/views/SettingsView';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SwiftBill UI Error caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-brand-deep)] p-6 text-left text-white">
          <div className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] bg-surface p-6 text-ink shadow-e3 ring-1 ring-hairline/70">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="SwiftBill" className="h-10 w-10 rounded-[var(--radius-control)]" />
              <div>
                <h1 className="text-title font-bold text-ink">Something went wrong</h1>
                <p className="text-micro text-ink-muted">Your books are safe — reload to carry on billing.</p>
              </div>
            </div>
            <div className="break-words rounded-[var(--radius-control)] bg-[var(--color-danger)]/10 p-3 text-micro text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/25">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full rounded-[var(--radius-control)] bg-[var(--color-brand)] py-2.5 text-body font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
            >
              Clear local data &amp; reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function DashboardContent() {
  const { activeNavTab, isCheckoutOpen, setIsCheckoutOpen } = useDashboard();

  const renderActiveView = () => {
    switch (activeNavTab) {
      case 'parties':
        return <PartiesView />;
      case 'items':
        return <ItemsView />;
      case 'settings':
        return <SettingsView />;
      case 'reports':
        return (
          <div className="space-y-4">
            <QuickReportsGrid />
            <RecentTransactionsList />
          </div>
        );
      case 'home':
      case 'sale':
      case 'purchase':
      default:
        return (
          <div className="space-y-4 sm:space-y-5">
            {/* 1. Financial Summary Cards (Receivables & Payables) */}
            <FinancialSummaryCards />

            {/* 2. Sales Chart Section (Total Sale: ₹0, Line Chart 1 Sep to 28 Sep) */}
            <SalesChartSection />

            {/* 3. Quick Links / Most Used Reports Grid */}
            <QuickReportsGrid />

            {/* 4. Recent Transactions List */}
            <RecentTransactionsList />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas">
      {/* Desktop Navigation Sidebar / Collapsible Mobile Drawer */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Top App Bar */}
        <TopAppBar />

        {/* Scrollable Dashboard Body */}
        <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-3.5 pb-28 sm:p-6 lg:pb-12">
          {renderActiveView()}
        </main>

        {/* Persistent 4-Action Bottom Navigation Bar for Mobile */}
        <BottomNav />

        {/* Modals & Overlays */}
        <NewSaleModal />
        <NewPurchaseModal />
        <NewExpenseModal />
        <ReportViewerModal />
        <CommandPalette />
        <CheckoutBottomSheet
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </ErrorBoundary>
  );
}
