import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { CXIncident, RootCauseHypothesis, RecoveryAction, DetectedSignal, VerificationResult } from '../../types';
import {
  AlertTriangle, CheckCircle2, Sliders, Shield,
  DollarSign, Users, Play, Check, X
} from 'lucide-react';

interface CXManagerDashboardProps {
  companyId: string;
}

export const CXManagerDashboard: React.FC<CXManagerDashboardProps> = ({ companyId }) => {
  const [incidents, setIncidents] = useState<CXIncident[]>([]);
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<CXIncident | null>(null);
  const [hypotheses, setHypotheses] = useState<RootCauseHypothesis[]>([]);
  const [simulatedActions, setSimulatedActions] = useState<RecoveryAction[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  
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

  const handleApproveAction = async (action: RecoveryAction) => {
    if (!selectedIncident) return;
    try {
      await api.approveAction(action.id, 'cx_manager_auth', 'approve');
      setApprovalModalAction(null);
      const [incRes, actRes] = await Promise.all([
        api.getIncidents(companyId),
        api.simulateDecisions(selectedIncident.id, weights)
      ]);
      setIncidents(incRes);
      setSimulatedActions(actRes.simulated_actions || actRes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteAction = async (actionId: string) => {
    if (!selectedIncident) return;
    setExecutingActionId(actionId);
    try {
      const verRes = await api.executeAction(actionId);
      setVerification(verRes);
      const incRes = await api.getIncidents(companyId);
      setIncidents(incRes);
      const updatedInc = incRes.find((i: CXIncident) => i.id === selectedIncident.id);
      if (updatedInc) setSelectedIncident(updatedInc);
      
      const actRes = await api.simulateDecisions(selectedIncident.id, weights);
      setSimulatedActions(actRes.simulated_actions || actRes);
    } catch (err) {
      console.error(err);
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-medium tracking-wider">Active Signals</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{signals.length}</div>
          <p className="text-xs text-slate-500 mt-1">Unusual behavioural patterns detected</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-medium tracking-wider">Affected Customers</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {selectedIncident ? selectedIncident.affected_customers_count : 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Identified across active sessions</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-medium tracking-wider">Value at Risk</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${selectedIncident ? selectedIncident.transaction_value_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Sum of failed and abandoned transactions</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-medium tracking-wider">Recovery Verification</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {verification ? `${verification.recovery_progress_pct}%` : '0%'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {verification?.overall_recovered ? 'Post-intervention criteria met' : 'Monitoring post-intervention criteria'}
          </p>
        </div>
      </div>

      {/* Main Grid: Incidents & Investigation Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Incidents List */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Operational Incidents</h3>
            <span className="text-xs text-slate-500 font-medium">{incidents.length} active</span>
          </div>

          <div className="space-y-2.5">
            {incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      inc.severity === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      inc.severity === 'high' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {inc.severity.toUpperCase()}
                    </span>
                    <span className="text-xs font-medium">
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

                  <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{inc.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1">{inc.description}</p>
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
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Root-Cause Evaluation</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Evidence-grounded explanations with supporting and contradictory proofs</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-600 border border-slate-200">
                    {selectedIncident.id}
                  </span>
                </div>

                <div className="space-y-3">
                  {hypotheses.map((hyp) => (
                    <div
                      key={hyp.id}
                      className={`p-4 rounded-lg border transition-all ${
                        hyp.is_primary
                          ? 'bg-blue-50/30 border-blue-200 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {hyp.is_primary && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                              PRIMARY HYPOTHESIS
                            </span>
                          )}
                          <h4 className="text-sm font-semibold text-slate-900">{hyp.title}</h4>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs text-slate-500">Confidence:</span>
                          <span className="text-xs font-bold text-blue-700">
                            {(hyp.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mb-3">{hyp.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                          <span className="text-emerald-700 font-semibold text-[11px] block mb-1">Supporting Evidence</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                            {hyp.supporting_evidence.map((ev, i) => (
                              <li key={i}>{ev}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                          <span className="text-slate-700 font-semibold text-[11px] block mb-1">Contradictory / Ruled Out</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                            {hyp.contradictory_evidence.map((ev, i) => (
                              <li key={i}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What-If Decision Simulator */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Decision Simulation Matrix</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Multi-criteria ranking of alternative business recovery strategies</p>
                    </div>
                  </div>
                </div>

                {/* Weights Sliders */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
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
                      className={`p-4 rounded-lg border transition-all ${
                        idx === 0
                          ? 'bg-slate-50/70 border-blue-300 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            #{idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900">{action.title}</h4>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase block font-medium">Decision Score</span>
                            <span className="text-sm font-bold text-blue-700">{action.decision_score}</span>
                          </div>

                          {/* Approval / Execution Buttons */}
                          {action.approval_status === 'pending' && (
                            <button
                              onClick={() => setApprovalModalAction(action)}
                              className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors shadow-sm"
                            >
                              Authorize Action
                            </button>
                          )}

                          {action.approval_status === 'approved' && (
                            <button
                              onClick={() => handleExecuteAction(action.id)}
                              disabled={executingActionId === action.id}
                              className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center space-x-1.5 transition-colors shadow-sm"
                            >
                              <Play className="w-3 h-3" />
                              <span>{executingActionId === action.id ? 'Executing...' : 'Execute Recovery'}</span>
                            </button>
                          )}

                          {action.approval_status === 'executed' && (
                            <span className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md flex items-center space-x-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Executed & Verified</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mb-3">{action.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-2 font-medium">
                        <span>Benefit: <span className="text-slate-800">{action.expected_benefit}%</span></span>
                        <span>Est Cost: <span className="text-slate-800">${action.operational_cost.toFixed(2)}</span></span>
                        <span>Risk: <span className="text-slate-800 uppercase">{action.operational_risk}</span></span>
                        <span>Implementation: <span className="text-slate-800">{action.implementation_time_mins} mins</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post-Intervention Verification Panel */}
              {verification && verification.metrics.length > 0 && (
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase">Operational Verification Status</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Continuous telemetry auditing against defined recovery thresholds</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${
                      verification.overall_recovered
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {verification.overall_recovered ? 'Recovery Verified' : 'Monitoring Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {verification.metrics.map((m, i) => (
                      <div key={i} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-800">{m.metric_name}</span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            m.is_recovered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {m.is_recovered ? 'Recovered' : 'Degraded'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-slate-500 mt-2">
                          <div>
                            <span className="block text-[10px] uppercase font-medium">Pre</span>
                            <span className="text-rose-700 font-semibold">{m.pre_intervention}%</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-medium">Current</span>
                            <span className="text-slate-800 font-semibold">{m.current_value}%</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-medium">Target</span>
                            <span className="text-emerald-700 font-semibold">&lt; {m.target_value}%</span>
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
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
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
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px] uppercase font-medium mb-1">Proposed Strategy</span>
                <span className="font-semibold text-slate-900 text-sm">{approvalModalAction.title}</span>
                <p className="mt-1 text-slate-600">{approvalModalAction.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600 font-medium">
                <div>Est Cost: <span className="text-slate-900 font-semibold">${approvalModalAction.operational_cost.toFixed(2)}</span></div>
                <div>Risk: <span className="text-slate-900 font-semibold uppercase">{approvalModalAction.operational_risk}</span></div>
                <div>Implementation: <span className="text-slate-900 font-semibold">{approvalModalAction.implementation_time_mins} mins</span></div>
                <div>Expected Benefit: <span className="text-slate-900 font-semibold">{approvalModalAction.expected_benefit}%</span></div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                Human authorization is recorded for production action traceability. Once authorized, the action is enabled for execution.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setApprovalModalAction(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveAction(approvalModalAction)}
                className="px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors shadow-sm"
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
