'use client';

import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

type AppModalProps = {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	overlayClassName?: string;
	cardClassName?: string;
	overlayStyle?: React.CSSProperties;
};

export function AppModal({ open, onClose, children, overlayClassName = '', cardClassName = '', overlayStyle }: AppModalProps) {
	if (!open || typeof document === 'undefined') return null;

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose]);

	return createPortal(
		<div
			className={`app-modal-overlay fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 ${overlayClassName}`}
			style={overlayStyle}
			onClick={onClose}
		>
			<div
				className={`app-modal-card w-full min-w-0 ${cardClassName}`}
				onClick={(event) => event.stopPropagation()}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
}
