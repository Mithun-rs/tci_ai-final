import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface CustomerPortalProps {
  companyId: string;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ companyId }) => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('payment_failure');
  const [orderId, setOrderId] = useState('ord_ss_0042');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

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
      setTimeout(() => setSubmittedSuccess(false), 5000);
      loadComplaints();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Customer Support Portal</h2>
        <p className="text-xs text-slate-500 mt-1">
          Submit feedback, report checkout or payment disruptions, and monitor recovery progress.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Form */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Submit a Ticket</h3>
          </div>

          {submittedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Your feedback has been logged. Our operations team is investigating.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-600 block mb-1 font-medium">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-md px-3 py-2 outline-none font-medium"
              >
                <option value="payment_failure">Payment Failure / Deducted but Not Confirmed</option>
                <option value="checkout_loop">Checkout Freezing / Infinite Loading</option>
                <option value="delivery_delay">Delivery Partner Delay</option>
                <option value="refund_issue">Refund Processing Issue</option>
                <option value="app_defect">Mobile Application Error</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">Order Reference (Optional)</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. ord_ss_0042"
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-md px-3 py-2 outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">Subject / Summary</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Card charged twice during checkout timeout"
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-md px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">Detailed Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred, any error messages displayed, and steps taken..."
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-md px-3 py-2 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !title || !description}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
            </button>
          </form>
        </div>

        {/* Existing Complaints & Real-Time Tracking */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Ticket Status</h3>
            <span className="text-xs text-slate-500 font-medium">{complaints.length} tickets</span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {complaints.length === 0 ? (
              <p className="text-xs text-slate-500">No support tickets found for this workspace.</p>
            ) : (
              complaints.map((c) => (
                <div key={c.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500 uppercase">{c.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-200/80 text-slate-700">
                      {c.status.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-900">{c.title}</h4>
                  <p className="text-slate-600 text-xs line-clamp-2">{c.description}</p>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Category: {c.category}</span>
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
