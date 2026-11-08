import { useEffect, useRef } from 'react';
import { useWalletAuth } from '../wallet-auth/hooks/use-wallet-auth';
import { WalletFlow } from '../wallet-auth/components/wallet-flow';
import { Button } from '../ui/button';
import type { Session } from '../wallet-auth';

export function SignIn({ onSession }: { onSession?: (session: Session | null) => void } = {}) {
  const auth = useWalletAuth();
  useEffect(() => { if (!auth.loading) onSession?.(auth.session); }, [auth.loading, auth.session, onSession]);
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
        {!onSession && <a className="text-link" href="#applications">My applications</a>}
      </div> : <WalletFlow auth={auth} />}
    </div>
    <p className="privacy-note">No password. No transaction.<br/>Your keys stay in your wallet.</p>
  </section>
  {auth.error && <p id="signin-error" role="alert" className="error sign-in-error">{auth.error}</p>}
  </div>;
}
