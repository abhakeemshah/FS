// Ledger server helper stubs
export type LedgerSnapshot = Record<string, string>;

function serverOnlyError() {
  throw new Error('ledger-server functions are server-only. Use the API endpoints (/api/ledger-state) instead.');
}

export async function readLedgerSnapshot(): Promise<LedgerSnapshot> {
  serverOnlyError();
  return {} as LedgerSnapshot;
}

export async function writeLedgerSnapshot(_nextSnapshot: LedgerSnapshot) {
  serverOnlyError();
}

export async function updateLedgerSnapshot(_key: string, _value: string | null) {
  serverOnlyError();
  return {} as LedgerSnapshot;
}
