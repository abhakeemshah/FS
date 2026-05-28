'use client';

import { useEffect, useState } from 'react';
import {
	STAFF_AUTH_EVENT,
	createStaffAccountOnServer,
	hasAdminSession,
} from '../lib/staff-auth';

const formatDate = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value));

export function StaffAccountManager() {
	const [name, setName] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [message, setMessage] = useState<string | null>(null);
	const [adminReady, setAdminReady] = useState(false);

	const refreshAccounts = () => {
		setAdminReady(hasAdminSession());
	};

	useEffect(() => {
		refreshAccounts();

		const onStorage: EventListener = () => {
			refreshAccounts();
		};

		window.addEventListener('storage', onStorage);
		window.addEventListener(STAFF_AUTH_EVENT, onStorage);

		return () => {
			window.removeEventListener('storage', onStorage);
			window.removeEventListener(STAFF_AUTH_EVENT, onStorage);
		};
	}, []);

	const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!adminReady) {
			setMessage('Only admin can create staff accounts. Open this from admin panel.');
			return;
		}

		try {
			const result = await createStaffAccountOnServer({
				name,
				username,
				password,
			});

			if (!result) {
				setMessage('Failed to create staff account.');
				return;
			}

			setMessage(`Staff account created for ${result.name}.`);
			setName('');
			setUsername('');
			setPassword('');
			refreshAccounts();
			window.dispatchEvent(new Event(STAFF_AUTH_EVENT));
		} catch (error) {
			setMessage('An error occurred. Please try again.');
			console.error(error);
		}
	};

	return (
		<section className="rounded-lg border border-slate-200 bg-white p-3">
			<div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
				<div>
					<h3 className="text-sm font-bold text-slate-900">Staff Account Creation (Admin Only)</h3>
					<p className="text-xs text-slate-500">Create login credentials for staff panel access.</p>
				</div>
			</div>

			<form className="grid gap-3 md:grid-cols-4" onSubmit={handleCreate}>
				<label className="text-xs text-slate-600">
					Name
					<input
						type="text"
						value={name}
						onChange={(event) => setName(event.target.value)}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
						placeholder="Staff name"
						required
					/>
				</label>
				<label className="text-xs text-slate-600">
					Email Address
					<input
						type="email"
						value={username}
						onChange={(event) => setUsername(event.target.value)}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
						placeholder="staff@company.com"
						required
					/>
				</label>
				<label className="text-xs text-slate-600">
					Password
					<input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
						placeholder="Minimum 4 characters"
						required
					/>
				</label>
				<div className="flex items-end">
					<button
						type="submit"
						className="w-full rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
					>
						Create Staff
					</button>
				</div>
			</form>

			{message ? <p className="mt-3 text-xs text-slate-600">{message}</p> : null}
		</section>
	);
}
