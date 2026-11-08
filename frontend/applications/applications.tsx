import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '../wallet-auth';
import { Button } from '../ui/button';
import './style.css';

type Application = { clientId: string; name: string; redirectUris: string[]; createdAt: string; profile: string; requestId: string };
type Submission = { name: string; redirectUris: string[]; requestId: string };
class RequestError extends Error {
  constructor(public status: number, message: string, public field?: string) { super(message); }
}
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new RequestError(response.status, data.error ?? 'The request could not complete.', data.field);
  return data as T;
}
export function Applications({ session, onReauthenticate }: { session: Session | null; onReauthenticate: () => void }) {
  const [items, setItems] = useState<Application[]>([]);
  const [name, setName] = useState('');
  const [redirects, setRedirects] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [field, setField] = useState('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<{ application: Application; clientSecret?: string } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const owner = useRef<string | null>(null);
  const activeOwner = useRef<string | null>(null);
  const generation = useRef(0);
  const submitting = useRef(false);
  const pending = useRef<Submission | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  activeOwner.current = session?.address ?? null;
  useEffect(() => {
    const current = ++generation.current;
    setResult(null); setItems([]); setBusy(false); submitting.current = false;
    if (!session) return;
    if (owner.current && owner.current !== session.address) {
      setName(''); setRedirects(''); setCreating(false); setUncertain(false); pending.current = null; setError(''); setStatus('');
    }
    owner.current = session.address;
    void request<{ applications: Application[] }>('applications').then(data => {
      if (generation.current === current) { setItems(data.applications); heading.current?.focus(); }
    }).catch(e => { if (generation.current === current) handleError(e); });
    return () => { generation.current++; };
  }, [session?.address, session?.expiresAt]); // A server session change, not a connector change, changes the owner.
  useEffect(() => { if (session) heading.current?.focus(); }, [creating, result]);
  useEffect(() => {
    if (!session) return;
    const check = () => { void request<Session>('session').then(value => {
      if (value.address !== activeOwner.current) { setResult(null); onReauthenticate(); }
    }).catch(e => { if (e instanceof RequestError && e.status === 401) { setResult(null); onReauthenticate(); } }); };
    window.addEventListener('focus', check);
    const visibility = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', visibility); };
  }, [session?.address, onReauthenticate]);
  function handleError(e: unknown) {
    const message = e instanceof Error ? e.message : 'Could not reach WalletGate. Try again.';
    setError(message); setField(e instanceof RequestError ? e.field ?? '' : '');
    if (e instanceof RequestError && e.status === 401) { setResult(null); onReauthenticate(); }
  }
  async function register(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !session) return;
    submitting.current = true; setBusy(true); setError(''); setField(''); setStatus('Registering application…');
    const current = generation.current;
    const address = session.address;
    const valid = () => generation.current === current && activeOwner.current === address;
    try {
      const actual = await request<Session>('session');
      if (!valid()) return;
      if (actual.address !== address) { setName(''); setRedirects(''); pending.current = null; onReauthenticate(); return; }
      const submission = pending.current ?? { name, redirectUris: redirects.split('\n').map(v => v.trim()).filter(Boolean), requestId: crypto.randomUUID() };
      pending.current = submission;
      const response = await request<{ application: Application; clientSecret?: string; replayed: boolean }>('applications', submission);
      if (!valid()) return;
      setResult({ application: response.application, clientSecret: response.clientSecret }); setUncertain(false); pending.current = null;
      setItems(previous => [response.application, ...previous.filter(item => item.clientId !== response.application.clientId)]);
      setName(''); setRedirects(''); setCreating(false);
      setStatus(response.replayed ? 'This application was already registered. Its secret cannot be shown again. Register a replacement if you did not save it; it counts toward your limit.' : 'Application registered. Save the secret before leaving this result.');
    } catch (e) {
      if (!valid()) return;
      if (!(e instanceof RequestError) || e.status >= 500) { setUncertain(true); setError('The result is uncertain. Check your applications before retrying this same submission.'); }
      else { if (!uncertain && e.status !== 401 && e.status !== 429) pending.current = null; handleError(e); }
      setStatus('');
    } finally { if (valid()) { submitting.current = false; setBusy(false); } }
  }
  async function reconcile() {
    if (submitting.current || !session) return;
    const current = generation.current;
    submitting.current = true; setBusy(true); setError('');
    try {
      const data = await request<{ applications: Application[] }>('applications');
      if (current !== generation.current) return;
      setItems(data.applications);
      const found = data.applications.find(item => item.requestId === pending.current?.requestId);
      if (found) {
        setResult({ application: found }); setCreating(false); setUncertain(false); pending.current = null; setName(''); setRedirects('');
        setStatus('Registration completed. The one-time secret cannot be recovered. Register a replacement if needed; it counts toward your limit.');
      } else { setStatus('No completed registration found. Retry the same submission safely; it will not create a duplicate.'); }
    } catch (e) { if (current === generation.current) handleError(e); }
    finally { if (current === generation.current) { submitting.current = false; setBusy(false); } }
  }
  async function copy(value: string, label: string) {
    const current = generation.current;
    try { await navigator.clipboard.writeText(value); if (current === generation.current) setStatus(`${label} copied.`); }
    catch { if (current === generation.current) setStatus(`Could not copy ${label.toLowerCase()}. Select its text and copy manually.`); }
  }
  async function logout() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setResult(null);
    try { await request('logout', {}); setName(''); setRedirects(''); pending.current = null; setCreating(false); setUncertain(false); owner.current = null; onReauthenticate(); }
    catch (e) { handleError(e); } finally { submitting.current = false; setBusy(false); }
  }
  if (!session) return null;
  return <section className="applications" aria-labelledby="applications-heading">
    <div className="applications-top"><a href="/" className="text-link">Back to sign-in</a><Button variant="secondary" disabled={busy} onClick={() => { void logout(); }}>Sign out</Button></div>
    <span className="mini-label">OWNER WORKSPACE</span>
    <h1 id="applications-heading" ref={heading} tabIndex={-1}>{result ? 'Application registered' : creating ? 'Register application' : 'My applications'}</h1>
    <p className="small break-anywhere">Verified owner: {session.address}</p>
    <p>Register confidential web clients for a later OIDC integration. Authorization and token exchange are not available in this release. Application names do not imply endorsement by WalletGate.</p>
    <p className="small">{items.length} of 20 applications · Up to five registration attempts per minute. Lost secrets require a replacement registration, which uses another slot. No reset is available.</p>
    <p role="status" className="status">{status}</p>
    {error && <p id="application-error" role="alert" className="error">{error}</p>}
    {result ? <div className="application-panel">
      <h2>{result.application.name}</h2>
      <p className="small">{result.application.profile}</p>
      <label htmlFor="client-id">Client ID</label><output id="client-id" className="credential">{result.application.clientId}</output>
      <Button variant="secondary" onClick={() => { void copy(result.application.clientId, 'Client ID'); }}>Copy client ID</Button>
      {result.clientSecret ? <>
        <p className="secret-warning">Save this secret now. Leaving or refreshing this result removes it permanently. WalletGate cannot show it again.</p>
        <label htmlFor="client-secret">Client secret (shown once)</label><output id="client-secret" className="credential">{result.clientSecret}</output>
        <Button variant="secondary" onClick={() => { void copy(result.clientSecret!, 'Client secret'); }}>Copy client secret</Button>
      </> : <p>The one-time client secret is unavailable. Register a replacement application if you did not save it.</p>}
      <h3>Registered redirect URIs</h3><ul className="redirect-list">{result.application.redirectUris.map(uri => <li key={uri}>{uri}</li>)}</ul>
      <Button onClick={() => { setResult(null); setStatus(''); }}>Return to applications</Button>
    </div> : creating ? <form className="application-panel" onSubmit={event => { void register(event); }} noValidate>
      <label htmlFor="application-name">Application name</label>
      <input id="application-name" value={name} disabled={busy || uncertain} onChange={e => { setName(e.target.value); pending.current = null; }} aria-invalid={field === 'name'} aria-describedby={field === 'name' ? 'application-error name-help' : 'name-help'} autoComplete="off" />
      <p id="name-help" className="small">1–100 characters. Names need not be unique.</p>
      <label htmlFor="application-redirects">Redirect URIs</label>
      <textarea id="application-redirects" value={redirects} disabled={busy || uncertain} onChange={e => { setRedirects(e.target.value); pending.current = null; }} aria-invalid={field === 'redirectUris'} aria-describedby={field === 'redirectUris' ? 'application-error redirects-help' : 'redirects-help'} rows={4} spellCheck={false} />
      <p id="redirects-help" className="small">One URI per line, 1–10 distinct HTTPS callbacks on non-loopback hostnames. HTTP and localhost callbacks are unavailable, including development. No wildcards, fragments or embedded credentials.</p>
      <p className="small">Fixed profile: confidential web · authorization code · PKCE S256 · openid · client_secret_basic. No refresh tokens.</p>
      {uncertain && <Button variant="secondary" disabled={busy} onClick={() => { void reconcile(); }}>Check registration</Button>}
      <Button type="submit" disabled={busy}>{busy ? 'Registering…' : uncertain ? 'Retry same submission' : 'Register application'}</Button>
      {!uncertain && <Button variant="ghost" disabled={busy} onClick={() => { setCreating(false); setError(''); setField(''); pending.current = null; }}>Cancel registration</Button>}
    </form> : <>
      <Button disabled={items.length >= 20 || busy} onClick={() => { setCreating(true); setStatus(''); setError(''); setField(''); }}>Register application</Button>
      {items.length === 0 ? <p>No applications yet. Register your first application to get its client ID and one-time secret.</p> : <ul className="application-list">{items.map(item => <li key={item.clientId} className="application-panel">
        <h2>{item.name}</h2><dl><dt>Client ID</dt><dd>{item.clientId}</dd><dt>Profile</dt><dd>{item.profile}</dd><dt>Created</dt><dd><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></dd></dl>
        <h3>Redirect URIs</h3><ul className="redirect-list">{item.redirectUris.map(uri => <li key={uri}>{uri}</li>)}</ul>
        <p className="small">The client secret is not retrievable. Editing and disabling are not available yet.</p>
      </li>)}</ul>}
    </>}
  </section>;
}
