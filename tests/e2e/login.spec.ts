import { expect, test, type Page } from '@playwright/test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { hexToString, type Hex } from 'viem';

const wallet = privateKeyToAccount(generatePrivateKey());
const other = privateKeyToAccount(generatePrivateKey());
// Real EIP-191 signatures behind a simulated provider. This is NOT a MetaMask/device compatibility test.
async function provider(page: Page, options: { chain?: string; metaMask?: boolean; switchBehavior?: 'approve' | 'reject'; injectDelay?: number; unsupportedPermissions?: boolean } = {}) {
  await page.exposeFunction('walletTestSign', (message: Hex) => wallet.signMessage({ message: hexToString(message) }));
  await page.addInitScript(({ address, otherAddress, chain, metaMask, switchBehavior, injectDelay, unsupportedPermissions }) => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const eth = {
      switchBehavior, switchRequests: 0, isMetaMask: metaMask, selectedAddress: address, chainId: chain, rejectSignature: false, rejectConnection: false, changeOnSign: false, disconnectOnSign: false, deferSignature: false, completedSignatures: 0, releaseSignature: undefined as undefined | (()=>void),
      on(event: string, callback: (...args:unknown[])=>void) { if(!listeners.has(event)) listeners.set(event,new Set()); listeners.get(event)!.add(callback); },
      removeListener(event: string, callback: (...args:unknown[])=>void) { listeners.get(event)?.delete(callback); },
      emit(event: string, value: unknown) { for(const cb of listeners.get(event)??[]) cb(value); },
      async request({ method, params }: { method: string; params?: unknown[] }) {
        if (this.rejectConnection && ['eth_requestAccounts','wallet_requestPermissions'].includes(method)) throw Object.assign(new Error('Connection rejected'),{code:4001});
        if (method === 'wallet_requestPermissions' && unsupportedPermissions) throw Object.assign(new Error('Method not supported'),{code:4200});
        if (method === 'wallet_switchEthereumChain') {
          this.switchRequests++;
          if(this.switchBehavior==='reject') throw Object.assign(new Error('Switch rejected'),{code:4001});
          if(this.switchBehavior==='approve') { this.chainId=(params![0] as {chainId:string}).chainId; this.emit('chainChanged',this.chainId); return null; }
          throw Object.assign(new Error('Switch unsupported'),{code:4200});
        }
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [this.selectedAddress];
        if (method === 'eth_chainId') return this.chainId;
        if (method === 'wallet_requestPermissions' || method === 'wallet_getPermissions') return [{ parentCapability:'eth_accounts', caveats:[{ type:'restrictReturnedAccounts', value:[this.selectedAddress] }] }];
        if (method === 'wallet_revokePermissions') return null;
        if (method === 'personal_sign') {
          if (this.deferSignature) { this.deferSignature=false; await new Promise<void>(resolve=>{this.releaseSignature=resolve;}); }
          if (this.rejectSignature) { this.rejectSignature=false; throw Object.assign(new Error('User rejected'),{code:4001}); }
          if (this.changeOnSign) { this.selectedAddress=otherAddress; this.emit('accountsChanged',[otherAddress]); }
          if (this.disconnectOnSign) this.emit('disconnect', {code:4900,message:'Disconnected'});
          const signature = await (window as unknown as { walletTestSign: (message: unknown)=>Promise<string> }).walletTestSign(params![0]);
          this.completedSignatures++;
          return signature;
        }
        throw new Error(`Unexpected wallet method ${method}`);
      },
    };
    const inject=()=>{Object.defineProperty(window,'ethereum',{ value:eth, configurable:true }); window.dispatchEvent(new Event('ethereum#initialized'));};
    if(injectDelay) setTimeout(inject,injectDelay); else inject();
  }, { address:wallet.address, otherAddress:other.address, chain:options.chain ?? '0x1', metaMask:options.metaMask ?? true, switchBehavior:options.switchBehavior, injectDelay:options.injectDelay, unsupportedPermissions:options.unsupportedPermissions });
}
async function review(page: Page) {
  await page.goto('/');
  await page.getByRole('button',{ name:'Connect MetaMask' }).click();
  await expect(page.getByLabel('Sign-in message')).toBeVisible();
}

test('connect, review, sign, reload and logout with a simulated EOA provider', async ({ page }) => {
  await provider(page); await review(page);
  await expect(page.getByLabel('Sign-in message')).toContainText('Chain ID: 1');
  await expect(page.getByRole('heading',{ name:'You’re signed in.' })).toHaveCount(0);
  await page.getByRole('button',{ name:'Sign message & continue' }).click();
  await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
  await page.reload();
  await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
  await page.getByRole('button',{ name:'Sign out' }).click();
  await expect(page.getByRole('button',{ name:'Connect MetaMask' })).toBeVisible();
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

test('missing MetaMask offers a recovery action without authenticating', async ({page}) => {
  await page.goto('/'); await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByRole('alert')).toContainText('Unlock MetaMask');
  await expect(page.getByRole('button',{name:'Connect MetaMask'})).toBeEnabled();
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

test('other injected wallets are outside the supported connection path', async ({page}) => {
  await provider(page,{metaMask:false}); await page.goto('/');
  await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

test('unsupported chain cannot reach signature review', async ({page}) => {
  await provider(page,{chain:'0xa'}); await page.goto('/');
  await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByRole('alert')).toContainText('Ethereum Mainnet');
  await expect(page.getByLabel('Sign-in message')).toHaveCount(0);
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

test('signature rejection permits a fresh successful attempt', async ({page}) => {
  await provider(page); await review(page);
  const oldMessage=await page.getByLabel('Sign-in message').textContent();
  await page.evaluate(()=>{ (window as any).ethereum.rejectSignature=true; });
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByRole('alert')).toContainText('cancelled');
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await page.getByRole('button',{name:'Review a new sign-in message'}).click();
  await expect(page.getByLabel('Sign-in message')).toBeVisible();
  expect(await page.getByLabel('Sign-in message').textContent()).not.toBe(oldMessage);
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
});

test('cancelling review grants no session', async ({page}) => {
  await provider(page); await review(page);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByLabel('Sign-in message')).toHaveCount(0);
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

test('changing accounts before signing discards the reviewed message', async ({page}) => {
  await provider(page); await review(page);
  await page.evaluate(address=>{ const eth=(window as any).ethereum; eth.selectedAddress=address; eth.emit('accountsChanged',[address]); },other.address);
  await expect(page.getByLabel('Sign-in message')).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('Wallet account or network changed');
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

for(const event of ['changeOnSign','disconnectOnSign']) test(`${event} while signing cannot submit a stale signature`, async ({page}) => {
  await provider(page); await review(page);
  let submitted=false; page.on('request',r=>{if(r.url().endsWith('/api/verify')) submitted=true;});
  await page.evaluate(key=>{ (window as any).ethereum[key]=true; },event);
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Sign-in message')).toHaveCount(0);
  expect(submitted).toBe(false);
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

test('narrow viewport keeps the message and controls usable (simulated viewport only)', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await provider(page); await review(page);
  await expect(page.getByRole('button',{name:'Sign message & continue'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:'work/US-001/artifacts/mobile-simulation.png',fullPage:true});
});

test('desktop sign-in screen has no page errors or horizontal overflow', async ({page}) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/'); await expect(page.getByRole('button',{name:'Connect MetaMask'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:'work/US-001/artifacts/desktop.png',fullPage:true});
  expect(errors).toEqual([]);
});


test('a late signature response cannot clear a newer account review', async ({page}) => {
  await provider(page); await review(page);
  await page.evaluate(()=>{ (window as any).ethereum.deferSignature=true; });
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect.poll(()=>page.evaluate(()=>typeof (window as any).ethereum.releaseSignature)).toBe('function');
  await page.evaluate(address=>{ const eth=(window as any).ethereum; eth.selectedAddress=address; eth.emit('accountsChanged',[address]); },other.address);
  await expect(page.getByLabel('Sign-in message')).toHaveCount(0);
  await page.getByRole('button',{name:'Review a new sign-in message'}).click();
  await expect(page.getByLabel('Sign-in message')).toContainText(other.address);
  const current=await page.getByLabel('Sign-in message').textContent();
  await page.evaluate(()=>{(window as any).ethereum.releaseSignature();});
  await expect.poll(()=>page.evaluate(()=>(window as any).ethereum.completedSignatures)).toBe(1);
  // The old signing promise completed; its state updates must be ignored.
  await expect(page.getByRole('button',{name:'Sign message & continue'})).toBeEnabled();
  await expect(page.getByLabel('Sign-in message')).toHaveText(current!);
  expect((await page.request.get('/api/session')).status()).toBe(401);
});


test('connection rejection leaves no session and permits retry', async ({page}) => {
  await provider(page); await page.goto('/');
  await page.evaluate(()=>{(window as any).ethereum.rejectConnection=true;});
  await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByRole('alert')).toContainText('approve the connection');
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await page.evaluate(()=>{(window as any).ethereum.rejectConnection=false;});
  await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByLabel('Sign-in message')).toBeVisible();
});


test('requests mainnet for a mobile-style provider on another network and completes sign-in', async ({page}) => {
  await provider(page,{chain:'0xa',switchBehavior:'approve',unsupportedPermissions:true});
  await review(page);
  expect(await page.evaluate(()=>(window as any).ethereum.switchRequests)).toBe(1);
  await expect(page.getByLabel('Sign-in message')).toContainText('Chain ID: 1');
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
});

test('waits for a provider injected after the connect click', async ({page}) => {
  await provider(page,{injectDelay:1500});
  await page.goto('/');await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByLabel('Sign-in message')).toBeVisible();
});

test('Android Chrome without an injected provider gives in-app browser guidance', async ({browser}) => {
  const context=await browser.newContext({userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'});
  try {
    const page=await context.newPage();await page.goto('/');
    await page.getByRole('button',{name:'Connect MetaMask'}).click();
    await expect(page.getByRole('alert')).toContainText('Open this site inside MetaMask');
    expect((await page.request.get('/api/session')).status()).toBe(401);
  } finally {await context.close();}
});


test('switching an already connected wallet to mainnet recovers without invalidating its new review', async ({page}) => {
  await provider(page,{chain:'0xa'});await page.goto('/');
  await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByRole('alert')).toContainText('chain ID 10');
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await page.evaluate(()=>{(window as any).ethereum.switchBehavior='approve';});
  await page.getByRole('button',{name:'Switch to Ethereum Mainnet'}).click();
  await expect(page.getByLabel('Sign-in message')).toContainText('Chain ID: 1');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
});

test('declining the network switch grants no access and allows retry', async ({page}) => {
  await provider(page,{chain:'0xa',switchBehavior:'reject'});await page.goto('/');
  await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await expect(page.getByLabel('Sign-in message')).toHaveCount(0);
  await page.evaluate(()=>{(window as any).ethereum.switchBehavior='approve';});
  await page.getByRole('button',{name:'Connect MetaMask'}).click();
  await expect(page.getByLabel('Sign-in message')).toContainText('Chain ID: 1');
});
