import { useCallback } from 'react';
import { Consent } from '../authorization';
import { SignIn } from './sign-in';
import type { Session } from '../wallet-auth';
function AuthorizationSignIn({ ready }: { ready: () => void }) {
  const onSession = useCallback((session: Session | null) => { if (session) ready(); }, [ready]);
  return <SignIn onSession={onSession} />;
}
export function ConsentPage({ id }: { id: string }) {
  return <Consent id={id} signIn={ready => <AuthorizationSignIn ready={ready} />} />;
}
