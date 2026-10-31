import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { CXIncident, ComplaintCluster, DetectedSignal, InvestigationHistory } from '../../types';
import {
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  Network, Sparkles, Send, History, CheckCircle2, ArrowRight
} from 'lucide-react';

interface BusinessAnalystDashboardProps {
  companyId: string;
}

export const BusinessAnalystDashboard: React.FC<BusinessAnalystDashboardProps> = ({ companyId }) => {
  const [incidents, setIncidents] = useState<CXIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [clusters, setClusters] = useState<ComplaintCluster[]>([]);
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [history, setHistory] = useState<InvestigationHistory[]>([]);
  const [graphData, setGraphData] = useState<any>({ nodes: [], edges: [] });

  // Adaptation Lab State
  const [injectionType, setInjectionType] = useState('gateway_log');
  const [injectionTitle, setInjectionTitle] = useState('Third-Party Status Dashboard: Alpha Core Degradation');
  const [injectionLog, setInjectionLog] = useState('Incident #GW-9844: Fiber connectivity outage affecting Alpha processing cluster.');
  const [injectionLatency, setInjectionLatency] = useState(4850);
  const [isInjecting, setIsInjecting] = useState(false);
  const [adaptationResult, setAdaptationResult] = useState<any>(null);

  const loadData = async () => {
    try {
      const [incRes, sigRes, clusterRes] = await Promise.all([
        api.getIncidents(companyId),
        api.getSignals(companyId),
        api.getClusters(companyId)
      ]);
      setIncidents(incRes);
      setSignals(sigRes);
      setClusters(clusterRes);

      if (incRes.length > 0) {
        const primaryId = incRes[0].id;
        setSelectedIncidentId(primaryId);
        loadIncidentGraphAndHistory(primaryId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadIncidentGraphAndHistory = async (incidentId: string) => {
    try {
      const [gRes, hRes] = await Promise.all([
        api.getIncidentGraph(incidentId),
        api.getInvestigationHistory(incidentId)
      ]);
      setGraphData(gRes);
      setHistory(hRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleIncidentSelect = (id: string) => {
    setSelectedIncidentId(id);
    loadIncidentGraphAndHistory(id);
    setAdaptationResult(null);
  };

  const handleInjectEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId) return;
    setIsInjecting(true);
    try {
      const res = await api.injectEvidence({
        incident_id: selectedIncidentId,
        evidence_type: injectionType,
        source_id: `AUDIT_${Date.now().toString().slice(-4)}`,
        title: injectionTitle,
        log_content: injectionLog,
        latency_ms: injectionLatency,
        is_error: true
      });
      setAdaptationResult(res);
      loadIncidentGraphAndHistory(selectedIncidentId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInjecting(false);
    }
  };

  const telemetryData = [
    { time: '13:00', baseline: 4.2, actual: 4.5 },
    { time: '13:30', baseline: 4.2, actual: 4.8 },
    { time: '14:00', baseline: 4.2, actual: 8.2 },
    { time: '14:30', baseline: 4.2, actual: 21.4 },
    { time: '15:00', baseline: 4.2, actual: 38.6 },
    { time: '15:30', baseline: 4.2, actual: 36.2 },
    { time: '16:00', baseline: 4.2, actual: 39.1 }
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Telemetry & Investigation Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">Statistical anomaly detection and cross-channel evidence correlation</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Incident:</span>
          <select
            value={selectedIncidentId}
            onChange={(e) => handleIncidentSelect(e.target.value)}
            className="bg-slate-50 text-xs text-slate-800 border border-slate-200 px-3 py-1.5 rounded-md outline-none cursor-pointer font-medium"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id}: {inc.title.slice(0, 36)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: Telemetry & Anomaly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Behavioural Anomaly Telemetry</h3>
              <p className="text-xs text-slate-500 mt-0.5">Payment retry rate surge versus established baseline</p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <span className="flex items-center space-x-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <span>Baseline (4.2%)</span>
              </span>
              <span className="flex items-center space-x-1.5 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Observed (38.6%)</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 45]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="actual" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#actualGrad)" />
                <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NLP Complaint Clustering Panel */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Complaint Topic Clusters</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automated grouping of feedback submissions</p>
            </div>
          </div>

          <div className="space-y-3">
            {clusters.map((c) => (
              <div key={c.cluster_id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-900">{c.topic}</span>
                  <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-medium">
                    {c.item_count} records
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.top_keywords.map((kw, i) => (
                    <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Evidence Relationship Graph */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Network className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Cross-Channel Evidence Correlation</h3>
              <p className="text-xs text-slate-500 mt-0.5">Causal linkage between silent signals, telemetry, gateway logs, releases, and customer impact</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          {graphData.nodes && graphData.nodes.map((node: any, idx: number) => (
            <div
              key={node.id}
              className={`p-4 rounded-lg border text-xs flex flex-col justify-between ${
                node.id === 'node_incident' ? 'bg-blue-50/50 border-blue-300 shadow-sm' :
                node.id === 'node_signal' ? 'bg-rose-50/40 border-rose-200' :
                node.id === 'node_gateway' ? 'bg-amber-50/40 border-amber-200' :
                'bg-white border-slate-200'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  {node.data?.type || 'Graph Node'}
                </span>
                <span className="font-semibold text-slate-900 block text-xs">
                  {node.data?.label}
                </span>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between font-medium">
                <span>Node #{idx + 1}</span>
                <span className="text-blue-600">Correlated</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Dynamic Adaptation Lab */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-slate-700" />
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Telemetry Adaptation Lab</h3>
              <p className="text-xs text-slate-500 mt-0.5">Submit newly arrived diagnostic logs to evaluate real-time hypothesis reassessment</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Injection Form */}
          <form onSubmit={handleInjectEvidence} className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Submit Operational Evidence</h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Source Type</label>
                <select
                  value={injectionType}
                  onChange={(e) => setInjectionType(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-md px-3 py-2 outline-none font-medium"
                >
                  <option value="gateway_log">External Gateway Audit Log</option>
                  <option value="network_telemetry">ISP Backbone Telemetry</option>
                  <option value="deployment_audit">Commit Diff Audit</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-medium">Recorded Latency (ms)</label>
                <input
                  type="number"
                  value={injectionLatency}
                  onChange={(e) => setInjectionLatency(parseInt(e.target.value) || 0)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-md px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-slate-600 block mb-1 font-medium">Log Title</label>
              <input
                type="text"
                value={injectionTitle}
                onChange={(e) => setInjectionTitle(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-md px-3 py-2 outline-none"
              />
            </div>

            <div className="text-xs">
              <label className="text-slate-600 block mb-1 font-medium">Diagnostic Details</label>
              <textarea
                rows={3}
                value={injectionLog}
                onChange={(e) => setInjectionLog(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-md px-3 py-2 outline-none font-mono text-[11px]"
              />
            </div>

            <button
              type="submit"
              disabled={isInjecting || !selectedIncidentId}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isInjecting ? 'Evaluating Evidence...' : 'Submit Evidence & Reassess'}</span>
            </button>
          </form>

          {/* Adaptation Result & Historical Traceability */}
          <div className="space-y-3">
            {adaptationResult ? (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-2">
                <div className="flex items-center space-x-2 text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold">Investigation Revision V{adaptationResult.version} Complete</span>
                </div>
                <p className="text-xs text-slate-600">{adaptationResult.delta_explanation}</p>
                <div className="pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-500 block uppercase font-medium text-[10px] mb-1">Updated Recommended Strategy</span>
                  <span className="font-semibold text-slate-900">{adaptationResult.revised_recommended_action?.title}</span>
                  <span className="ml-2 font-bold text-blue-700">
                    Score: {adaptationResult.revised_recommended_action?.decision_score}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                <div className="flex items-center space-x-2 mb-1 text-slate-700 font-semibold">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Revision Audit Trail</span>
                </div>
                <p>No new evidence submitted in this session. Submit new diagnostic logs on the left to trigger real-time hypothesis reassessment.</p>
              </div>
            )}

            {/* Previous versions audit trail */}
            {history.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <span className="text-[11px] uppercase font-semibold text-slate-500 block">Revision History ({history.length})</span>
                {history.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-medium">
                      <span className="text-slate-800 font-semibold">Version {h.version}</span>
                      <span>{new Date(h.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 line-clamp-2">{h.delta_explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
