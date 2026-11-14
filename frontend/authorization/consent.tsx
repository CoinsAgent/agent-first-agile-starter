import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../ui/button';
import './style.css';
type Details = { clientId: string; name: string; address: string; scopes: string[]; expiresAt: number };
export function Consent({ id, signIn }: { id: string; signIn: (ready: () => void) => ReactNode }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [login, setLogin] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const active = useRef(true);
  const inFlight = useRef(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/authorization/' + id, { credentials: 'same-origin' });
      const value = await response.json();
      if (!active.current) return;
      if (!response.ok) throw new Error(value.error);
      if (value.needsLogin) { setLogin(true); setFresh(!!value.fresh); setDetails(null); }
      else { setDetails(value); setLogin(false); setFresh(false); }
    } catch (e) { if (active.current) { setDetails(null); setError(e instanceof Error ? e.message : 'Authorization could not load. Start again.'); } }
  }, [id]);
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; }; }, [load]);
  useEffect(() => { if (details) heading.current?.focus(); }, [details]);
  useEffect(() => {
    if (!details) return;
    const timer = setTimeout(() => { setDetails(null); setError('Authorization expired. Start again from the application.'); }, Math.max(0, details.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [details]);
  async function decide(accept: boolean) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/authorization/' + id, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accept }) });
      const value = await response.json();
      if (!active.current) return;
      if (!response.ok) { setDetails(null); throw new Error(value.error ?? 'Review consent again.'); }
      if (value.needsLogin) { setDetails(null); setLogin(true); setFresh(!!value.fresh); return; }
      if (!value.redirect || typeof value.url !== 'string') throw new Error('Authorization could not finish. Start again.');
      // Destination was validated by the server/provider; do not reconstruct it from browser parameters.
      window.location.assign(value.url);
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : 'Authorization failed. Start again.'); }
    finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  async function reauthenticate() {
    setBusy(true); setError('');
    try {
      const result = await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!result.ok) throw new Error('Could not end the old session. Try again.');
      setFresh(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  }
  return <div className="authorization-shell">
    <section className="auth-card authorization-card" aria-labelledby="consent-title">
      <h1 id="consent-title" ref={heading} tabIndex={-1}>Approve application sign-in</h1>
      {!details && !login && !error && <p role="status">Checking authorization…</p>}
      {details && <>
        <p><strong>{details.name}</strong> wants to sign you in with WalletGate.</p>
        <dl><dt>Application client ID</dt><dd>{details.clientId}</dd><dt>Your verified wallet</dt><dd>{details.address}</dd></dl>
        <p>This shares your wallet address. Applications receiving it can recognize the same identity across integrations.</p>
        {details.scopes.includes('offline_access') && <p>Continued access: this application can renew access for up to seven days without another wallet signature, including after you sign out of WalletGate.</p>}
        <p>You can allow or deny this request. WalletGate has not verified the application.</p>
        <div className="authorization-actions"><Button variant="secondary" disabled={busy} onClick={() => void decide(false)}>Deny</Button><Button disabled={busy} onClick={() => void decide(true)}>Allow</Button></div>
        {busy && <p role="status">Completing your decision…</p>}
      </>}
      {login && <p>{fresh ? 'This application requires a fresh wallet signature. End your current WalletGate session to continue.' : 'Sign in with your wallet, then review the application and requested access.'}</p>}
      {login && fresh && <Button disabled={busy} onClick={() => void reauthenticate()}>Sign in again</Button>}
      {error && <p role="alert" className="error">{error}</p>}
      {error && <Button disabled={busy} onClick={() => { setError(''); void load(); }}>Review request again</Button>}
    </section>
    {login && !fresh && signIn(() => { void load(); })}
  </div>;
}
