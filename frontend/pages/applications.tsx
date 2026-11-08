import { useCallback, useState } from 'react';
import { Applications } from '../applications';
import type { Session } from '../wallet-auth';
import { SignIn } from './sign-in';

export function ApplicationsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [signInVersion, setSignInVersion] = useState(0);
  const receiveSession = useCallback((next: Session | null) => setSession(next), []);
  const reauthenticate = useCallback(() => { setSession(null); setSignInVersion(v => v + 1); }, []);
  return <div className="applications-page">
    <div hidden={session !== null}>
      <p className="small">Sign in to register or view your applications. <a href="/">Back to sign-in</a></p>
      <SignIn key={signInVersion} onSession={receiveSession} />
    </div>
    <Applications session={session} onReauthenticate={reauthenticate} />
  </div>;
}
