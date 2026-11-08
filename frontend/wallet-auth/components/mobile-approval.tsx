import { useEffect, useState } from 'react';
import { api, errorMessage, type QrRequest } from '../api';
import { useWalletAuth } from '../hooks/use-wallet-auth';
import { Button } from '../../ui/button';
import { SignatureReview } from './wallet-flow';
export function metaMaskLink(url: string) { return `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, '')}`; }
export function MobileApproval({ id }: { id: string }) {
  const auth = useWalletAuth(id);
  const [request, setRequest] = useState<QrRequest | null>(null);
  const [error, setError] = useState('');
  const [approved, setApproved] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!/^[a-f0-9]{64}$/.test(id)) { setError('Invalid phone approval link. Scan a new QR code.'); return; }
    void api<QrRequest>('qr/inspect', { id }).then(q => { if (alive) setRequest(q); }).catch(e => { if (alive) setError(errorMessage(e)); });
    return () => { alive = false; };
  }, [id]);
  useEffect(() => {
    if (!request) return;
    const timer = setTimeout(() => { setExpired(true); auth.reset(); }, Math.max(0, Date.parse(request.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [request]);
  async function reject() {
    if (auth.challenge) { try { await api('qr/reject', { id }); } catch (e) { setError(errorMessage(e)); return; } }
    auth.reset(); setCancelled(true);
  }
  const metaMask = auth.wallets.find(c => c.id === 'io.metamask') ?? auth.wallets.find(c => c.id === 'metaMask');
  return <section className="auth-card phone-approval" aria-labelledby="approval-title">
    <span className="mini-label">PHONE APPROVAL</span><h1 id="approval-title">{approved ? 'Desktop login approved' : 'Approve your desktop login'}</h1>
    {approved ? <><p role="status">{expired ? 'This approval window has expired. If the desktop has not signed in, create a new QR request there.' : 'Return to the desktop where you started to check your sign-in status.'}</p><p className="muted">This phone has not been signed in by approving.</p></> : cancelled ? <p role="status">No approval was sent. Return to your desktop to cancel or create a new request.</p> : expired ? <p role="alert" className="error">This QR request expired. Create a new one on your desktop.</p> : <>
      <p>You are approving another browser’s login to <strong>{request?.origin ?? location.origin}</strong>. Only continue if you started it.</p>
      {request && <><p className="confirmation-label">This must match your desktop</p><strong className="confirmation" data-testid="phone-confirmation">{request.confirmation}</strong><p className="small muted">Expires at {new Date(request.expiresAt).toLocaleTimeString()}.</p></>}
      <p className="small">Open this page inside MetaMask on Android to sign. If handoff does not open, copy this page’s link into the MetaMask browser.</p>
      {location.protocol === 'https:' && <a className="button button-secondary" href={metaMaskLink(location.href)} rel="noreferrer">Open in MetaMask</a>}
      {auth.challenge ? <SignatureReview auth={auth} phoneConfirmation={request?.confirmation} onApproved={() => setApproved(true)} /> : <Button disabled={!request || auth.busy || !metaMask} onClick={() => { if (metaMask) void auth.prepare(metaMask); }}>{auth.busy ? 'Connecting wallet…' : 'Connect MetaMask to review'}</Button>}
      <Button variant="ghost" disabled={auth.busy} onClick={() => { void reject(); }}>{auth.challenge ? 'Cancel desktop approval' : 'Dismiss phone instructions'}</Button>
      <p role="status" className="small">{auth.phase}</p>
    </>}
    {(error || auth.error) && <p role="alert" className="error">{error || auth.error}</p>}
  </section>;
}
