'use client';

import '../lib/disable-local-storage';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { APP_ACTION_SUCCESS_EVENT, type AppActionSuccessDetail } from '../lib/app-feedback';

type AppFeedbackContextValue = {
	startLoading: (label?: string) => void;
	stopLoading: () => void;
	showSuccess: (message: string) => void;
	withLoading: <T>(task: () => Promise<T> | T, options?: { loadingLabel?: string; successMessage?: string }) => Promise<T>;
};

const AppFeedbackContext = createContext<AppFeedbackContextValue | null>(null);

const successLabels: Record<string, string> = {
	'fs-communication:products': 'Products saved',
	'fs-communication:product-categories': 'Categories saved',
	'fs-communication:product-lists': 'Lists saved',
	'fs-communication:selected-list': 'List selection saved',
	'fs-communication:landing-hero': 'Landing hero saved',
	'fs-communication:landing-section-visibility': 'Landing visibility saved',
	'fs-communication:hidden-categories': 'Category visibility saved',
	'fs-communication:dashboard-metrics': 'Dashboard saved',
	'fs-communication:sales-bills': 'Sales saved',
	'fs-communication:purchases': 'Purchases saved',
	'fs-communication:manual-payments': 'Payments saved',
	'fs-communication:staff-accounts': 'Staff saved',
	'fs-communication:staff-session': 'Staff session updated',
	'fs-communication:admin-session': 'Admin session updated',
	'fs-communication:staff-access-meta': 'Staff access saved',
	'fs-communication:admin-settings': 'Settings saved',
	'admin-sidebar-collapsed': 'Layout saved',
	'landing-language': 'Language saved',
};

function getSuccessMessage(storageKey: string) {
	return successLabels[storageKey] ?? 'Saved successfully';
}

export function AppFeedbackProvider({ children }: { children: ReactNode }) {
	const [loadingCount, setLoadingCount] = useState(0);
	const [loadingLabel, setLoadingLabel] = useState('Working...');
	const [toastMessage, setToastMessage] = useState('');
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = (message: string) => {
		if (toastTimerRef.current) {
			clearTimeout(toastTimerRef.current);
		}

		setToastMessage(message);
		toastTimerRef.current = setTimeout(() => {
			setToastMessage('');
			toastTimerRef.current = null;
		}, 1000);
	};

	useEffect(() => {
		const handleSuccess = (event: Event) => {
			const detail = (event as CustomEvent<AppActionSuccessDetail>).detail;
			if (!detail?.storageKey) return;
			showToast(getSuccessMessage(detail.storageKey));
		};

		window.addEventListener(APP_ACTION_SUCCESS_EVENT, handleSuccess);
		return () => window.removeEventListener(APP_ACTION_SUCCESS_EVENT, handleSuccess);
	}, []);

	useEffect(() => {
		return () => {
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		};
	}, []);

	const contextValue = useMemo<AppFeedbackContextValue>(
		() => ({
			startLoading: (label = 'Working...') => {
				setLoadingLabel(label);
				setLoadingCount((current) => current + 1);
			},
			stopLoading: () => {
				setLoadingCount((current) => Math.max(0, current - 1));
			},
			showSuccess: showToast,
			withLoading: async <T,>(task: () => Promise<T> | T, options?: { loadingLabel?: string; successMessage?: string }) => {
				setLoadingLabel(options?.loadingLabel ?? 'Working...');
				setLoadingCount((current) => current + 1);
				try {
					const result = await task();
					showToast(options?.successMessage ?? 'Success');
					return result;
				} finally {
					setLoadingCount((current) => Math.max(0, current - 1));
				}
			},
		}),
		[],
	);

	return (
		<AppFeedbackContext.Provider value={contextValue}>
			{children}
			{loadingCount > 0 ? (
				<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
					<div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl">
						<span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
						<div>
							<div className="text-sm font-semibold text-slate-900">{loadingLabel}</div>
							<div className="text-xs text-slate-500">Please wait...</div>
						</div>
					</div>
				</div>
			) : null}
			{toastMessage ? (
				<div className="fixed left-1/2 top-4 z-[80] -translate-x-1/2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-lg animate-[toastDrop_1s_ease-out]">
					{toastMessage}
				</div>
			) : null}
		</AppFeedbackContext.Provider>
	);
}

export function useAppFeedback() {
	const context = useContext(AppFeedbackContext);

	if (!context) {
		throw new Error('useAppFeedback must be used within AppFeedbackProvider');
	}

	return context;
}
