import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { CXIncident, RootCauseHypothesis, RecoveryAction, DetectedSignal, VerificationResult } from '../../types';
import { useToast } from '../common/Toast';
import {
  AlertTriangle, CheckCircle2, Sliders, Shield,
  DollarSign, Users, Play, Check, X, ArrowUpRight,
  CheckCheck, ChevronDown, ChevronUp, Search, Activity,
  Zap, RefreshCw
} from 'lucide-react';

interface CXManagerDashboardProps {
  companyId: string;
}

export const CXManagerDashboard: React.FC<CXManagerDashboardProps> = ({ companyId }) => {
  const { showToast } = useToast();
  const [incidents, setIncidents] = useState<CXIncident[]>([]);
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<CXIncident | null>(null);
  const [hypotheses, setHypotheses] = useState<RootCauseHypothesis[]>([]);
  const [simulatedActions, setSimulatedActions] = useState<RecoveryAction[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'investigation' | 'simulator' | 'verification'>('investigation');
  const [showWeightSliders, setShowWeightSliders] = useState(false);
  
  // Weights state for What-If Simulator
  const [weights, setWeights] = useState({
    impact: 0.25,
    urgency: 0.20,
    benefit: 0.30,
    cost: 0.15,
    risk: 0.10
  });

  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [approvalModalAction, setApprovalModalAction] = useState<RecoveryAction | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const [isSimulatingBurst, setIsSimulatingBurst] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [incRes, sigRes] = await Promise.all([
        api.getIncidents(companyId),
        api.getSignals(companyId)
      ]);
      setIncidents(incRes);
      setSignals(sigRes);

      if (incRes.length > 0) {
        handleSelectIncident(incRes[0]);
      } else {
        setSelectedIncident(null);
        setHypotheses([]);
        setSimulatedActions([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshDataSilently = async () => {
    try {
      const [incRes, sigRes] = await Promise.all([
        api.getIncidents(companyId),
        api.getSignals(companyId)
      ]);
      setIncidents(incRes);
      setSignals(sigRes);

      if (selectedIncident) {
        const updated = incRes.find((i: CXIncident) => i.id === selectedIncident.id);
        if (updated) {
          setSelectedIncident(prev => prev ? { ...prev, ...updated } : updated);
        }
        const verRes = await api.getVerification(selectedIncident.id);
        if (verRes) setVerification(verRes);
      }
    } catch (err) {
      console.error('Silent refresh failed:', err);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshDataSilently();
    showToast('Real-time data refreshed');
    setIsRefreshing(false);
  };

  const handleSimulateBurst = async () => {
    setIsSimulatingBurst(true);
    try {
      await api.simulateBurst(companyId);
      showToast('Real-time retry burst and checkout dropout spike simulated!', 'info');
      await refreshDataSilently();
    } catch (err) {
      console.error(err);
      showToast('Burst simulation failed', 'error');
    } finally {
      setIsSimulatingBurst(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Real-time polling every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRealtimeActive && !executingActionId) {
        refreshDataSilently();
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [companyId, selectedIncident?.id, isRealtimeActive, executingActionId]);

  const handleSelectIncident = async (incident: CXIncident) => {
    setSelectedIncident(incident);
    try {
      const [hypRes, actRes, verRes] = await Promise.all([
        api.getHypotheses(incident.id),
        api.simulateDecisions(incident.id, weights),
        api.getVerification(incident.id)
      ]);
      setHypotheses(hypRes);
      setSimulatedActions(actRes.simulated_actions || actRes);
      setVerification(verRes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWeightChange = async (key: keyof typeof weights, value: number) => {
    const updated = { ...weights, [key]: value };
    setWeights(updated);
    if (selectedIncident) {
      const actRes = await api.simulateDecisions(selectedIncident.id, updated);
      setSimulatedActions(actRes.simulated_actions || actRes);
    }
  };

  const applyPreset = async (preset: 'customer_first' | 'cost_optimized' | 'emergency') => {
    let newWeights = { ...weights };
    if (preset === 'customer_first') {
      newWeights = { impact: 0.40, urgency: 0.20, benefit: 0.30, cost: 0.05, risk: 0.05 };
      showToast('Applied "Customer First" simulation strategy');
    } else if (preset === 'cost_optimized') {
      newWeights = { impact: 0.15, urgency: 0.15, benefit: 0.20, cost: 0.35, risk: 0.15 };
      showToast('Applied "Cost Optimized" simulation strategy');
    } else if (preset === 'emergency') {
      newWeights = { impact: 0.25, urgency: 0.45, benefit: 0.20, cost: 0.05, risk: 0.05 };
      showToast('Applied "Emergency Speed" simulation strategy');
    }
    setWeights(newWeights);
    if (selectedIncident) {
      const actRes = await api.simulateDecisions(selectedIncident.id, newWeights);
      setSimulatedActions(actRes.simulated_actions || actRes);
    }
  };

  const handleApproveAction = async (action: RecoveryAction) => {
    if (!selectedIncident) return;
    try {
      await api.approveAction(action.id, 'cx_manager_auth', 'approve');
      setApprovalModalAction(null);
      showToast(`Authorized intervention: ${action.title}`);
      const [incRes, actRes] = await Promise.all([
        api.getIncidents(companyId),
        api.simulateDecisions(selectedIncident.id, weights)
      ]);
      setIncidents(incRes);
      setSimulatedActions(actRes.simulated_actions || actRes);
    } catch (err) {
      console.error(err);
      showToast('Failed to authorize action', 'error');
    }
  };

  const handleExecuteAction = async (actionId: string) => {
    if (!selectedIncident) return;
    setExecutingActionId(actionId);
    try {
      const verRes = await api.executeAction(actionId);
      setVerification(verRes);
      showToast('Recovery intervention executed successfully! Metrics verified.');
      const incRes = await api.getIncidents(companyId);
      setIncidents(incRes);
      const updatedInc = incRes.find((i: CXIncident) => i.id === selectedIncident.id);
      if (updatedInc) setSelectedIncident(updatedInc);
      
      const actRes = await api.simulateDecisions(selectedIncident.id, weights);
      setSimulatedActions(actRes.simulated_actions || actRes);
      // Automatically switch to verification tab so user sees the immediate impact
      setActiveTab('verification');
    } catch (err) {
      console.error(err);
      showToast('Action execution failed', 'error');
    } finally {
      setExecutingActionId(null);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'investigating') return inc.status === 'investigating';
    if (filterStatus === 'approved') return inc.status === 'approved';
    if (filterStatus === 'resolved') return inc.status === 'resolved';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Live Stream & Action Header Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-800">Operational Real-Time Feed</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">&bull;</span>
          <span className="text-xs text-slate-500 hidden sm:inline">Automatic 3.5s dynamic sync</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleSimulateBurst}
            disabled={isSimulatingBurst}
            className="flex items-center space-x-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-1.5 rounded-lg hover:bg-rose-100/80 active:scale-95 transition-all shadow-sm"
            title="Simulate sudden real-time payment retry storm and checkout dropouts"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulatingBurst ? 'animate-bounce' : ''}`} />
            <span>{isSimulatingBurst ? 'Simulating Burst...' : 'Simulate Anomaly Burst'}</span>
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
            title="Refresh incident metrics immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Sleek KPI Strip - Balanced & Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 block">Active Signals</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">{signals.length}</span>
              <span className="text-[11px] font-semibold text-rose-600 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +2 new
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Silent session anomalies</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 block">Affected Accounts</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {selectedIncident ? selectedIncident.affected_customers_count : 0}
              </span>
              <span className="text-[11px] font-medium text-slate-500">sessions</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Dropouts correlated</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 block">Exposure at Risk</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                ₹{selectedIncident ? selectedIncident.transaction_value_at_risk.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
              </span>
              <span className="text-[11px] font-semibold text-rose-600">High Risk</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Failed checkout carts</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 block">Recovery Status</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {verification ? `${verification.recovery_progress_pct}%` : '0%'}
              </span>
              <span className={`text-[11px] font-semibold ${verification?.overall_recovered ? 'text-emerald-600' : 'text-amber-600'}`}>
                {verification?.overall_recovered ? 'Verified' : 'Pending'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {verification?.overall_recovered ? 'Thresholds satisfied' : 'Action required'}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Main Workspace Split: Incidents Master (Left) & Focused Details Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Incidents List (4 cols) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Operational Incidents</h3>
              <p className="text-[11px] text-slate-500">Prioritized by business severity</p>
            </div>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
              {filteredIncidents.length}
            </span>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-lg text-[11px] font-medium text-slate-600">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('investigating')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                filterStatus === 'investigating' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('resolved')}
              className={`flex-1 py-1 rounded text-center transition-all ${
                filterStatus === 'resolved' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Resolved
            </button>
          </div>

          {/* Scrollable Incidents List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500/80 shadow-sm ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inc.severity === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      inc.severity === 'high' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {inc.severity.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-semibold">
                      {inc.status === 'resolved' ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolved
                        </span>
                      ) : inc.status === 'approved' ? (
                        <span className="text-blue-700 font-medium">Approved</span>
                      ) : (
                        <span className="text-amber-700 font-medium">Investigating</span>
                      )}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1">{inc.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{inc.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Tabbed Incident Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedIncident ? (
            <>
              {/* Focused Incident Header Banner */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold border border-slate-200">
                      {selectedIncident.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedIncident.severity === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {selectedIncident.severity.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight mt-1">{selectedIncident.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{selectedIncident.description}</p>
                </div>

                {/* Sub-tab Switcher */}
                <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-medium text-slate-600 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('investigation')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'investigation'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                    <span>Root Cause</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('simulator')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'simulator'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Decision Studio</span>
                    {simulatedActions.length > 0 && (
                      <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded-full font-bold">
                        {simulatedActions.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('verification')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'verification'
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verification</span>
                    {verification && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        verification.overall_recovered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {verification.recovery_progress_pct}%
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* TAB 1: Root-Cause Investigation */}
              {activeTab === 'investigation' && (
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Automated Hypotheses Assessment</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Cross-referenced against telemetry and commit history</p>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{hypotheses.length} assessed hypotheses</span>
                  </div>

                  <div className="space-y-3">
                    {hypotheses.map((hyp) => (
                      <div
                        key={hyp.id}
                        className={`p-4 rounded-xl border transition-all ${
                          hyp.is_primary
                            ? 'bg-blue-50/40 border-blue-300 shadow-sm'
                            : 'bg-white border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {hyp.is_primary && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                PRIMARY ROOT CAUSE
                              </span>
                            )}
                            <h5 className="text-sm font-semibold text-slate-900">{hyp.title}</h5>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-500 font-medium">Confidence:</span>
                            <span className="text-xs font-bold text-blue-700 font-mono">
                              {(hyp.confidence_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mb-3 leading-relaxed">{hyp.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/70">
                            <span className="text-emerald-700 font-bold text-[11px] block mb-1.5 flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Supporting Evidence
                            </span>
                            <ul className="space-y-1 text-slate-600">
                              {hyp.supporting_evidence.map((ev, i) => (
                                <li key={i} className="flex items-center space-x-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                  <span className="font-mono text-[11px]">{ev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/70">
                            <span className="text-slate-700 font-bold text-[11px] block mb-1.5 flex items-center gap-1">
                              <X className="w-3.5 h-3.5 text-slate-400" /> Contradictory Evidence
                            </span>
                            <ul className="space-y-1 text-slate-600">
                              {hyp.contradictory_evidence.map((ev, i) => (
                                <li key={i} className="flex items-center space-x-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0"></span>
                                  <span className="text-[11px]">{ev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: Decision Studio & Simulator */}
              {activeTab === 'simulator' && (
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                  {/* Preset Toolbar & Weight Drawer Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Recovery Decision Ranking</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Ranked candidate interventions simulated against business criteria</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-lg text-[11px] font-medium text-slate-600">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 px-1">Presets:</span>
                        <button
                          onClick={() => applyPreset('customer_first')}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm transition-colors"
                        >
                          Customer First
                        </button>
                        <button
                          onClick={() => applyPreset('cost_optimized')}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm transition-colors"
                        >
                          Cost Optimized
                        </button>
                        <button
                          onClick={() => applyPreset('emergency')}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm transition-colors"
                        >
                          Emergency
                        </button>
                      </div>

                      <button
                        onClick={() => setShowWeightSliders(!showWeightSliders)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border flex items-center space-x-1 transition-colors ${
                          showWeightSliders
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Weights</span>
                        {showWeightSliders ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Criteria Weights Drawer */}
                  {showWeightSliders && (
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs animate-in fade-in">
                      <div>
                        <label className="text-slate-600 block mb-1 font-medium">Impact: {weights.impact.toFixed(2)}</label>
                        <input
                          type="range"
                          min="0.05"
                          max="0.5"
                          step="0.05"
                          value={weights.impact}
                          onChange={(e) => handleWeightChange('impact', parseFloat(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 block mb-1 font-medium">Urgency: {weights.urgency.toFixed(2)}</label>
                        <input
                          type="range"
                          min="0.05"
                          max="0.5"
                          step="0.05"
                          value={weights.urgency}
                          onChange={(e) => handleWeightChange('urgency', parseFloat(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 block mb-1 font-medium">Benefit: {weights.benefit.toFixed(2)}</label>
                        <input
                          type="range"
                          min="0.05"
                          max="0.5"
                          step="0.05"
                          value={weights.benefit}
                          onChange={(e) => handleWeightChange('benefit', parseFloat(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 block mb-1 font-medium">Cost: {weights.cost.toFixed(2)}</label>
                        <input
                          type="range"
                          min="0.05"
                          max="0.5"
                          step="0.05"
                          value={weights.cost}
                          onChange={(e) => handleWeightChange('cost', parseFloat(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 block mb-1 font-medium">Risk: {weights.risk.toFixed(2)}</label>
                        <input
                          type="range"
                          min="0.05"
                          max="0.5"
                          step="0.05"
                          value={weights.risk}
                          onChange={(e) => handleWeightChange('risk', parseFloat(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Clean Ranked Actions List */}
                  <div className="space-y-3">
                    {simulatedActions.map((action, idx) => (
                      <div
                        key={action.id}
                        className={`p-4 rounded-xl border transition-all ${
                          idx === 0
                            ? 'bg-slate-50/70 border-blue-400 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                              #{idx + 1}
                            </span>
                            <h5 className="text-sm font-semibold text-slate-900">{action.title}</h5>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Decision Score</span>
                              <span className="text-sm font-bold text-blue-700 font-mono">{action.decision_score}</span>
                            </div>

                            {/* Action Buttons */}
                            {action.approval_status === 'pending' && (
                              <button
                                onClick={() => setApprovalModalAction(action)}
                                className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm"
                              >
                                Authorize Action
                              </button>
                            )}

                            {action.approval_status === 'approved' && (
                              <button
                                onClick={() => handleExecuteAction(action.id)}
                                disabled={executingActionId === action.id}
                                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
                              >
                                <Play className="w-3 h-3" />
                                <span>{executingActionId === action.id ? 'Executing...' : 'Execute Recovery'}</span>
                              </button>
                            )}

                            {action.approval_status === 'executed' && (
                              <span className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Executed & Verified</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mb-3 leading-relaxed">{action.description}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-2 font-medium">
                          <span>Benefit: <span className="text-slate-900 font-semibold">{action.expected_benefit}%</span></span>
                          <span>Est Cost: <span className="text-slate-900 font-semibold font-mono">₹{action.operational_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                          <span>Risk: <span className="text-slate-900 font-semibold uppercase">{action.operational_risk}</span></span>
                          <span>SLA: <span className="text-slate-900 font-semibold font-mono">{action.implementation_time_mins} mins</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Operational Recovery Verification */}
              {activeTab === 'verification' && (
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Recovery Verification Auditing</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Live telemetry auditing compared with baseline recovery targets</p>
                      </div>
                    </div>
                    {verification && (
                      <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                        verification.overall_recovered
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {verification.overall_recovered ? 'Recovery Verified' : 'Monitoring Active'}
                      </span>
                    )}
                  </div>

                  {verification && verification.metrics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {verification.metrics.map((m, i) => (
                        <div key={i} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-800 text-sm">{m.metric_name}</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              m.is_recovered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {m.is_recovered ? 'Recovered' : 'Degraded'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-slate-500 mt-3 font-mono bg-white p-2.5 rounded-lg border border-slate-200/60">
                            <div>
                              <span className="block text-[10px] uppercase font-sans font-medium text-slate-400">Pre</span>
                              <span className="text-rose-700 font-bold text-xs">{m.pre_intervention}%</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-sans font-medium text-slate-400">Current</span>
                              <span className="text-slate-900 font-bold text-xs">{m.current_value}%</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-sans font-medium text-slate-400">Target</span>
                              <span className="text-emerald-700 font-bold text-xs">&lt; {m.target_value}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">Awaiting Recovery Intervention Execution</p>
                      <p className="text-slate-400 mt-1">Once a recovery action is executed from the Decision Studio, live telemetry metrics and verification audit trails will be shown here.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200/80 text-center text-slate-500 text-xs">
              Select an incident from the operational list on the left to begin investigation.
            </div>
          )}
        </div>
      </div>

      {/* Human Authorization Modal */}
      {approvalModalAction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Authorize Consequential Action</h3>
              <button
                onClick={() => setApprovalModalAction(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">Proposed Strategy</span>
                <span className="font-semibold text-slate-900 text-sm">{approvalModalAction.title}</span>
                <p className="mt-1 text-slate-600 leading-relaxed">{approvalModalAction.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium bg-slate-50/50 p-3 rounded-lg border border-slate-200/60">
                <div>Est Cost: <span className="text-slate-900 font-semibold font-mono">₹{approvalModalAction.operational_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div>Risk Level: <span className="text-slate-900 font-semibold uppercase">{approvalModalAction.operational_risk}</span></div>
                <div>Implementation: <span className="text-slate-900 font-semibold font-mono">{approvalModalAction.implementation_time_mins} mins</span></div>
                <div>Expected Benefit: <span className="text-slate-900 font-semibold font-mono">{approvalModalAction.expected_benefit}%</span></div>
              </div>

              <p className="text-[11px] text-slate-500 bg-amber-50/50 text-amber-900 p-3 rounded-lg border border-amber-200/60">
                Human authorization is recorded for production audit traceability. Once authorized, the action will be eligible for controlled execution.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setApprovalModalAction(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveAction(approvalModalAction)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm"
              >
                Authorize Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
