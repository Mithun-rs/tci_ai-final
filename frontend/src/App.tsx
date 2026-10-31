import React, { useState, useEffect } from 'react';
import type { Company, UserRole } from './types';
import { api } from './services/api';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/Navbar';
import { CXManagerDashboard } from './components/cx-manager/CXManagerDashboard';
import { BusinessAnalystDashboard } from './components/analyst/BusinessAnalystDashboard';
import { CustomerPortal } from './components/customer/CustomerPortal';

export const App: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('shopsphere');
  const [currentRole, setCurrentRole] = useState<UserRole>('cx_manager');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const fetchCompanies = async () => {
    try {
      const data = await api.getCompanies();
      setCompanies(data);
      if (data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await api.resetDataset();
      await fetchCompanies();
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset dataset:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col font-sans">
        <Navbar
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onSelectCompany={setSelectedCompanyId}
          currentRole={currentRole}
          onSelectRole={setCurrentRole}
          onResetData={handleResetData}
          isResetting={isResetting}
          activeAlertCount={1}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          {/* Workspace Context Bar */}
          {selectedCompany && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 text-xs">
              <div className="flex items-center space-x-3 text-slate-600">
                <span className="font-bold text-slate-900 text-sm">{selectedCompany.name}</span>
                <span>&bull;</span>
                <span className="font-semibold text-slate-700">{selectedCompany.industry}</span>
                <span className="hidden md:inline">&bull;</span>
                <span className="text-slate-500 hidden md:inline">{selectedCompany.description}</span>
              </div>
              <div className="mt-2 sm:mt-0 flex items-center space-x-2 text-slate-500 font-medium">
                <span>Active Console:</span>
                <span className="text-slate-900 font-bold uppercase">{currentRole.replace('_', ' ')}</span>
              </div>
            </div>
          )}

          {/* View Selection */}
          {currentRole === 'cx_manager' && (
            <CXManagerDashboard companyId={selectedCompanyId} />
          )}

          {currentRole === 'business_analyst' && (
            <BusinessAnalystDashboard companyId={selectedCompanyId} />
          )}

          {currentRole === 'customer' && (
            <CustomerPortal companyId={selectedCompanyId} />
          )}
        </main>

        {/* Enterprise SaaS Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-slate-800">CX Pulse</span>
              <span>Customer Experience Predictive Understanding & Strategic Evaluation</span>
            </div>
            <div className="flex items-center space-x-4 text-slate-500 font-medium">
              <a href="#privacy" className="hover:text-slate-800 transition-colors">Privacy</a>
              <span>&bull;</span>
              <a href="#terms" className="hover:text-slate-800 transition-colors">Terms</a>
              <span>&bull;</span>
              <a href="#status" className="hover:text-slate-800 transition-colors">System Health: 99.98%</a>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
};

export default App;
