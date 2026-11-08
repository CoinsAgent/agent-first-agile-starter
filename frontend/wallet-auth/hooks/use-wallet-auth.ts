import { useEffect, useRef, useState } from 'react';
import { connect, disconnect, getConnection, getConnectors, signMessage, switchChain, watchConnection, watchConnectors } from 'wagmi/actions';
import type { Connector } from 'wagmi';
import { sdkIds } from '../wallet-sdk';
import { walletConfig } from '../wallet';
import { api, errorMessage, type Challenge, type Session } from '../api';

export function useWalletAuth(phoneRequest?: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [connection, setConnection] = useState(() => getConnection(walletConfig));
  const [connectors, setConnectors] = useState(() => getConnectors(walletConfig));
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!phoneRequest);
  const attempt = useRef(0);
  const expectedSwitch = useRef<number | null>(null);
  const expectedDisconnect = useRef<number | null>(null);
  useEffect(() => {
    let active = true;
    if (!phoneRequest) void api<Session>('session').then(value => { if (active) setSession(value); }).catch(() => { if (active) setSession(null); }).finally(() => { if (active) setLoading(false); });
    const unwatchConnectors = watchConnectors(walletConfig, { onChange: setConnectors });
    const unwatch = watchConnection(walletConfig, { onChange(next, previous) {
      setConnection(next);
      const changedAccount = next.address?.toLowerCase() !== previous.address?.toLowerCase();
      const expected = expectedSwitch.current === attempt.current && !changedAccount && next.isConnected && next.chainId === 1;
      const intentionalDisconnect = expectedDisconnect.current === attempt.current && !next.isConnected;
      if (previous.address && !intentionalDisconnect && (changedAccount || !next.isConnected || (next.chainId !== previous.chainId && !expected))) {
        attempt.current++; setChallenge(null); setBusy(false); setPhase('');
        setError('Wallet account or network changed. Connect and review a new sign-in message.');
      }
    } });
    return () => { active = false; attempt.current++; unwatch(); unwatchConnectors(); };
  }, [phoneRequest]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => { setSession(null); setChallenge(null); setError('Your session expired. Sign in again.'); }, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);
  useEffect(() => {
    if (!challenge) return;
    const timer = setTimeout(() => { attempt.current++; setChallenge(null); setBusy(false); setError('Your sign-in request expired. Review a new message.'); }, Math.max(0, Date.parse(challenge.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [challenge]);
  function reset() { attempt.current++; setChallenge(null); setBusy(false); setPhase(''); setError(''); }
  async function prepare(connector: Connector) {
    // Choosing another connector first invalidates pending async results.
    const generation = ++attempt.current;
    setBusy(true); setPhase('Connecting wallet…'); setError(''); setChallenge(null);
    try {
      const current = getConnection(walletConfig);
      if (current.isConnected && current.connector?.uid !== connector.uid) {
        expectedDisconnect.current = generation;
        try { await disconnect(walletConfig); } finally { expectedDisconnect.current = null; }
      }
      if (generation !== attempt.current) return;
      expectedSwitch.current = generation;
      if (!getConnection(walletConfig).isConnected) {
        // In-app browsers may inject after the user has already opened the dialog.
        const deadline = Date.now() + 3000;
        while (!await connector.getProvider()) {
          if (generation !== attempt.current) return;
          if (Date.now() >= deadline) throw new Error('Wallet provider unavailable.');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (generation !== attempt.current) return;
        await connect(walletConfig, { connector, chainId: 1 });
      }
      else if (getConnection(walletConfig).chainId !== 1) await switchChain(walletConfig, { chainId: 1 });
      if (generation !== attempt.current) return;
      const connected = getConnection(walletConfig);
      if (!connected.address || connected.chainId !== 1) throw new Error('Switch to Ethereum Mainnet in your wallet, then try again.');
      setPhase('Preparing your sign-in message…');
      const next = await api<Challenge>(phoneRequest ? 'qr/challenge' : 'challenge', { ...(phoneRequest ? { id: phoneRequest } : {}), address: connected.address, chainId: connected.chainId });
      if (generation !== attempt.current || getConnection(walletConfig).address !== connected.address) return;
      setChallenge(next); setPhase('Connected. Review the message before signing.');
    } catch {
      if (generation !== attempt.current) return;
      const current = getConnection(walletConfig);
      setError(current.isConnected && current.chainId !== 1
        ? `Wallet is connected to chain ID ${current.chainId}. Switch to Ethereum Mainnet and approve the network change, then try again.`
        : connector.id === sdkIds.coinbase
          ? 'Coinbase Wallet did not complete the connection. Return to WalletGate and try again. No sign-in was completed.'
          : 'Could not connect. Unlock your wallet and approve the connection, then retry. No extension? Use phone approval. Open this site inside MetaMask on Android to sign there.');
      setPhase('');
    } finally { if (expectedSwitch.current === generation) expectedSwitch.current = null; if (generation === attempt.current) setBusy(false); }
  }
  async function authenticate(confirmation?: string): Promise<boolean> {
    if (!challenge) return false;
    const generation = attempt.current;
    setBusy(true); setError(''); setPhase('Check your wallet for a signature request…');
    try {
      const before = getConnection(walletConfig);
      if (before.address?.toLowerCase() !== challenge.address || before.chainId !== 1) throw new Error('Wallet changed.');
      const signature = await signMessage(walletConfig, { message: challenge.message, account: before.address });
      const after = getConnection(walletConfig);
      if (generation !== attempt.current || after.address?.toLowerCase() !== challenge.address || after.chainId !== 1) return false;
      setPhase('Verifying your signature with WalletGate…');
      await api(phoneRequest ? 'qr/approve' : 'verify', { ...(phoneRequest ? { id: phoneRequest, confirmation } : {}), message: challenge.message, signature });
      if (generation !== attempt.current) return false;
      if (!phoneRequest) {
        const verifiedSession = await api<Session>('session');
        if (generation !== attempt.current) return false;
        setSession(verifiedSession);
      }
      if (generation !== attempt.current) return false;
      setChallenge(null); setPhase(phoneRequest ? 'Desktop login approved.' : 'Signed in successfully.'); return true;
    } catch {
      if (generation === attempt.current) { setChallenge(null); setError('Sign-in was cancelled, changed or expired. Review a new message and try again.'); setPhase(''); }
      return false;
    } finally { if (generation === attempt.current) setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try {
      await api('logout', {}); reset(); setBusy(true); setSession(null);
      // Logout deliberately disconnects the connector; it is not a wallet-change failure.
      const generation = attempt.current;
      expectedDisconnect.current = generation;
      try { await disconnect(walletConfig); }
      finally { if (expectedDisconnect.current === generation) expectedDisconnect.current = null; }
    }
    catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  // EIP-6963 discovered MetaMask supersedes the legacy fallback entry.
  const sdkWallets = connectors.filter(c => (Object.values(sdkIds) as string[]).includes(c.id));
  const wallets = connectors.filter(c => !sdkWallets.includes(c)).filter(c => c.id !== 'metaMask' || !connectors.some(other => other.id === 'io.metamask'));
  return { session, setSession, challenge, connection, wallets, sdkWallets, busy, phase, error, setError, loading, prepare, authenticate, logout, reset };
}
export type WalletAuth = ReturnType<typeof useWalletAuth>;
