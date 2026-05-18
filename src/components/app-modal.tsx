'use client';

import { createPortal } from 'react-dom';
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

	return createPortal(
		<div
			className={`app-modal-overlay fixed inset-0 z-[99999] grid place-items-center px-4 ${overlayClassName}`}
			style={overlayStyle}
			onClick={onClose}
		>
			<div
				className={`app-modal-card w-full ${cardClassName}`}
				onClick={(event) => event.stopPropagation()}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
}
