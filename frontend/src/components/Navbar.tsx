import React from 'react';
import type { Company, UserRole } from '../types';
import { RefreshCw, ChevronDown, Building2 } from 'lucide-react';

interface NavbarProps {
  companies: Company[];
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onResetData: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
  currentRole,
  onSelectRole,
  onResetData,
  isResetting
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand identity & Organization Selector */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs tracking-wider">
              CX
            </div>
            <span className="font-semibold text-slate-900 text-base tracking-tight">CX Pulse</span>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

          {/* Workspace selector */}
          <div className="relative flex items-center">
            <div className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 rounded-md border border-slate-200 transition-colors cursor-pointer">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedCompanyId}
                onChange={(e) => onSelectCompany(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-medium outline-none cursor-pointer pr-4 appearance-none"
              >
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id} className="text-slate-800 bg-white">
                    {comp.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none -ml-3" />
            </div>
          </div>
        </div>

        {/* Role Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => onSelectRole('cx_manager')}
            className={`px-3.5 py-1.5 font-medium rounded-md transition-all ${
              currentRole === 'cx_manager'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CX Manager
          </button>
          <button
            onClick={() => onSelectRole('business_analyst')}
            className={`px-3.5 py-1.5 font-medium rounded-md transition-all ${
              currentRole === 'business_analyst'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Business Analyst
          </button>
          <button
            onClick={() => onSelectRole('customer')}
            className={`px-3.5 py-1.5 font-medium rounded-md transition-all ${
              currentRole === 'customer'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Support
          </button>
        </div>

        {/* Right Action Utilities */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onResetData}
            disabled={isResetting}
            title="Reset to baseline scenario"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Baseline</span>
          </button>

          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
            JD
          </div>
        </div>
      </div>
    </header>
  );
};
