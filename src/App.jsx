import React, { Component } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import TopAppBar from './components/layout/TopAppBar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import FinancialSummaryCards from './components/dashboard/FinancialSummaryCards';
import SalesChartSection from './components/dashboard/SalesChartSection';
import QuickReportsGrid from './components/dashboard/QuickReportsGrid';
import RecentTransactionsList from './components/dashboard/RecentTransactionsList';
import FloatingActionButton from './components/dashboard/FloatingActionButton';
import NewSaleModal from './components/modals/NewSaleModal';
import NewPurchaseModal from './components/modals/NewPurchaseModal';
import ReportViewerModal from './components/modals/ReportViewerModal';
import PremiumUpgradeModal from './components/modals/PremiumUpgradeModal';
import SearchDrawer from './components/modals/SearchDrawer';
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
        <div className="min-h-screen bg-[#1E1B4B] text-white flex items-center justify-center p-6 text-left">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="SwiftBill" className="w-10 h-10 rounded-xl" />
              <div>
                <h1 className="font-bold text-lg text-white">SwiftBill Recovered</h1>
                <p className="text-xs text-slate-400">An unexpected error was intercepted safely</p>
              </div>
            </div>
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 font-mono break-words">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs rounded-xl transition-all cursor-pointer"
            >
              Reset Cache & Reload App
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
    <div className="flex h-screen w-full overflow-hidden bg-[#F8F9FA]">
      {/* Desktop Navigation Sidebar / Collapsible Mobile Drawer */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Top App Bar */}
        <TopAppBar />

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-28 lg:pb-12 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>

        {/* Floating Action Button (FAB) */}
        <FloatingActionButton />

        {/* Persistent 4-Action Bottom Navigation Bar for Mobile */}
        <BottomNav />

        {/* Modals & Overlays */}
        <NewSaleModal />
        <NewPurchaseModal />
        <ReportViewerModal />
        <PremiumUpgradeModal />
        <SearchDrawer />
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
