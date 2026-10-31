import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { CXIncident, ComplaintCluster, DetectedSignal, InvestigationHistory } from '../../types';
import { useToast } from '../common/Toast';
import {
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  Network, Sparkles, Send, History, CheckCircle2,
  Activity, MessageSquare, ArrowRight, Layers,
  Zap, Pause, Play, RefreshCw
} from 'lucide-react';

interface BusinessAnalystDashboardProps {
  companyId: string;
}

export const BusinessAnalystDashboard: React.FC<BusinessAnalystDashboardProps> = ({ companyId }) => {
  const { showToast } = useToast();
  const [incidents, setIncidents] = useState<CXIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [clusters, setClusters] = useState<ComplaintCluster[]>([]);
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [history, setHistory] = useState<InvestigationHistory[]>([]);
  const [graphData, setGraphData] = useState<any>({ nodes: [], edges: [] });
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('6h');
  const [activeTab, setActiveTab] = useState<'telemetry' | 'correlation' | 'adaptation'>('telemetry');

  // Adaptation Lab State
  const [injectionType, setInjectionType] = useState('gateway_log');
  const [injectionTitle, setInjectionTitle] = useState('Third-Party Status Dashboard: Alpha Core Degradation');
  const [injectionLog, setInjectionLog] = useState('Incident #GW-9844: Fiber connectivity outage affecting Alpha processing cluster.');
  const [injectionLatency, setInjectionLatency] = useState(4850);
  const [isInjecting, setIsInjecting] = useState(false);
  const [adaptationResult, setAdaptationResult] = useState<any>(null);

  // Real-Time Behavioural Anomaly Telemetry State
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [telemetryMeta, setTelemetryMeta] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isBurstSimulating, setIsBurstSimulating] = useState<boolean>(false);
  const [lastTelemetryUpdate, setLastTelemetryUpdate] = useState<Date>(new Date());

  const fetchTelemetry = async () => {
    try {
      const res = await api.getRealtimeTelemetry(companyId, selectedIncidentId || undefined, timeRange);
      if (res && res.points) {
        setTelemetryData(res.points);
        setTelemetryMeta(res);
        setLastTelemetryUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch telemetry stream:', err);
    }
  };

  const handleSimulateBurst = async () => {
    setIsBurstSimulating(true);
    try {
      const res = await api.simulateBurst(companyId);
      if (res && res.points) {
        setTelemetryData(res.points);
        setTelemetryMeta(res);
      }
      showToast('Real-time payment retry storm & checkout dropout burst simulated!', 'info');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Burst simulation failed', 'error');
    } finally {
      setIsBurstSimulating(false);
    }
  };

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

      if (incRes.length > 0 && !selectedIncidentId) {
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

  // Real-time telemetry sliding-window poll (every 3 seconds)
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => {
      if (isStreaming) {
        fetchTelemetry();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [companyId, selectedIncidentId, timeRange, isStreaming]);

  // Periodic background refresh for incidents and signals
  useEffect(() => {
    const bgInterval = setInterval(() => {
      api.getIncidents(companyId).then(incRes => {
        setIncidents(incRes);
      }).catch(() => {});
      api.getSignals(companyId).then(sigRes => {
        setSignals(sigRes);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(bgInterval);
  }, [companyId]);

  const handleIncidentSelect = (id: string) => {
    setSelectedIncidentId(id);
    loadIncidentGraphAndHistory(id);
    setAdaptationResult(null);
  };

  const applyPreset = (preset: 'alpha_outage' | 'upi_sdk' | 'replica_lag') => {
    if (preset === 'alpha_outage') {
      setInjectionType('gateway_log');
      setInjectionTitle('Third-Party Status Dashboard: Alpha Core Degradation');
      setInjectionLog('Incident #GW-9844: Major regional fiber cut in South routing node causing Alpha gateway latency spike.');
      setInjectionLatency(4850);
      showToast('Loaded "Alpha Regional Outage" preset');
    } else if (preset === 'upi_sdk') {
      setInjectionType('deployment_audit');
      setInjectionTitle('Android UPI SDK v2.4.0 Serialization Timeout');
      setInjectionLog('Commit c4f89d2 diff analysis confirms unhandled Promise timeout on Android UPI intent receiver.');
      setInjectionLatency(5200);
      showToast('Loaded "Android UPI SDK Defect" preset');
    } else if (preset === 'replica_lag') {
      setInjectionType('network_telemetry');
      setInjectionTitle('Database Read Replica Sync Latency');
      setInjectionLog('Read replica replication delay exceeded 12,000ms during peak checkout session generation.');
      setInjectionLatency(3400);
      showToast('Loaded "Replica Lag" preset');
    }
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
      showToast(`Dynamic evidence injected! Investigation revised to V${res.version}.`);
      loadIncidentGraphAndHistory(selectedIncidentId);
    } catch (err) {
      console.error(err);
      showToast('Failed to inject evidence', 'error');
    } finally {
      setIsInjecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header & Sub-Navigation */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Telemetry & Investigation Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">Statistical anomaly detection and cross-channel evidence correlation</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Incident Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Incident:</span>
            <select
              value={selectedIncidentId}
              onChange={(e) => handleIncidentSelect(e.target.value)}
              className="bg-slate-50 text-xs text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg outline-none cursor-pointer font-medium shadow-sm"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id}: {inc.title.slice(0, 32)}...
                </option>
              ))}
            </select>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Telemetry & Clusters</span>
            </button>
            <button
              onClick={() => setActiveTab('correlation')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'correlation'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-blue-600" />
              <span>Evidence Graph</span>
            </button>
            <button
              onClick={() => setActiveTab('adaptation')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'adaptation'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Adaptation Lab</span>
              {history.length > 0 && (
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
                  V{history.length + 1}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Telemetry & NLP Topic Clusters */}
      {activeTab === 'telemetry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Telemetry Chart (2 cols) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Behavioural Anomaly Telemetry</h3>
                <p className="text-xs text-slate-500 mt-0.5">Sliding-window payment retry rate surge vs 7-day moving baseline</p>
              </div>
              
              <div className="flex items-center flex-wrap gap-2">
                {/* Simulate Burst Action */}
                <button
                  onClick={handleSimulateBurst}
                  disabled={isBurstSimulating}
                  className="flex items-center space-x-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-1 rounded-lg hover:bg-rose-100/80 active:scale-95 transition-all shadow-sm"
                  title="Inject real-time transaction dropouts and multi-attempt retry storm"
                >
                  <Zap className={`w-3.5 h-3.5 ${isBurstSimulating ? 'animate-bounce' : ''}`} />
                  <span>{isBurstSimulating ? 'Simulating...' : 'Simulate Spike'}</span>
                </button>

                {/* Pause/Stream Toggle */}
                <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors"
                  title={isStreaming ? 'Pause live stream' : 'Resume live stream'}
                >
                  {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>

                {/* Time range switcher */}
                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
                  <button
                    onClick={() => setTimeRange('1h')}
                    className={`px-2 py-0.5 rounded-md transition-all ${timeRange === '1h' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'}`}
                  >
                    1h
                  </button>
                  <button
                    onClick={() => setTimeRange('6h')}
                    className={`px-2 py-0.5 rounded-md transition-all ${timeRange === '6h' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'}`}
                  >
                    6h
                  </button>
                  <button
                    onClick={() => setTimeRange('24h')}
                    className={`px-2 py-0.5 rounded-md transition-all ${timeRange === '24h' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'}`}
                  >
                    24h
                  </button>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={telemetryMeta?.is_recovered ? '#10b981' : '#e11d48'} stopOpacity={0.18}/>
                      <stop offset="95%" stopColor={telemetryMeta?.is_recovered ? '#10b981' : '#e11d48'} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1.5 font-sans min-w-[175px]">
                            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] pb-1 border-b border-slate-100">
                              <span>Window: {d.time}</span>
                              <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${d.is_anomaly ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {d.is_anomaly ? 'Anomaly' : 'Normal'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Retry Rate:</span>
                              <span className={`font-bold font-mono ${d.is_anomaly ? 'text-rose-600' : 'text-slate-900'}`}>{d.actual}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600 font-medium">Moving Baseline:</span>
                              <span className="font-medium text-slate-500 font-mono">{d.baseline}%</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                              <span className="text-slate-600 font-medium">Latency:</span>
                              <span className={`font-mono font-semibold ${d.latency_ms > 1000 ? 'text-amber-600' : 'text-slate-700'}`}>
                                {d.latency_ms} ms
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke={telemetryMeta?.is_recovered ? '#10b981' : '#e11d48'}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#actualGrad)"
                  />
                  <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Live Telemetry KPI Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-100 pt-3">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-500">Live Retry Rate</span>
                <div className="flex items-center space-x-1.5 font-bold font-mono text-sm">
                  <span className={telemetryMeta?.is_recovered ? 'text-emerald-600' : 'text-rose-600'}>
                    {telemetryMeta?.current_retry_rate ?? 4.2}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">vs {telemetryMeta?.baseline_rate ?? 4.2}% base</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-500">Processing Latency</span>
                <div className="font-bold font-mono text-sm text-slate-800">
                  {telemetryMeta?.current_latency_ms ? `${telemetryMeta.current_latency_ms.toLocaleString()} ms` : '220 ms'}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-500">Telemetry Status</span>
                <div className="flex items-center space-x-1">
                  {telemetryMeta?.is_recovered ? (
                    <span className="inline-flex items-center text-emerald-700 font-semibold text-xs gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Resolved Baseline
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-rose-600 font-semibold text-xs gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500"></span> Friction Surge
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5 text-right sm:text-right">
                <span className="text-[11px] text-slate-500">Variance Delta</span>
                <div className="font-bold font-mono text-xs">
                  {telemetryMeta?.spike_percentage > 0 ? (
                    <span className="text-rose-600">+{telemetryMeta.spike_percentage}% surge</span>
                  ) : (
                    <span className="text-emerald-600">{telemetryMeta?.spike_percentage ?? 0}% (healthy)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* NLP Topic Clustering (1 col) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Complaint Topic Clusters</h3>
                <p className="text-xs text-slate-500 mt-0.5">Semantic grouping of unstructured feedback</p>
              </div>
              <MessageSquare className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {clusters.map((c) => (
                <div key={c.cluster_id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-900">{c.topic}</span>
                    <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {c.item_count} records
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.top_keywords.map((kw, i) => (
                      <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-mono">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Cross-Channel Evidence Correlation Graph */}
      {activeTab === 'correlation' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Cross-Channel Evidence Correlation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Verified causal links connecting telemetry, gateway logs, releases, and customer exposure</p>
              </div>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700 font-semibold border border-slate-200">
              {graphData.nodes?.length || 0} Correlated Entities
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {graphData.nodes && graphData.nodes.map((node: any, idx: number) => (
              <div
                key={node.id}
                className={`p-4 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  node.id === 'node_incident' ? 'bg-blue-50/50 border-blue-400 shadow-sm' :
                  node.id === 'node_signal' ? 'bg-rose-50/40 border-rose-200' :
                  node.id === 'node_gateway' ? 'bg-amber-50/40 border-amber-200' :
                  'bg-white border-slate-200/80'
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {node.data?.type || 'Graph Node'}
                  </span>
                  <span className="font-semibold text-slate-900 block text-xs leading-snug">
                    {node.data?.label}
                  </span>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between font-medium">
                  <span>Stage #{idx + 1}</span>
                  <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                    Correlated <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 text-xs text-slate-600 mt-4 leading-relaxed">
            <span className="font-semibold text-slate-900 block mb-1">Causal Inference Summary</span>
            Autonomous correlation engine matched checkout session latency spikes with downstream gateway timeout spikes (HTTP 504) starting at 14:15, confirming the issue originates beyond local web servers and specifically in the payment routing cluster.
          </div>
        </div>
      )}

      {/* TAB 3: Dynamic Adaptation Lab */}
      {activeTab === 'adaptation' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Dynamic Adaptation Lab</h3>
                <p className="text-xs text-slate-500 mt-0.5">Inject diagnostic telemetry to evaluate real-time hypothesis reassessment</p>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-lg text-[11px] font-medium text-slate-600">
              <span className="text-[10px] uppercase font-semibold text-slate-400 px-1">Presets:</span>
              <button
                onClick={() => applyPreset('alpha_outage')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm transition-colors"
              >
                Alpha Outage
              </button>
              <button
                onClick={() => applyPreset('upi_sdk')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm transition-colors"
              >
                UPI SDK Defect
              </button>
              <button
                onClick={() => applyPreset('replica_lag')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm transition-colors"
              >
                DB Replica Lag
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Injection Form */}
            <form onSubmit={handleInjectEvidence} className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Submit Diagnostic Telemetry</h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Source Type</label>
                  <select
                    value={injectionType}
                    onChange={(e) => setInjectionType(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none font-medium shadow-sm"
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
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none font-mono shadow-sm"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="text-slate-600 block mb-1 font-medium">Evidence Title</label>
                <input
                  type="text"
                  value={injectionTitle}
                  onChange={(e) => setInjectionTitle(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none shadow-sm"
                />
              </div>

              <div className="text-xs">
                <label className="text-slate-600 block mb-1 font-medium">Diagnostic Details</label>
                <textarea
                  rows={3}
                  value={injectionLog}
                  onChange={(e) => setInjectionLog(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none font-mono text-[11px] shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isInjecting || !selectedIncidentId}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isInjecting ? 'Evaluating Evidence...' : 'Inject Evidence & Reassess'}</span>
              </button>
            </form>

            {/* Adaptation Result & Historical Traceability */}
            <div className="space-y-3">
              {adaptationResult ? (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 shadow-sm">
                  <div className="flex items-center space-x-2 text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold">Investigation Revision V{adaptationResult.version} Active</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{adaptationResult.delta_explanation}</p>
                  <div className="pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 block uppercase font-bold text-[10px] mb-1">Updated Recommended Strategy</span>
                    <span className="font-semibold text-slate-900">{adaptationResult.revised_recommended_action?.title}</span>
                    <span className="ml-2 font-bold text-blue-700 font-mono">
                      Score: {adaptationResult.revised_recommended_action?.decision_score}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-500">
                  <div className="flex items-center space-x-2 mb-1 text-slate-700 font-semibold">
                    <History className="w-4 h-4 text-slate-500" />
                    <span>Revision Audit Trail</span>
                  </div>
                  <p>No new evidence submitted in this session. Submit diagnostic logs on the left or select a preset to trigger real-time hypothesis reassessment.</p>
                </div>
              )}

              {/* Previous versions audit trail */}
              {history.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block">Revision History ({history.length})</span>
                  {history.map((h) => (
                    <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-medium">
                        <span className="text-slate-900 font-bold font-mono">Version {h.version}</span>
                        <span>{new Date(h.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-600 line-clamp-2 leading-relaxed">{h.delta_explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
