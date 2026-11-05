import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api, errorMessage, type QrRequest, type Session } from '../../lib/api';
import { Button } from '../ui/button';
// Serialize creation across StrictMode mounts and rapid panel reopens. The first
// response must install its HttpOnly owner cookie before another create is sent.
let creationQueue: Promise<unknown> = Promise.resolve();
function createRequest() {
  const next = creationQueue.catch(() => {}).then(() => api<QrRequest>('qr/create', {}));
  creationQueue = next;
  return next;
}
export function QrAuthPanel({ onAuthenticated, missingWallet, showHeading = true }: { onAuthenticated: (session: Session) => void; missingWallet?: string; showHeading?: boolean }) {
  const [request, setRequest] = useState<QrRequest | null>(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    let current: QrRequest | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setRequest(null); setImage(''); setError('');
    const cancel = (q: QrRequest) => { void api('qr/cancel', { id: q.id }).catch(() => {}); };
    async function poll(q: QrRequest) {
      try {
        const next = await api<QrRequest>('qr/status', { id: q.id });
        if (!alive) return;
        if (next.state === 'approved') {
          setRequest(next);
          await api('qr/complete', { id: q.id });
          const session = await api<Session>('session');
          if (alive) onAuthenticated(session);
          return;
        }
        if (alive) timer = setTimeout(() => { void poll(q); }, 1500);
      } catch (e) { if (alive) setError(errorMessage(e)); }
    }
    void createRequest().then(async q => {
      current = q;
      if (!alive) { cancel(q); return; }
      setRequest(q);
      const image = await QRCode.toDataURL(q.approvalUrl!, { width: 264, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#0F172A', light: '#FFFFFF' } });
      if (!alive) return;
      setImage(image);
      if (alive) timer = setTimeout(() => { void poll(q); }, 1500);
    }).catch(e => { if (alive) setError(errorMessage(e)); });
    return () => { alive = false; if (timer) clearTimeout(timer); if (current) cancel(current); };
  }, [retry, onAuthenticated]);
  return <section className="qr-panel" aria-label="Phone approval">
    <span className="mini-label">NO EXTENSION NEEDED</span>{showHeading && <h3>Approve with your phone</h3>}
    <p>{missingWallet && <>{missingWallet} extension wasn’t detected. </>}Scan with your Android camera, then open WalletGate in MetaMask to approve this browser’s login.</p>
    {error ? <><p role="alert" className="error">{error}</p><Button onClick={() => setRetry(v => v + 1)}>Create a new QR request</Button></> : request ? <>
      {image ? <img className="qr-image" src={image} alt="QR code to open WalletGate phone approval" width="264" height="264" /> : <p role="status">Drawing QR code…</p>}
      <p className="confirmation-label">Compare this code on your phone</p><strong className="confirmation" data-testid="desktop-confirmation">{request.confirmation}</strong>
      <p className="small muted">Expires at {new Date(request.expiresAt).toLocaleTimeString()}. One use only.</p>
      <a className="text-link break-anywhere" href={request.approvalUrl} target="_blank" rel="noreferrer">Open phone approval link</a>
      <p role="status" className="small">{request.state === 'approved' ? 'Phone approved. Completing desktop login…' : 'Waiting for your phone’s approval…'}</p>
    </> : <p role="status">Creating your secure request…</p>}
    <p className="small muted">Only approve if you started this login. Your phone will not be signed in by approving.</p>
  </section>;
}
