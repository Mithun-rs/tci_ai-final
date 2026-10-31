import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  MessageSquare, Send, CheckCircle2, CreditCard, RefreshCw,
  Truck, Smartphone, Search, Clock, Check
} from 'lucide-react';

interface CustomerPortalProps {
  companyId: string;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ companyId }) => {
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('payment_failure');
  const [orderId, setOrderId] = useState('ord_ss_0042');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const categories = [
    { id: 'payment_failure', name: 'Payment Issue', desc: 'Deducted but not confirmed', icon: CreditCard },
    { id: 'checkout_loop', name: 'Checkout Freeze', desc: 'Loading spinner or freeze', icon: RefreshCw },
    { id: 'delivery_delay', name: 'Delivery SLA', desc: 'Late parcel arrival', icon: Truck },
    { id: 'app_defect', name: 'App Defect', desc: 'Crash or visual glitch', icon: Smartphone }
  ];

  const loadComplaints = async () => {
    try {
      const res = await api.getComplaints(companyId);
      setComplaints(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setIsSubmitting(true);
    try {
      await api.submitComplaint({
        company_id: companyId,
        customer_id: 'cust_customer_portal',
        order_id: orderId,
        category,
        title,
        description,
        priority: 'high'
      });
      setTitle('');
      setDescription('');
      setSubmittedSuccess(true);
      showToast('Support ticket logged successfully! Incident tracking enabled.');
      setTimeout(() => setSubmittedSuccess(false), 5000);
      loadComplaints();
    } catch (err) {
      console.error(err);
      showToast('Failed to submit ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredComplaints = complaints.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Customer Experience Support Portal</h2>
          <p className="text-xs text-slate-500 mt-1">
            Report payment or checkout disruptions. Our autonomous intelligence engine correlates submissions in real time.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Fast-Track SLA Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Submission Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-3">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Submit a Ticket</h3>
          </div>

          {submittedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Your ticket has been logged and correlated with active incident recovery.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Visual Category Picker */}
            <div>
              <label className="text-slate-700 block mb-2 font-semibold">Select Issue Category</label>
              <div className="grid grid-cols-2 gap-2.5">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/60 border-blue-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                        <span className="font-semibold text-slate-900 text-xs">{cat.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{cat.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-semibold">Order Reference (Optional)</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ord_ss_0042"
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-2 outline-none font-mono text-xs focus:border-blue-500 shadow-sm"
              />
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-semibold">Subject / Summary</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Card charged twice during checkout timeout"
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-2 outline-none text-xs focus:border-blue-500 shadow-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-semibold">Detailed Description</label>
                <span className="text-[10px] text-slate-400">{description.length}/500</span>
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred, any error messages displayed, and steps taken..."
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-2 outline-none text-xs focus:border-blue-500 shadow-sm leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !title || !description}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Logging Ticket...' : 'Submit Support Ticket'}</span>
            </button>
          </form>
        </div>

        {/* Existing Complaints & Real-Time Tracking */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ticket Tracking</h3>
            <span className="text-xs font-semibold text-slate-500 font-mono">{complaints.length} tickets</span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ticket ID or subject..."
              className="w-full bg-slate-50 text-slate-900 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 outline-none text-xs focus:bg-white transition-colors"
            />
          </div>

          {/* Ticket Stepper & List */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredComplaints.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No tickets found matching your query.</p>
            ) : (
              filteredComplaints.map((c, idx) => (
                <div key={c.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500 font-bold uppercase">{c.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      c.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-900 text-sm leading-snug">{c.title}</h4>
                  <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">{c.description}</p>

                  {/* 4-Step Resolution Progress Stepper */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="grid grid-cols-4 gap-1 text-[9px] font-semibold text-slate-500 text-center mb-1">
                      <span className="text-emerald-700">Received</span>
                      <span className="text-emerald-700">Correlated</span>
                      <span className="text-blue-700">Action Active</span>
                      <span className="text-slate-400">Resolved</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="h-1 bg-emerald-500 rounded-full"></div>
                      <div className="h-1 bg-emerald-500 rounded-full"></div>
                      <div className="h-1 bg-blue-500 rounded-full"></div>
                      <div className="h-1 bg-slate-200 rounded-full"></div>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Category: <span className="text-slate-600 font-medium">{c.category}</span></span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
