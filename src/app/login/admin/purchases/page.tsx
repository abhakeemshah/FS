'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readStaffSession, hasAdminSession, canCurrentStaffAccessModule } from '../../../../lib/staff-auth';
import { AdminShell } from '../../../../components/admin-shell';
import { AppModal } from '../../../../components/app-modal';
import { PURCHASES_STORAGE_KEY, readStoredArray, writeStoredArray } from '../../../../lib/ledger-store';
import { paymentMethodOptions, buildPrintablePurchaseInvoice } from '../../../../lib/sales-utils';

const parseSnapshotArray = <T,>(snapshot: Record<string, string>, key: string): T[] => {
    try {
        const raw = snapshot[key];
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
};

const purchaseStatusOptions = ['Pending', 'Received', 'Partially Received', 'Cancelled'];

type PurchaseLineItem = {
    product: string;
    boxes: number;
    piecesPerBox: number;
    loosePieces: number;
    unitCost: number;
    totalUnits: number;
    lineTotal: number;
};

type PurchaseRecord = {
    purchaseNumber: string;
    createdAt: string;
    supplierName: string;
    sourceName: string;
    purchaseReference: string;
    purchaseDate: string;
    purchaseTime: string;
    paymentMethod: string;
    status: string;
    transportCost: number;
    notes: string;
    items: PurchaseLineItem[];
    subtotal: number;
    totalUnits: number;
    total: number;
    recordedBy?: string;
};

type DraftLineItem = {
    product: string;
    boxes: string;
    piecesPerBox: string;
    loosePieces: string;
    unitCost: string;
};

type PurchaseForm = {
    supplierName: string;
    sourceName: string;
    purchaseReference: string;
    purchaseDate: string;
    purchaseTime: string;
    paymentMethod: string;
    status: string;
    transportCost: string;
    notes: string;
    draftLineItem: DraftLineItem;
    lineItems: DraftLineItem[];
};

const createBlankLineItem = (): DraftLineItem => ({
    product: '',
    boxes: '',
    piecesPerBox: '',
    loosePieces: '',
    unitCost: '',
});

const createBlankForm = (): PurchaseForm => {
    const now = new Date();
    return {
        supplierName: '',
        sourceName: '',
        purchaseReference: '',
        purchaseDate: now.toISOString().slice(0, 10),
        purchaseTime: now.toTimeString().slice(0, 5),
        paymentMethod: paymentMethodOptions[0],
        status: 'Pending',
        transportCost: '',
        notes: '',
        draftLineItem: createBlankLineItem(),
        lineItems: [],
    };
};

const formatMoney = (value: number) => value.toFixed(2);

const formatDate = (value: string) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
};

const formatTime = (value: string) => value || '—';

type PurchaseDropdownProps = {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    placeholder: string;
    buttonClassName?: string;
    menuClassName?: string;
};

function PurchaseDropdown({ value, options, onChange, placeholder, buttonClassName = '', menuClassName = '' }: PurchaseDropdownProps) {
    const [open, setOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedValue = value || placeholder;

    const cancelClose = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const scheduleClose = () => {
        cancelClose();
        closeTimerRef.current = setTimeout(() => {
            setOpen(false);
            closeTimerRef.current = null;
        }, 120);
    };

    return (
        <div className="relative" onMouseEnter={() => { cancelClose(); setOpen(true); }} onMouseLeave={scheduleClose}>
            <button
                type="button"
                onClick={() => {
                    cancelClose();
                    setOpen((current) => !current);
                }}
                className={buttonClassName}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="truncate">{selectedValue}</span>
                <span className="pointer-events-none text-slate-500">{open ? '▴' : '▾'}</span>
            </button>
            {open ? (
                <div
                                className={`absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.14)] ${menuClassName}`}
                    role="listbox"
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                >
                    {options.map((option) => {
                        const isSelected = option === value;
                        return (
                            <button
                                key={option}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                    cancelClose();
                                    onChange(option);
                                    setOpen(false);
                                }}
                                className={`w-full px-2.5 py-1.5 text-left text-[12px] leading-4 transition-colors ${isSelected ? 'bg-blue-600 font-semibold text-white' : 'text-slate-700 hover:bg-blue-50'}`}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

const normalizePurchase = (purchase: Partial<PurchaseRecord>, index: number): PurchaseRecord => {
    const items = Array.isArray(purchase.items) ? purchase.items : [];
    const totalUnits = items.reduce((sum, item) => sum + (Number(item.totalUnits) || 0), 0);
    const subtotal = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const transportCost = Number(purchase.transportCost) || 0;
    const fallbackDate = purchase.purchaseDate || new Date().toISOString().slice(0, 10);
    const fallbackTime = purchase.purchaseTime || '00:00';

    return {
        purchaseNumber: purchase.purchaseNumber || `PUR-${index + 1}`,
        createdAt: purchase.createdAt || `${fallbackDate}T${fallbackTime}:00`,
        supplierName: purchase.supplierName || 'Supplier',
        sourceName: purchase.sourceName || 'Direct',
        purchaseReference: purchase.purchaseReference || '',
        purchaseDate: fallbackDate,
        purchaseTime: fallbackTime,
        paymentMethod: purchase.paymentMethod || paymentMethodOptions[0],
        status: purchase.status || 'Pending',
        transportCost,
        notes: purchase.notes || '',
        items,
        subtotal,
        totalUnits,
        total: Number.isFinite(Number(purchase.total)) ? Number(purchase.total) : subtotal + transportCost,
    };
};

export default function AdminPurchasesPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [activePurchase, setActivePurchase] = useState<PurchaseRecord | null>(null);
    const [viewPurchase, setViewPurchase] = useState<PurchaseRecord | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PurchaseRecord | null>(null);
    const [form, setForm] = useState<PurchaseForm>(createBlankForm());
    const [error, setError] = useState('');
    const feedbackReadyRef = useRef(false);

    useEffect(() => {
        const staff = readStaffSession();
        if (!staff && !hasAdminSession()) {
            router.push('/login');
        }
    }, [router]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const canEdit = mounted && (hasAdminSession() || canCurrentStaffAccessModule('purchases', 'edit'));

    useEffect(() => {
        if (!mounted) return;

        const loadFromServer = async () => {
            try {
                const response = await fetch('/api/ledger-state', { cache: 'no-store', credentials: 'include' });
                if (!response.ok) return;
                const payload = (await response.json()) as { snapshot?: Record<string, string> };
                const stored = parseSnapshotArray<Partial<PurchaseRecord>>(payload.snapshot ?? {}, PURCHASES_STORAGE_KEY);
                const normalized = stored.map((purchase, index) => normalizePurchase(purchase, index));
                setPurchases(normalized);
                setIsHydrated(true);
            } catch {
                // keep current state if the server snapshot is unavailable
            }
        };

        void loadFromServer();
    }, [mounted]);

    useEffect(() => {
        if (!isHydrated) return;
        writeStoredArray(PURCHASES_STORAGE_KEY, purchases, { silent: !feedbackReadyRef.current });
    }, [purchases, isHydrated]);

    useEffect(() => {
        feedbackReadyRef.current = true;
    }, []);

    useEffect(() => {
        if ((!isModalOpen && !viewPurchase && !deleteTarget) || typeof document === 'undefined') return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isModalOpen, viewPurchase, deleteTarget]);

    const draftLineItem = form.draftLineItem;

    const updateDraftLineItem = (key: keyof DraftLineItem, value: string) => {
        setForm((current) => ({
            ...current,
            draftLineItem: { ...current.draftLineItem, [key]: value },
        }));
    };

    const addLineItem = () => {
        setError('');
        const product = draftLineItem.product.trim();
        const boxes = Number(draftLineItem.boxes);
        const piecesPerBox = Number(draftLineItem.piecesPerBox);
        const loosePieces = Number(draftLineItem.loosePieces);
        const unitCost = Number(draftLineItem.unitCost);
        const totalUnits = boxes * piecesPerBox + loosePieces;
        const lineTotal = totalUnits * unitCost;

        if (!product) {
            setError('Product name is required.');
            return;
        }
        if (!Number.isFinite(boxes) || boxes < 0 || !Number.isFinite(piecesPerBox) || piecesPerBox < 0 || !Number.isFinite(loosePieces) || loosePieces < 0) {
            setError('Boxes, pieces per box, and loose pieces must be valid numbers.');
            return;
        }
        if (!Number.isFinite(unitCost) || unitCost < 0) {
            setError('Unit cost must be a valid number.');
            return;
        }

        setForm((current) => ({
            ...current,
            lineItems: [
                ...current.lineItems,
                { product, boxes: String(boxes), piecesPerBox: String(piecesPerBox), loosePieces: String(loosePieces), unitCost: String(unitCost) },
            ],
            draftLineItem: createBlankLineItem(),
        }));
    };

    const removeLineItem = (index: number) => {
        setForm((current) => ({
            ...current,
            lineItems: current.lineItems.filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const openNewPurchase = () => {
        setError('');
        setActivePurchase(null);
        setForm(createBlankForm());
        setIsModalOpen(true);
    };

    const openViewPurchase = (purchase: PurchaseRecord) => {
        setError('');
        setViewPurchase(purchase);
    };

    const closeViewPurchase = () => {
        setViewPurchase(null);
    };

    const askDeletePurchase = (purchase: PurchaseRecord) => {
        setDeleteTarget(purchase);
    };

    const cancelDeletePurchase = () => {
        setDeleteTarget(null);
    };

    const confirmDeletePurchase = () => {
        if (!deleteTarget) return;
        setPurchases((current) => current.filter((p) => p.purchaseNumber !== deleteTarget.purchaseNumber));
        setDeleteTarget(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActivePurchase(null);
        setError('');
    };

    const exportPurchase = (purchase: PurchaseRecord) => {
        const html = buildPrintablePurchaseInvoice({
            purchaseNumber: purchase.purchaseNumber,
            createdAt: purchase.createdAt,
            purchaseDate: purchase.purchaseDate,
            purchaseTime: purchase.purchaseTime,
            supplierName: purchase.supplierName,
            sourceName: purchase.sourceName,
            purchaseReference: purchase.purchaseReference,
            paymentMethod: purchase.paymentMethod,
            status: purchase.status,
            transportCost: purchase.transportCost,
            notes: purchase.notes,
            items: purchase.items,
            subtotal: purchase.subtotal,
            totalUnits: purchase.totalUnits,
            total: purchase.total,
            recordedBy: purchase.recordedBy,
        });
        setPreviewHtml(html);
        setIsPreviewOpen(true);
    };

    const savePurchase = () => {
        setError('');

        if (!form.supplierName.trim()) {
            setError('Supplier name is required.');
            return;
        }

        if (!form.lineItems.length) {
            setError('Add at least one line item.');
            return;
        }

        const items = form.lineItems.map((item) => {
            const boxes = Number(item.boxes) || 0;
            const piecesPerBox = Number(item.piecesPerBox) || 0;
            const loosePieces = Number(item.loosePieces) || 0;
            const unitCost = Number(item.unitCost) || 0;
            const totalUnits = boxes * piecesPerBox + loosePieces;
            const lineTotal = totalUnits * unitCost;
            return {
                product: item.product.trim(),
                boxes,
                piecesPerBox,
                loosePieces,
                unitCost,
                totalUnits,
                lineTotal,
            };
        });

        const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        const totalUnits = items.reduce((sum, item) => sum + item.totalUnits, 0);
        const transportCost = Number(form.transportCost) || 0;
        const purchaseDate = form.purchaseDate || new Date().toISOString().slice(0, 10);
        const purchaseTime = form.purchaseTime || '00:00';

        if (activePurchase) {
            // Edit mode: update existing purchase
            const record: PurchaseRecord = {
                purchaseNumber: activePurchase.purchaseNumber,
                createdAt: activePurchase.createdAt,
                supplierName: form.supplierName.trim(),
                sourceName: form.sourceName.trim() || 'Direct',
                purchaseReference: form.purchaseReference.trim(),
                purchaseDate,
                purchaseTime,
                paymentMethod: form.paymentMethod,
                status: form.status.trim() || 'Pending',
                transportCost,
                notes: form.notes.trim(),
                items,
                subtotal,
                totalUnits,
                total: subtotal + transportCost,
                recordedBy: activePurchase.recordedBy,
            };
            setPurchases((current) => current.map((p) => p.purchaseNumber === activePurchase.purchaseNumber ? record : p));
        } else {
            // Create mode: add new purchase
            const record: PurchaseRecord = {
                purchaseNumber: `PUR-${Date.now()}`,
                createdAt: `${purchaseDate}T${purchaseTime}:00`,
                supplierName: form.supplierName.trim(),
                sourceName: form.sourceName.trim() || 'Direct',
                purchaseReference: form.purchaseReference.trim(),
                purchaseDate,
                purchaseTime,
                paymentMethod: form.paymentMethod,
                status: form.status.trim() || 'Pending',
                transportCost,
                notes: form.notes.trim(),
                items,
                subtotal,
                totalUnits,
                total: subtotal + transportCost,
                recordedBy: readStaffSession()?.name || (hasAdminSession() ? 'Administrator' : 'Unknown'),
            };
            setPurchases((current) => [record, ...current]);
        }
        closeModal();
    };

    return (
        <AdminShell active="purchases" title="Purchases">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Purchases</h2>
                        <p className="text-xs text-slate-500">Create a purchase, keep it in the list, and match the sales layout.</p>
                    </div>
                    {canEdit ? (
                        <button type="button" onClick={openNewPurchase} className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95">
                            New Purchase
                        </button>
                    ) : null}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Purchase</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Supplier</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Items</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Total</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!mounted ? (
                                <tr>
                                    <td className="px-4 py-4 text-slate-500" colSpan={5}>No purchases yet.</td>
                                </tr>
                            ) : purchases.length ? purchases.map((purchase) => (
                                <tr key={purchase.purchaseNumber} className="transition-colors hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-900">{purchase.purchaseNumber}</div>
                                        <div className="text-[11px] text-slate-500">{formatDate(purchase.purchaseDate)} · {formatTime(purchase.purchaseTime)}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-700">{purchase.supplierName}</div>
                                        <div className="text-[11px] text-slate-500">{purchase.sourceName || 'Direct'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">{purchase.items.length} item{purchase.items.length === 1 ? '' : 's'}</td>
                                    <td className="px-4 py-3 font-bold text-slate-900">{formatMoney(purchase.total)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {canEdit ? (
                                                <>
                                                    <button type="button" onClick={() => askDeletePurchase(purchase)} className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-rose-100 active:translate-y-0 active:scale-95">Delete</button>
                                                </>
                                            ) : null}
                                            <button type="button" onClick={() => { setActivePurchase(purchase); exportPurchase(purchase); }} className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-blue-700 active:translate-y-0 active:scale-95">Export</button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td className="px-4 py-4 text-slate-500" colSpan={5}>No purchases yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {mounted && isModalOpen ? (
                <AppModal
                    open={isModalOpen}
                    onClose={closeModal}
                    overlayClassName="items-start"
                    cardClassName={`purchase-new-purchase-card flex max-h-[calc(100dvh-2rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-300 shadow-2xl transition-all duration-200 ease-out sm:max-h-[92vh] ${
                        'translate-y-0 scale-100 opacity-100'
                    }`}
                >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">{activePurchase ? 'Purchase view' : 'New purchase'}</p>
                            <h3 className="text-sm font-extrabold tracking-tight text-slate-900">{activePurchase ? activePurchase.purchaseNumber : 'Create Purchase'}</h3>
                            <p className="text-[11px] text-slate-500">Sales-inspired purchase entry with grouped sections.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {activePurchase ? (
                                <button type="button" onClick={() => exportPurchase(activePurchase)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-50 active:translate-y-0 active:scale-95">Export</button>
                            ) : null}
                            <button type="button" onClick={closeModal} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-rose-100 active:translate-y-0 active:scale-95">
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white p-3 sm:p-4">
                        {activePurchase ? (
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">Supplier Details</p>
                                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                                            <div className="font-semibold text-slate-900">{activePurchase.supplierName}</div>
                                            <div>{activePurchase.sourceName || 'Direct'}</div>
                                            <div>{activePurchase.purchaseReference || 'No reference'}</div>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">Purchase Meta</p>
                                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                                            <div>{formatDate(activePurchase.purchaseDate)} · {formatTime(activePurchase.purchaseTime)}</div>
                                            <div>{activePurchase.paymentMethod}</div>
                                            <div>{activePurchase.status || 'Pending'}</div>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">Totals</p>
                                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                                            <div>{activePurchase.items.length} item{activePurchase.items.length === 1 ? '' : 's'}</div>
                                            <div>{activePurchase.totalUnits} units</div>
                                            <div className="text-base font-extrabold text-slate-900">{formatMoney(activePurchase.total)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-sm">
                                    <table className="w-full text-xs">
                                        <thead className="border-b border-slate-200 bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-600">Product</th>
                                                <th className="px-3 py-2 text-center font-bold uppercase tracking-wide text-slate-600">Units</th>
                                                <th className="px-3 py-2 text-right font-bold uppercase tracking-wide text-slate-600">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {activePurchase.items.length ? activePurchase.items.map((item, index) => (
                                                <tr key={`${activePurchase.purchaseNumber}-${index}`}>
                                                    <td className="px-3 py-2 font-medium text-slate-900">{item.product}</td>
                                                    <td className="px-3 py-2 text-center text-slate-700">{item.totalUnits}</td>
                                                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(item.lineTotal)}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td className="px-3 py-3 text-slate-500" colSpan={3}>No line items saved for this record.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div> : null}

                                <div className="space-y-2 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm">
                                    <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">Supplier Details</h4>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        <input value={form.supplierName} onChange={(e) => setForm((current) => ({ ...current, supplierName: e.target.value }))} placeholder="Supplier Name" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        <input value={form.sourceName} onChange={(e) => setForm((current) => ({ ...current, sourceName: e.target.value }))} placeholder="Source Name" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        <input value={form.purchaseReference} onChange={(e) => setForm((current) => ({ ...current, purchaseReference: e.target.value }))} placeholder="Reference Number" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        <input type="date" value={form.purchaseDate} onChange={(e) => setForm((current) => ({ ...current, purchaseDate: e.target.value }))} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        <input type="time" value={form.purchaseTime} onChange={(e) => setForm((current) => ({ ...current, purchaseTime: e.target.value }))} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        <PurchaseDropdown
                                            value={form.paymentMethod}
                                            options={paymentMethodOptions}
                                            onChange={(paymentMethod) => setForm((current) => ({ ...current, paymentMethod }))}
                                            placeholder="Payment Method"
                                            buttonClassName="flex h-10 w-full items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3 text-left text-[13px] font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow focus:border-blue-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                                        />
                                        <PurchaseDropdown
                                            value={form.status}
                                            options={purchaseStatusOptions}
                                            onChange={(status) => setForm((current) => ({ ...current, status }))}
                                            placeholder="Status"
                                            buttonClassName="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-left text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 hover:border-blue-300 hover:shadow focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                                            menuClassName="max-h-56 overflow-auto"
                                        />
                                        <input value={form.transportCost} onChange={(e) => setForm((current) => ({ ...current, transportCost: e.target.value }))} placeholder="Transport Cost" className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                    </div>
                                </div>

                                <div className="space-y-2 rounded-2xl border border-slate-300 bg-blue-50/60 p-4 shadow-sm">
                                    <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">Products</h4>
                                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-white p-3">
                                        <div className="min-w-0 flex-1">
                                            <input value={draftLineItem.product} onChange={(e) => updateDraftLineItem('product', e.target.value)} placeholder="Product" className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        </div>
                                        <input value={draftLineItem.boxes} onChange={(e) => updateDraftLineItem('boxes', e.target.value)} placeholder="Boxes" className="h-10 w-20 min-w-[4.5rem] rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        <input value={draftLineItem.piecesPerBox} onChange={(e) => updateDraftLineItem('piecesPerBox', e.target.value)} placeholder="Pieces/Box" className="h-10 w-28 min-w-[6.5rem] rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        <input value={draftLineItem.loosePieces} onChange={(e) => updateDraftLineItem('loosePieces', e.target.value)} placeholder="Loose" className="h-10 w-24 min-w-[5.5rem] rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        <input value={draftLineItem.unitCost} onChange={(e) => updateDraftLineItem('unitCost', e.target.value)} placeholder="Unit Cost" className="h-10 w-28 min-w-[6.5rem] rounded-xl border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                                        {canEdit ? (
                                            <button type="button" onClick={addLineItem} className="h-10 rounded-xl border border-blue-600 bg-blue-600 px-3 text-[11px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-blue-700 active:translate-y-0 active:scale-95">Add</button>
                                        ) : null}
                                    </div>

                                    {form.lineItems.length > 0 ? (
                                        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-300 bg-white">
                                            {form.lineItems.map((item, idx) => (
                                                <div key={idx} className="flex flex-wrap items-center gap-2 px-3 py-3">
                                                    <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900">{item.product}</div>
                                                    <div className="w-20 min-w-[4.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">{item.boxes}</div>
                                                    <div className="w-28 min-w-[6.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">{item.piecesPerBox}</div>
                                                    <div className="w-24 min-w-[5.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">{item.loosePieces}</div>
                                                    <div className="w-28 min-w-[6.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">{item.unitCost}</div>
                                                    {canEdit ? (
                                                        <button type="button" onClick={() => removeLineItem(idx)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 active:translate-y-0 active:scale-95">Remove</button>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Subtotal</p>
                                            <p className="mt-1 text-base font-extrabold text-slate-900">{formatMoney(form.lineItems.reduce((sum, item) => {
                                                const boxes = Number(item.boxes) || 0;
                                                const piecesPerBox = Number(item.piecesPerBox) || 0;
                                                const loosePieces = Number(item.loosePieces) || 0;
                                                const unitCost = Number(item.unitCost) || 0;
                                                return sum + (boxes * piecesPerBox + loosePieces) * unitCost;
                                            }, 0))}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Transport</p>
                                            <p className="mt-1 text-base font-extrabold text-slate-900">{formatMoney(Number(form.transportCost) || 0)}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</p>
                                            <p className="mt-1 text-base font-extrabold text-slate-900">{formatMoney((form.lineItems.reduce((sum, item) => {
                                                const boxes = Number(item.boxes) || 0;
                                                const piecesPerBox = Number(item.piecesPerBox) || 0;
                                                const loosePieces = Number(item.loosePieces) || 0;
                                                const unitCost = Number(item.unitCost) || 0;
                                                return sum + (boxes * piecesPerBox + loosePieces) * unitCost;
                                            }, 0)) + (Number(form.transportCost) || 0))}</p>
                                        </div>
                                    </div>

                                    {error ? <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">{error}</div> : null}
                                </div>

                                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Notes" rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" />
                            </div>
                        )}
                    </div>

                    <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-sm sm:px-4">
                        <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[11px] font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 active:translate-y-0 active:scale-95">Cancel</button>
                        {canEdit && !activePurchase ? (
                            <button type="button" onClick={savePurchase} className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-blue-700 active:translate-y-0 active:scale-95">Save Purchase</button>
                        ) : null}
                    </div>
                </AppModal>
            ) : null}

            {isPreviewOpen && previewHtml ? (
                <AppModal open={isPreviewOpen} onClose={() => { setIsPreviewOpen(false); setPreviewHtml(null); }} cardClassName="w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Printable Preview</h3>
                            <p className="text-[11px] text-slate-500">Preview the printable layout. Use Print or Open in New Tab.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => {
                                const w = window.open('', '_blank');
                                if (!w) { setError('Popup blocked. Allow popups to open printable.'); return; }
                                w.document.open(); w.document.write(previewHtml); w.document.close(); w.focus();
                            }} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold">Open in New Tab</button>
                            <button type="button" onClick={() => {
                                if (!previewHtml) return;
                                const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `${activePurchase?.purchaseNumber || 'purchase'}.html`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(link.href);
                            }} className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Download</button>
                            <button type="button" onClick={() => { setIsPreviewOpen(false); setPreviewHtml(null); }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Close</button>
                        </div>
                    </div>
                    <div className="max-h-[calc(90vh-72px)] overflow-auto p-3 bg-white">
                        <iframe id="print-preview-iframe" title="Printable Preview" srcDoc={previewHtml} style={{ width: '100%', height: '70vh', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                    </div>
                </AppModal>
            ) : null}

            {viewPurchase ? (
                <AppModal open={Boolean(viewPurchase)} onClose={closeViewPurchase} cardClassName="w-full max-w-3xl max-h-[86vh] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Purchase View</h3>
                            <p className="text-[11px] text-slate-500">Read-only purchase details</p>
                        </div>
                        <button type="button" onClick={closeViewPurchase} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                            Close
                        </button>
                    </div>
                    <div className="max-h-[calc(86vh-72px)] space-y-4 overflow-y-auto p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Purchase #</div>
                                <div className="mt-1 text-sm font-bold text-slate-900">{viewPurchase.purchaseNumber}</div>
                                <div className="mt-1 text-xs text-slate-600">{formatDate(viewPurchase.purchaseDate)} · {formatTime(viewPurchase.purchaseTime)}</div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Supplier</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">{viewPurchase.supplierName}</div>
                                <div className="text-xs text-slate-600">{viewPurchase.sourceName}</div>
                                <div className="mt-1 text-xs text-slate-600">Payment: {viewPurchase.paymentMethod}</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Product</th>
                                        <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Qty</th>
                                        <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Cost</th>
                                        <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {viewPurchase.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2 text-slate-800">{item.product}</td>
                                            <td className="px-3 py-2 text-slate-700">{item.totalUnits}</td>
                                            <td className="px-3 py-2 text-slate-700">{formatMoney(item.unitCost)}</td>
                                            <td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(item.lineTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="ml-auto w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Subtotal</span>
                                <span className="font-semibold text-slate-900">{formatMoney(viewPurchase.subtotal)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                                <span className="text-slate-600">Transport</span>
                                <span className="font-semibold text-slate-900">{formatMoney(viewPurchase.transportCost)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                                <span className="font-bold text-slate-700">Total</span>
                                <span className="text-lg font-black text-slate-900">{formatMoney(viewPurchase.total)}</span>
                            </div>
                        </div>
                    </div>
                </AppModal>
            ) : null}

            {deleteTarget ? (
                <AppModal open={Boolean(deleteTarget)} onClose={cancelDeletePurchase} cardClassName="w-full max-w-sm">
                    <div className="p-4">
                        <h3 className="text-sm font-bold text-slate-900">Delete Purchase?</h3>
                        <p className="mt-1 text-xs text-slate-600">
                            Delete <span className="font-semibold text-slate-800">{deleteTarget.purchaseNumber}</span> from{' '}
                            <span className="font-semibold text-slate-800">{deleteTarget.supplierName}</span>?
                        </p>
                        <p className="mt-1 text-[11px] text-rose-700">This action cannot be undone.</p>
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button type="button" onClick={cancelDeletePurchase} className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                                Cancel
                            </button>
                            {canEdit ? (
                                <button type="button" onClick={confirmDeletePurchase} className="rounded-lg border border-rose-600 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                                    Delete
                                </button>
                            ) : null}
                        </div>
                    </div>
                </AppModal>
            ) : null}
        </AdminShell>
    );
}
