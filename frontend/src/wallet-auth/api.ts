export type Session = { address: string; expiresAt: string };
export type Challenge = { message: string; address: string; expiresAt: string; confirmation?: string };
export type QrRequest = { id: string; confirmation: string; expiresAt: string; approvalUrl?: string; state: 'pending' | 'approved'; origin: string };
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', signal, ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed. Try again.');
  return data as T;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'The request could not complete. Try again.'; }
