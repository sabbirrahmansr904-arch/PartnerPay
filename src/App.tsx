import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Balance } from './components/Balance';
import { AddEntry } from './components/AddEntry';
import { Partners } from './components/Partners';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { ProfitLossStatement } from './components/ProfitLossStatement';
import { Orders } from './components/Orders';
import { ProfitSharing } from './components/ProfitSharing';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === 'balance' && <Balance setActiveTab={setActiveTab} />}
      {activeTab === 'add' && <AddEntry />}
      {activeTab === 'orders' && <Orders />}
      {activeTab === 'pl' && <ProfitLossStatement />}
      {activeTab === 'profit_sharing' && <ProfitSharing />}
      {activeTab === 'partners' && <Partners setActiveTab={setActiveTab} />}
      {activeTab === 'reports' && <Reports />}
      {activeTab === 'settings' && <Settings />}
    </Layout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
