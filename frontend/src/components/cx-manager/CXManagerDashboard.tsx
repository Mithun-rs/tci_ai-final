import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { CXIncident, RootCauseHypothesis, RecoveryAction, DetectedSignal, VerificationResult } from '../../types';
import { useToast } from '../common/Toast';
import {
  AlertTriangle, CheckCircle2, Sliders, Shield,
  DollarSign, Users, Play, Check, X, ArrowUpRight, ArrowDownRight,
  Sparkles, CheckCheck
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

  useEffect(() => {
    loadData();
  }, [companyId]);

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
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500">Active Signals</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{signals.length}</span>
            <span className="text-xs font-semibold text-rose-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +2 new
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Silent anomalies detected across sessions</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500">Affected Accounts</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {selectedIncident ? selectedIncident.affected_customers_count : 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">active sessions</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '60%' }}></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Correlated via session dropouts</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500">Exposure at Risk</span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-rose-600" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              ₹{selectedIncident ? selectedIncident.transaction_value_at_risk.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
            </span>
            <span className="text-xs font-semibold text-rose-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> High Risk
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Sum of failed and retry checkout carts</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-500">Recovery Status</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {verification ? `${verification.recovery_progress_pct}%` : '0%'}
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              {verification?.overall_recovered ? 'Verified' : 'Pending Action'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${verification?.overall_recovered ? 'bg-emerald-500' : 'bg-slate-300'}`}
              style={{ width: `${verification ? verification.recovery_progress_pct : 0}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            {verification?.overall_recovered ? 'Criteria met post-execution' : 'Awaiting authorized deployment'}
          </p>
        </div>
      </div>

      {/* Main Grid: Incidents & Investigation Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Incidents List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Operational Incidents</h3>
              <p className="text-[11px] text-slate-500">Emerging risks prioritized by severity</p>
            </div>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
              {filteredIncidents.length}
            </span>
          </div>

          {/* Incident Filter Tabs */}
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

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-500/80 shadow-sm'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
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
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolved
                        </span>
                      ) : inc.status === 'approved' ? (
                        <span className="text-blue-700">Action Approved</span>
                      ) : (
                        <span className="text-amber-700">Investigating</span>
                      )}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-1">{inc.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{inc.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Columns: Investigation & Decision Simulator */}
        <div className="lg:col-span-2 space-y-6">
          {selectedIncident && (
            <>
              {/* Root-Cause Hypotheses Evaluation */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Root-Cause Investigation</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Automated hypothesis evaluation cross-referenced with ground-truth evidence</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 border border-slate-200 font-semibold">
                    {selectedIncident.id}
                  </span>
                </div>

                <div className="space-y-3">
                  {hypotheses.map((hyp) => (
                    <div
                      key={hyp.id}
                      className={`p-4 rounded-xl border transition-all ${
                        hyp.is_primary
                          ? 'bg-blue-50/30 border-blue-200 shadow-sm'
                          : 'bg-white border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {hyp.is_primary && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              PRIMARY ASSESSMENT
                            </span>
                          )}
                          <h4 className="text-sm font-semibold text-slate-900">{hyp.title}</h4>
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
                        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                          <span className="text-emerald-700 font-bold text-[11px] block mb-1.5 flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Supporting Evidence
                          </span>
                          <ul className="space-y-1 text-slate-600">
                            {hyp.supporting_evidence.map((ev, i) => (
                              <li key={i} className="flex items-center space-x-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                <span className="font-mono text-[11px]">{ev}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                          <span className="text-slate-700 font-bold text-[11px] block mb-1.5 flex items-center gap-1">
                            <X className="w-3.5 h-3.5 text-slate-400" /> Contradictory Evidence
                          </span>
                          <ul className="space-y-1 text-slate-600">
                            {hyp.contradictory_evidence.map((ev, i) => (
                              <li key={i} className="flex items-center space-x-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
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

              {/* What-If Decision Simulator */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">What-If Decision Simulator</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Multi-criteria ranking of alternative business recovery strategies</p>
                    </div>
                  </div>

                  {/* 1-Click Strategy Presets */}
                  <div className="flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-lg text-[11px] font-medium text-slate-600">
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
                </div>

                {/* Weights Sliders */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
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

                {/* Ranked Actions List */}
                <div className="space-y-3">
                  {simulatedActions.map((action, idx) => (
                    <div
                      key={action.id}
                      className={`p-4 rounded-xl border transition-all ${
                        idx === 0
                          ? 'bg-slate-50/80 border-blue-400/80 shadow-sm'
                          : 'bg-white border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                            #{idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900">{action.title}</h4>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Decision Score</span>
                            <span className="text-sm font-bold text-blue-700 font-mono">{action.decision_score}</span>
                          </div>

                          {/* Approval / Execution Buttons */}
                          {action.approval_status === 'pending' && (
                            <button
                              onClick={() => setApprovalModalAction(action)}
                              className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm"
                            >
                              Authorize Action
                            </button>
                          )}

                          {action.approval_status === 'approved' && (
                            <button
                              onClick={() => handleExecuteAction(action.id)}
                              disabled={executingActionId === action.id}
                              className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
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
                        <span>Est Cost: <span className="text-slate-900 font-semibold">₹{action.operational_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                        <span>Risk: <span className="text-slate-900 font-semibold uppercase">{action.operational_risk}</span></span>
                        <span>SLA: <span className="text-slate-900 font-semibold">{action.implementation_time_mins} mins</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post-Intervention Verification Panel */}
              {verification && verification.metrics.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Operational Recovery Verification</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Continuous telemetry auditing against defined recovery thresholds</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                      verification.overall_recovered
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {verification.overall_recovered ? 'Recovery Verified' : 'Monitoring Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {verification.metrics.map((m, i) => (
                      <div key={i} className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-800">{m.metric_name}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            m.is_recovered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {m.is_recovered ? 'Recovered' : 'Degraded'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-slate-500 mt-2 font-mono">
                          <div>
                            <span className="block text-[10px] uppercase font-sans font-medium text-slate-400">Pre</span>
                            <span className="text-rose-700 font-bold">{m.pre_intervention}%</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-sans font-medium text-slate-400">Current</span>
                            <span className="text-slate-900 font-bold">{m.current_value}%</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-sans font-medium text-slate-400">Target</span>
                            <span className="text-emerald-700 font-bold">&lt; {m.target_value}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Human Approval Modal */}
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
