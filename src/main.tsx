import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useWalletAuth } from './hooks/use-wallet-auth';
import { WalletFlow } from './components/wallet/wallet-flow';
import { MobileApproval } from './components/wallet/mobile-approval';
import { Button } from './components/ui/button';
import { setNonce } from 'get-nonce';
import './style.css';
import { preloadWalletSdks } from './wallet-sdk';
void preloadWalletSdks().catch(() => {});
// Nonce only the trusted Radix runtime styles; retain a strict CSP without unsafe-inline.
const styleNonce = document.querySelector<HTMLMetaElement>('meta[name="style-nonce"]')?.content;
if (styleNonce) setNonce(styleNonce);
function ThemeControl() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = theme === null ? systemDark : theme === 'dark';
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return <button className="theme-toggle" type="button" aria-label={label} title={label} onClick={() => setTheme(dark ? 'light' : 'dark')}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
  </button>;
}
function SignIn() {
  const auth = useWalletAuth();
  const step = auth.session ? 3 : auth.challenge ? 2 : 1;
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      if (content.current) content.current.scrollTop = 0;
      heading.current?.focus({ preventScroll: true });
    }
  }, [step]);
  return <div className="sign-in-shell">
  <section className="auth-card sign-in-card" aria-labelledby="signin-title" aria-describedby={auth.error ? 'signin-error' : undefined} data-step={step}>
    <span className="mini-label">WALLET-NATIVE IDENTITY</span>
    <h1 id="signin-title" ref={heading} tabIndex={-1}>{step === 3 ? '3 Signed in' : step === 2 ? '2 Review and sign' : <>Sign in with<br/>your wallet.</>}</h1>
    {step === 1 && <p className="card-intro">A familiar sign-in. Powered by proof<br className="desktop-only"/> that your wallet is yours.</p>}
    <ol className="steps" aria-label="Sign-in progress">{['Choose wallet', 'Review & sign', 'Signed in'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} data-complete={step > index + 1}>{label}</li>)}</ol>
    <div className="card-content" ref={content} tabIndex={0} role="region" aria-label="Sign-in details">
      {auth.loading ? <p role="status">Checking your session…</p> : auth.session ? <div className="signed-in-details">
        <span className="success-badge">Wallet verified</span>
        <p>Your verified Ethereum address</p>
        <p className="address" data-testid="verified-address">{auth.session.address}</p>
        <p className="small muted">Session ends at {new Date(auth.session.expiresAt).toLocaleTimeString()}. Signing out ends it immediately.</p>
        <Button onClick={() => { void auth.logout(); }} disabled={auth.busy}>Sign out</Button>
      </div> : <WalletFlow auth={auth} />}
    </div>
    <p className="privacy-note">No password. No transaction.<br/>Your keys stay in your wallet.</p>
  </section>
  {auth.error && <p id="signin-error" role="alert" className="error sign-in-error">{auth.error}</p>}
  </div>;
}
function App() {
  const [phoneId, setPhoneId] = useState(() => new URLSearchParams(location.hash.slice(1)).get('approve'));
  useEffect(() => { const update = () => setPhoneId(new URLSearchParams(location.hash.slice(1)).get('approve')); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  return <main>
    <header className="page-header"><a href="/" className="brand"><span className="brand-mark" aria-hidden="true">W</span><span>WalletGate</span></a><div className="header-controls"><span className="network"><span aria-hidden="true">◆</span> Ethereum Mainnet</span><ThemeControl /></div></header>
    <div className="auth-layout">{phoneId ? <MobileApproval key={phoneId} id={phoneId} /> : <SignIn />}</div>
    <footer>Your wallet. Your way in.<span>Signatures prove control. They never share your private key.</span></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
