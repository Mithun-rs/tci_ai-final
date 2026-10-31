import React from 'react';
import type { Company, UserRole } from '../types';
import { RefreshCw, ChevronDown, Building2, Bell } from 'lucide-react';

interface NavbarProps {
  companies: Company[];
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onResetData: () => void;
  isResetting: boolean;
  activeAlertCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
  currentRole,
  onSelectRole,
  onResetData,
  isResetting,
  activeAlertCount = 1
}) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-slate-200/80 transition-all">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* Brand identity & Workspace selector */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-slate-950 flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-sm">
              CX
            </div>
            <div>
              <span className="font-semibold text-slate-900 text-sm tracking-tight block leading-none">CX Pulse</span>
              <span className="text-[10px] text-slate-400 font-medium">Enterprise Intelligence</span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200/80 hidden sm:block"></div>

          {/* Workspace selector */}
          <div className="relative flex items-center">
            <div className="flex items-center space-x-2 bg-slate-50/80 hover:bg-slate-100/90 px-3 py-1.5 rounded-lg border border-slate-200/80 transition-colors shadow-sm">
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
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 text-xs shadow-inner">
          <button
            onClick={() => onSelectRole('cx_manager')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 font-medium rounded-lg transition-all ${
              currentRole === 'cx_manager'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>CX Manager</span>
            {activeAlertCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] flex items-center justify-center font-bold">
                {activeAlertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectRole('business_analyst')}
            className={`px-3.5 py-1.5 font-medium rounded-lg transition-all ${
              currentRole === 'business_analyst'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Business Analyst
          </button>
          <button
            onClick={() => onSelectRole('customer')}
            className={`px-3.5 py-1.5 font-medium rounded-lg transition-all ${
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
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Baseline</span>
          </button>

          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
            JD
          </div>
        </div>
      </div>
    </header>
  );
};
