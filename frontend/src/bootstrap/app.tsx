import { useEffect, useState } from 'react';
import { MobileApproval } from '../wallet-auth/components/mobile-approval';
import { SignIn } from '../pages/sign-in';
import { setNonce } from 'get-nonce';
import { preloadWalletSdks } from '../wallet-auth/wallet-sdk';

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
export function App() {
  const [phoneId, setPhoneId] = useState(() => new URLSearchParams(location.hash.slice(1)).get('approve'));
  useEffect(() => { const update = () => setPhoneId(new URLSearchParams(location.hash.slice(1)).get('approve')); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  return <main>
    <header className="page-header"><a href="/" className="brand"><span className="brand-mark" aria-hidden="true">W</span><span>WalletGate</span></a><div className="header-controls"><span className="network"><span aria-hidden="true">◆</span> Ethereum Mainnet</span><ThemeControl /></div></header>
    <div className="auth-layout">{phoneId ? <MobileApproval key={phoneId} id={phoneId} /> : <SignIn />}</div>
    <footer>Your wallet. Your way in.<span>Signatures prove control. They never share your private key.</span></footer>
  </main>;
}
