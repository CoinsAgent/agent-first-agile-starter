import { useState, useCallback, useEffect, useRef } from 'react';
import { cancelWalletSdk, sdkIds } from '../../wallet-sdk';
import type { Connector } from 'wagmi';
import type { WalletAuth } from '../../hooks/use-wallet-auth';
import type { Session } from '../../lib/api';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '../ui/dialog';
import { QrAuthPanel } from './qr-auth-panel';
import { walletShortcuts, shortcutConnector, type WalletShortcut } from './wallet-shortcuts';

export function SignatureReview({ auth, phoneConfirmation, onApproved, showHeading = true, onCancel }: { auth: WalletAuth; phoneConfirmation?: string; onApproved?: () => void; showHeading?: boolean; onCancel?: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  return <div className="signature-review">
    {showHeading && <h3>{phoneConfirmation ? 'Approve desktop sign-in' : 'Review your sign-in message'}</h3>}
    <p className="small">Signing confirms wallet control. It does not send a transaction.</p>
    <pre aria-label="Sign-in message" tabIndex={0}>{auth.challenge?.message}</pre>
    {phoneConfirmation && <label className="check-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I started this desktop login and the confirmation codes match.</label>}
    <div className="review-actions">
      <Button onClick={() => { void auth.authenticate(phoneConfirmation).then(ok => { if (ok) onApproved?.(); }); }} disabled={auth.busy || (!!phoneConfirmation && !confirmed)}>{auth.busy ? 'Waiting for your wallet…' : phoneConfirmation ? 'Sign and approve desktop login' : 'Sign message & continue'}</Button>
      <Button variant="secondary" disabled={auth.busy && !onCancel} onClick={onCancel ?? auth.reset}>Cancel</Button>
    </div>
  </div>;
}

export function WalletFlow({ auth }: { auth: WalletAuth }) {
  const [detail, setDetail] = useState<'wallet' | 'qr' | null>(null);
  const [selected, setSelected] = useState<Connector | null>(null);
  const [selecting, setSelecting] = useState(false);
  const selectionInProgress = useRef(false);
  const [missingWallet, setMissingWallet] = useState<string | undefined>();
  const flow = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const shortcutAttempt = useRef(0);
  const authenticated = useCallback((session: Session) => { shortcutAttempt.current++; auth.setSession(session); }, [auth.setSession]);
  const connectionPending = (selecting || (selected !== null && auth.busy)) && !auth.challenge;
  const coinbaseAndroidPending = connectionPending && selected?.type === 'walletSdk' && selected.id === sdkIds.coinbase && /Android/i.test(navigator.userAgent);
  useEffect(() => () => { void cancelWalletSdk(selected); }, [selected]);
  const close = useCallback(() => {
    const generation = ++shortcutAttempt.current;
    selectionInProgress.current = false; setSelecting(false);
    void cancelWalletSdk(selected); auth.reset();
    setSelected(null); setDetail(null); setMissingWallet(undefined);
    const triggerName = lastTrigger.current?.getAttribute('aria-label') || lastTrigger.current?.textContent;
    requestAnimationFrame(() => {
      if (generation !== shortcutAttempt.current) return;
      const trigger = Array.from(flow.current?.querySelectorAll('button') ?? []).find(button =>
        (button.getAttribute('aria-label') || button.textContent) === triggerName);
      trigger?.focus();
    });
  }, [selected, auth.reset]);
  useEffect(() => {
    if (detail !== 'wallet') return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) close(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [detail, close]);
  async function selectShortcut(shortcut: WalletShortcut, trigger: HTMLButtonElement) {
    if (selectionInProgress.current || auth.busy) return;
    selectionInProgress.current = true; setSelecting(true);
    const generation = ++shortcutAttempt.current;
    lastTrigger.current = trigger;
    void cancelWalletSdk(selected); auth.reset(); setSelected(null); setMissingWallet(undefined); setDetail('wallet');
    const connector = shortcutConnector(shortcut, auth.wallets);
    try {
      let provider = connector ? await connector.getProvider() : undefined;
      // Reject another wallet's legacy MetaMask compatibility flag.
      if (provider && connector?.id === 'metaMask') {
        const announced = await Promise.all(auth.wallets.filter(wallet => wallet.id !== 'metaMask').map(wallet => wallet.getProvider().catch(() => undefined)));
        if (announced.some(other => other === provider)) provider = undefined;
      }
      if (generation !== shortcutAttempt.current) return;
      if (connector && provider) { setSelected(connector); await auth.prepare(connector); }
      else {
        const sdkId = shortcut.id === 'metamask' ? sdkIds.metamask : shortcut.id === 'coinbase' ? sdkIds.coinbase : undefined;
        const sdk = auth.sdkWallets.find(wallet => wallet.id === sdkId);
        if (sdk) { setSelected(sdk); await auth.prepare(sdk); }
        else setMissingWallet(shortcut.name);
      }
    } catch { if (generation === shortcutAttempt.current) setMissingWallet(shortcut.name); }
    finally { if (generation === shortcutAttempt.current) { selectionInProgress.current = false; setSelecting(false); } }
  }
  return <Dialog open={detail === 'qr'} onOpenChange={open => { if (!open) close(); }}><div ref={flow} className={`wallet-flow${auth.challenge ? ' is-review' : ''}`}>
    {auth.challenge ? <>
      <SignatureReview auth={auth} showHeading={false} onCancel={close} />
      <p role="status" className="small status">{auth.phase}</p>
    </> : <>
      <div className="wallet-shortcuts" role="group" aria-label="Sign in with a wallet">
        {walletShortcuts.map(shortcut => <button key={shortcut.id} className="wallet-shortcut" disabled={auth.busy || selecting} aria-label={`Sign in with ${shortcut.name}`} title={shortcut.name} onClick={event => { void selectShortcut(shortcut, event.currentTarget); }}>
          <img src={shortcut.icon} width="32" height="32" alt="" aria-hidden="true" />
        </button>)}
        <DialogTrigger asChild><button type="button" className="wallet-shortcut" disabled={auth.busy || selecting} aria-label="Use your phone" title="Use your phone" onClick={event => {
          shortcutAttempt.current++; void cancelWalletSdk(selected); auth.reset();
          lastTrigger.current = event.currentTarget; setSelected(null); setMissingWallet(undefined); setDetail('qr');
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M11 19h2"/></svg>
        </button></DialogTrigger>
      </div>
      {connectionPending ? <div className="wallet-connection-status">
        <p role="status">{auth.phase || `Connecting to ${selected?.name ?? 'your wallet'}…`}</p>
        {coinbaseAndroidPending && <p className="small">If Coinbase opens without connecting, cancel this attempt and open this site manually in Coinbase’s browser. Choose Coinbase there to review and sign. Sign-in completes inside Coinbase.</p>}
        <div className="step-one-actions"><Button variant="secondary" aria-label="Cancel connection" onClick={close}>Cancel</Button></div>
      </div> : missingWallet ? <section>
        <h2>{missingWallet} connection unavailable</h2>
        <p role="status">No {missingWallet} extension was detected. A supported wallet SDK QR connection is unavailable for this wallet in WalletGate.</p>
        <div className="step-one-actions"><Button variant="secondary" aria-label="Back to wallet choices" onClick={close}>Back</Button></div>
      </section> : selected ? <div className="wallet-recovery step-one-actions">
        <Button aria-label={auth.connection.isConnected && auth.connection.chainId !== 1 ? 'Switch to Ethereum Mainnet' : 'Review a new sign-in message'} onClick={() => { void auth.prepare(selected); }}>{auth.connection.isConnected && auth.connection.chainId !== 1 ? 'Switch network' : 'Try again'}</Button>
        <Button variant="secondary" aria-label="Cancel sign-in" onClick={close}>Cancel</Button>
      </div> : null}
    </>}
    <DialogContent className="phone-dialog" aria-modal="true" closeLabel="Close phone approval">
      <DialogTitle className="phone-dialog-title">Use your phone</DialogTitle>
      <DialogDescription className="sr-only">Scan the QR code and approve this browser’s sign-in with your wallet on your phone.</DialogDescription>
      <QrAuthPanel onAuthenticated={authenticated} showHeading={false} />
      <Button variant="secondary" onClick={close}>Cancel phone approval</Button>
    </DialogContent>
  </div></Dialog>;
}
