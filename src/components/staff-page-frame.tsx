'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import { WorkspaceModeProvider } from './admin-shell';
import { canCurrentStaffAccessModule, getCurrentStaffModuleAccess, readStaffSession, STAFF_AUTH_EVENT, type StaffModuleKey } from '../lib/staff-auth';

type StaffPageFrameProps = {
	moduleKey: StaffModuleKey;
	children: ReactNode;
};

export function StaffPageFrame({ moduleKey, children }: StaffPageFrameProps) {
	const [access, setAccess] = useState<'none' | 'view' | 'edit'>('none');
	const [ready, setReady] = useState(false);
	const [hasSession, setHasSession] = useState(false);

	useEffect(() => {
		// Verify staff is logged in
		const session = readStaffSession();
		setHasSession(!!session);

		// Get current permission level
		const currentAccess = getCurrentStaffModuleAccess(moduleKey);
		setAccess(currentAccess);
		setReady(true);

		// Listen for permission updates from admin
		const handlePermissionUpdate = () => {
			const updatedAccess = getCurrentStaffModuleAccess(moduleKey);
			setAccess(updatedAccess);
		};

		window.addEventListener(STAFF_AUTH_EVENT, handlePermissionUpdate);
		window.addEventListener('storage', handlePermissionUpdate);

		return () => {
			window.removeEventListener(STAFF_AUTH_EVENT, handlePermissionUpdate);
			window.removeEventListener('storage', handlePermissionUpdate);
		};
	}, [moduleKey]);

	if (!hasSession) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-center">
					<p className="text-2xl font-bold text-slate-900">Not Logged In</p>
					<p className="mt-2 text-slate-600">Please log in to access this module.</p>
				</div>
			</div>
		);
	}

	if (!ready) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-slate-500">Loading...</div>
			</div>
		);
	}

	if (access === 'none') {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-center">
					<p className="text-2xl font-bold text-slate-900">No Access</p>
					<p className="mt-2 text-slate-600">You don't have permission to access this module.</p>
				</div>
			</div>
		);
	}

	if (!hasSession) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-center">
					<p className="text-2xl font-bold text-slate-900">Not Logged In</p>
					<p className="mt-2 text-slate-600">Please log in to access this module.</p>
				</div>
			</div>
		);
	}

	if (!ready) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-slate-500">Loading...</div>
			</div>
		);
	}

	if (access === 'none') {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-center">
					<p className="text-2xl font-bold text-slate-900">No Access</p>
					<p className="mt-2 text-slate-600">You don't have permission to access this module.</p>
				</div>
			</div>
		);
	}

	const readOnly = !canCurrentStaffAccessModule(moduleKey, 'edit');

	const cloned = React.Children.map(children, (child) => {
		if (React.isValidElement(child)) {
			return React.cloneElement(child, { readOnly });
		}
		return child;
	});

	return (
		<WorkspaceModeProvider mode="staff">
			<>{cloned}</>
		</WorkspaceModeProvider>
	);
}
