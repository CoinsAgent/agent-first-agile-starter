import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connect, disconnect, getConnection, signMessage, switchChain, watchConnection } from 'wagmi/actions';
import { MetaMaskProviderUnavailableError, walletConfig, waitForMetaMaskProvider } from './wallet';
import './style.css';

type Session = { address: string; expiresAt: string };
type Challenge = { message: string; address: string; expiresAt: string };
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed. Try again.');
  return data as T;
}
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [connection, setConnection] = useState(() => getConnection(walletConfig));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const attempt = useRef(0);
  const expectedMainnetSwitch = useRef<number | null>(null);
  useEffect(() => {
    void api<Session>('session').then(setSession).catch(() => setSession(null)).finally(() => setLoading(false));
    return watchConnection(walletConfig, { onChange(next, previous) {
      setConnection(next);
      const accountChanged = next.address?.toLowerCase() !== previous.address?.toLowerCase();
      const approvedNetworkChange = expectedMainnetSwitch.current === attempt.current &&
        !accountChanged && next.isConnected && next.chainId === 1;
      if (previous.address && (accountChanged || !next.isConnected ||
          (next.chainId !== previous.chainId && !approvedNetworkChange))) {
        attempt.current++;
        setChallenge(null);
        setBusy(false);
        setError('Wallet account or network changed. Connect and review a new sign-in message.');
      }
    } });
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => { setSession(null); setChallenge(null); setError('Your session expired. Sign in again.'); }, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);
  async function prepare() {
    const generation = ++attempt.current;
    setBusy(true); setError(''); setChallenge(null);
    try {
      await waitForMetaMaskProvider();
      if (generation !== attempt.current) return;
      expectedMainnetSwitch.current = generation;
      const connected = getConnection(walletConfig);
      if (!connected.isConnected) await connect(walletConfig, { connector: walletConfig.connectors[0], chainId: 1 });
      else if (connected.chainId !== 1) await switchChain(walletConfig, { chainId: 1 });
      if (generation !== attempt.current) return;
      const current = getConnection(walletConfig);
      if (!current.address || current.chainId !== 1) throw new Error('Select Ethereum Mainnet in MetaMask, then try again.');
      const next = await api<Challenge>('challenge', { address: current.address, chainId: current.chainId });
      if (generation !== attempt.current || getConnection(walletConfig).address !== current.address) return;
      setChallenge(next);
    } catch (error) {
      if (generation !== attempt.current) return;
      const current = getConnection(walletConfig);
      if (current.isConnected && current.chainId !== 1) {
        setError(`MetaMask is connected to ${Number.isSafeInteger(current.chainId) ? `chain ID ${current.chainId}` : 'an unknown network'}. Choose Switch to Ethereum Mainnet and approve the network change in MetaMask.`);
      } else if (/Android/i.test(navigator.userAgent) && error instanceof MetaMaskProviderUnavailableError) {
        setError('Open this site inside MetaMask using Explore, then connect there. Connecting from Android Chrome is not supported in this release.');
      } else {
        setError('Could not connect. Unlock MetaMask, approve the connection and Ethereum Mainnet request, then try again. On Android, open this site inside MetaMask using Explore.');
      }
    } finally {
      if (expectedMainnetSwitch.current === generation) expectedMainnetSwitch.current = null;
      if (generation === attempt.current) setBusy(false);
    }
  }
  async function authenticate() {
    if (!challenge) return;
    const generation = attempt.current;
    setBusy(true); setError('');
    try {
      const before = getConnection(walletConfig);
      if (before.address?.toLowerCase() !== challenge.address || before.chainId !== 1) throw new Error('Wallet changed. Start again.');
      const signature = await signMessage(walletConfig, { message: challenge.message, account: before.address });
      const after = getConnection(walletConfig);
      if (generation !== attempt.current || after.address?.toLowerCase() !== challenge.address || after.chainId !== 1) throw new Error('Wallet changed. Start again.');
      await api('verify', { message: challenge.message, signature });
      const authenticated = await api<Session>('session');
      if (generation !== attempt.current) return;
      setSession(authenticated); setChallenge(null);
    } catch {
      if (generation !== attempt.current) return;
      setChallenge(null);
      setError('Sign-in was cancelled, changed or expired. Review a new message and try again.');
    } finally { if (generation === attempt.current) setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try {
      await api('logout', {});
      setSession(null); setChallenge(null); attempt.current++;
      await disconnect(walletConfig);
    } catch { setError('Could not sign out. Try again.'); }
    finally { setBusy(false); }
  }
  return <main>
    <header><a href="/" className="brand"><span className="mark" aria-hidden="true">W</span>WalletGate</a><span className="network">Ethereum Mainnet</span></header>
    <section className="intro"><p className="eyebrow">A familiar wallet. A new way in.</p><h1>Your wallet.<br/><span>Your way in.</span></h1><p>Prove it’s you with a signature. Your keys stay in your wallet.</p></section>
    <section className="card" aria-labelledby="card-title">
      {loading ? <p role="status">Checking your session…</p> : session ? <>
        <span className="badge">Wallet verified</span><h2 id="card-title">You’re signed in.</h2><p>Your verified Ethereum address</p><p className="address" data-testid="verified-address">{session.address}</p><p className="muted">This session ends at {new Date(session.expiresAt).toLocaleTimeString()}. Signing out ends it immediately.</p><button onClick={logout} disabled={busy}>Sign out</button>
      </> : <>
        <h2 id="card-title">Sign in with Ethereum</h2><p>No password. No transaction. Just your signature.</p>
        <ol className="steps"><li aria-current={!challenge ? 'step' : undefined}>Connect wallet</li><li aria-current={challenge ? 'step' : undefined}>Review & sign</li><li>Signed in</li></ol>
        {challenge ? <><p className="muted">Check the address and message before signing. This request expires in five minutes.</p><pre aria-label="Sign-in message">{challenge.message}</pre><button onClick={authenticate} disabled={busy}>{busy ? 'Waiting for your wallet…' : 'Sign message & continue'}</button><button className="secondary" onClick={() => { setChallenge(null); attempt.current++; }} disabled={busy}>Cancel</button></> : <><button onClick={prepare} disabled={busy}>{busy ? 'Waiting for MetaMask…' : connection.isConnected && connection.chainId !== 1 ? 'Switch to Ethereum Mainnet' : connection.isConnected ? 'Review a new sign-in message' : 'Connect MetaMask'}</button><p className="muted">Use MetaMask in Chrome on desktop, or open this page in the MetaMask browser on Android.</p></>}
      </>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    <footer>Signatures prove wallet control. They never share your private key.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
