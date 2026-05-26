export const APP_ACTION_SUCCESS_EVENT = 'fs-communication:action-success';

export type AppActionSuccessDetail = {
	storageKey: string;
};

export type AppWriteOptions = {
	silent?: boolean;
};

export function emitAppActionSuccess(storageKey: string) {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent<AppActionSuccessDetail>(APP_ACTION_SUCCESS_EVENT, { detail: { storageKey } }));
}
