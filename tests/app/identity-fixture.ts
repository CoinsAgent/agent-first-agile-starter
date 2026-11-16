import { ManagementBrowser } from './management-fixture';
import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createTestWalletGate as createWalletGate } from './database-fixture';

export const config = { origin: 'http://localhost:3000', secret: 'identity-test-only-secret-012345678901234567890123456789', databasePath: ':memory:' };
export type Gate = Awaited<ReturnType<typeof createWalletGate>>;
export class IdentityBrowser {
  cookies = new Map<string, string>();
  account = privateKeyToAccount(generatePrivateKey());
  constructor(public gate: Gate) {}
  async call(path: string, body?: unknown): Promise<Response> {
    if(path==='applications' || path.startsWith('applications/')) {
      const current=await this.call('session');
      if(current.ok){
        const browser=new ManagementBrowser(this.gate);browser.account=this.account;browser.cookies=this.cookies;
        const clients=this.gate.db.prepare('SELECT clientId FROM oauthClient WHERE referenceId = ?').all(this.account.address.toLowerCase()) as {clientId:string}[];
        const token=await browser.authorize(Object.fromEntries(clients.map(c=>[c.clientId,['read']])));
        if(body!==undefined)return browser.register(token,body);
        return browser.api('/api/'+path,token.access_token);
      }
    }
    const response = await this.gate.handle(new Request(`${config.origin}/api/${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { origin: config.origin, 'content-type': 'application/json', cookie: this.cookie() },
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
    for (const value of response.headers.getSetCookie()) {
      const [key, ...parts] = value.split(';')[0].split('=');
      if (parts.join('=')) this.cookies.set(key, parts.join('=')); else this.cookies.delete(key);
    }
    return response;
  }
  cookie() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '); }
  async proof(address = this.account.address) {
    const challenge = await (await this.call('challenge', { address, chainId: 1 })).json();
    return { message: challenge.message as string, signature: await this.account.signMessage({ message: challenge.message }) };
  }
  async login() { expect((await this.call('verify', await this.proof())).status).toBe(200); }
  register() { return this.call('applications', { name: 'Identity test', redirectUris: ['https://app.example/callback'], requestId: randomUUID() }); }
}
