'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

type Props = {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	cardClassName?: string;
};

export function StaffConfirmModal({ open, onClose, children, cardClassName = '' }: Props) {
	if (!open || typeof document === 'undefined') return null;

	return createPortal(
		<>
			<style>{`
				.staff-confirm-overlay { background: rgba(0,0,0,0.36); }
				.staff-confirm-card { border-radius: 0.5rem; animation: staff-confirm-zoom 160ms cubic-bezier(.2,.8,.2,1); }
				@keyframes staff-confirm-zoom { from { opacity: 0; transform: translateY(-6px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
			`}</style>
			<div className={`staff-confirm-overlay fixed inset-0 z-[99999] flex items-center justify-center px-3 py-4`} onClick={onClose}>
				<div role="dialog" aria-modal="true" className={`staff-confirm-card w-full max-w-sm bg-white shadow-lg p-0 ${cardClassName}`} onClick={(e) => e.stopPropagation()}>
					{children}
				</div>
			</div>
		</>,
		document.body,
	);
}
