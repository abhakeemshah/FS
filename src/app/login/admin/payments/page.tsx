'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminShell } from '../../../../components/admin-shell';
import {
  MANUAL_PAYMENTS_STORAGE_KEY,
  getNextPaymentSequence,
  readStoredArray,
  writeStoredArray,
} from '../../../../lib/ledger-store';

type PaymentDirection = 'Incoming' | 'Outgoing';

type PaymentDraft = {
  title: string;
  party: string;
  direction: PaymentDirection;
  amount: string;
  date: string;
  time: string;
  notes: string;
};

type PaymentRecord = {
  paymentNumber: string;
  title: string;
  party: string;
  direction: PaymentDirection;
  amount: number;
  date: string;
  time: string;
  notes: string;
  createdAt: string;
};

const formatDateInputValue = (value: Date) => value.toISOString().slice(0, 10);

const formatTimeInputValue = (value: Date) => value.toTimeString().slice(0, 5);

const createBlankDraft = (): PaymentDraft => {
  const now = new Date();

  return {
    title: '',
    party: '',
    direction: 'Incoming',
    amount: '',
    date: formatDateInputValue(now),
    time: formatTimeInputValue(now),
    notes: '',
  };
};

const createPaymentRecord = (draft: PaymentDraft, sequenceNumber: number): PaymentRecord => ({
  paymentNumber: `PAY-${String(sequenceNumber).padStart(3, '0')}`,
  title: draft.title.trim(),
  party: draft.party.trim(),
  direction: draft.direction,
  amount: Number(draft.amount),
  date: draft.date,
  time: draft.time,
  notes: draft.notes.trim(),
  createdAt: `${draft.date}T${draft.time}:00.000Z`,
});

export default function AdminPaymentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<'opening' | 'open' | 'closing' | null>(null);
  const [draft, setDraft] = useState<PaymentDraft>(createBlankDraft());
  const [error, setError] = useState('');

  const openModal = () => {
    setError('');
    setDraft(createBlankDraft());
    setIsModalOpen(true);
    setModalPhase('opening');
  };

  const closeModal = () => {
    if (!isModalOpen || modalPhase === 'closing' || modalPhase === null) return;
    setModalPhase('closing');
    setError('');
  };

  useEffect(() => {
    if (modalPhase !== 'opening') return;

    const timer = window.setTimeout(() => setModalPhase('open'), 16);
    return () => window.clearTimeout(timer);
  }, [modalPhase]);

  useEffect(() => {
    if (modalPhase !== 'closing') return;

    const timer = window.setTimeout(() => {
      setIsModalOpen(false);
      setModalPhase(null);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [modalPhase]);

  useEffect(() => {
    if (!isModalOpen || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  const savePayment = () => {
    setError('');

    if (!draft.title.trim()) {
      setError('Payment title is required.');
      return;
    }

    if (!draft.party.trim()) {
      setError('Party name is required.');
      return;
    }

    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }

    const existingManualPayments = readStoredArray<PaymentRecord>(MANUAL_PAYMENTS_STORAGE_KEY);
    const payment = createPaymentRecord(draft, getNextPaymentSequence(existingManualPayments));
    writeStoredArray(MANUAL_PAYMENTS_STORAGE_KEY, [payment, ...existingManualPayments]);
    closeModal();
  };

  return (
    <AdminShell active="payments" title="Payments">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Payments Ledger</h2>
            <p className="text-xs text-slate-500">Use this page to add a payment entry. Existing payment records are hidden here.</p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95"
          >
            New Payment
          </button>
        </div>

        <div className="px-4 py-10 text-center">
          <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8">
            <p className="text-sm font-semibold text-slate-700">No payment entries are shown on this screen.</p>
            <p className="mt-1 text-xs text-slate-500">Use New Payment to add one when needed.</p>
          </div>
        </div>
      </section>

      {isModalOpen && modalPhase && typeof document !== 'undefined' && createPortal(
        <div className={`app-modal-overlay payments-modal-overlay sales-new-sale-overlay fixed inset-0 z-[99999] grid place-items-center px-4 transition-opacity duration-200 ease-out ${modalPhase === 'closing' ? 'opacity-0' : 'opacity-100'}`} style={{ zIndex: 2147483647 }} onClick={closeModal}>
          <div className={`app-modal-card payments-modal-card sales-new-sale-card w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-300 shadow-2xl transition-all duration-200 ease-out ${modalPhase === 'opening' ? 'translate-y-4 scale-[0.96] opacity-0' : modalPhase === 'closing' ? 'translate-y-3 scale-[0.97] opacity-0' : 'translate-y-0 scale-100 opacity-100'}`} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-sm font-extrabold tracking-tight text-slate-900">Add Payment</h3>
                <p className="text-[11px] font-medium text-slate-500">Add an incoming or outgoing payment manually.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg border border-rose-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-200 active:translate-y-0 active:scale-95">Close</button>
            </div>

            <div className="max-h-[calc(90vh-120px)] overflow-y-auto bg-white p-4">
              <div className="space-y-4">
                <div className="space-y-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Payment Details</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Title</span>
                      <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Payment title" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Party</span>
                      <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={draft.party} onChange={(event) => setDraft((current) => ({ ...current, party: event.target.value }))} placeholder="Customer or supplier name" />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Direction</span>
                      <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={draft.direction} onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value as PaymentDirection }))}>
                        <option>Incoming</option>
                        <option>Outgoing</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Amount</span>
                      <input type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Date</span>
                      <input type="date" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Time</span>
                      <input type="time" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} />
                    </label>
                  </div>
                  <label className="space-y-1 block">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
                    <textarea className="min-h-[92px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes" />
                  </label>
                  {error ? <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div> : null}
                </div>
              </div>

              <div className="modal-footer-surface sticky bottom-0 border-t border-slate-200 px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-[11px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-200 active:translate-y-0 active:scale-95">Cancel</button>
                  <button type="button" onClick={savePayment} className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-[11px] font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-blue-700 active:translate-y-0 active:scale-95">Save Payment</button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </AdminShell>
  );
}
