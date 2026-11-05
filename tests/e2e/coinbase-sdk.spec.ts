import { expect, test } from '@playwright/test';
import { coinbaseRelay } from './coinbase-sdk-fixture';
import { wallet } from './wallet-fixture';

for (const device of ['desktop','android'] as const) test.describe(`stable Coinbase SDK without an extension on ${device}`,()=>{
  if (device==='android') test.use({userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',viewport:{width:393,height:851},isMobile:true,hasTouch:true});
  test('connects then signs server SIWE through the actual stable SDK and simulated relay',async({page})=>{
    const relay=await coinbaseRelay(page);
    await page.goto('/');
    expect(await page.evaluate(()=>typeof (window as any).ethereum)).toBe('undefined');
    const popupWait=page.waitForEvent('popup');
    await page.getByRole('button',{name:'Sign in with Coinbase Wallet',exact:true}).click();
    const popup=await popupWait;
    await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(wallet.address);
    expect(await popup.evaluate(()=>(window as any).fixtureSdkVersion)).toBe('4.4.0');
    expect(await popup.evaluate(()=>(window as any).fixturePreference.options)).toBe('eoaOnly');
    expect((await page.request.get('/api/session')).status()).toBe(401);
    expect(relay.methods).not.toContain('signEthereumMessage');
    await page.getByRole('button',{name:'Sign message & continue'}).click();
    await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
    expect(relay.methods).toContain('requestEthereumAccounts');
    expect(relay.methods.filter(method=>method==='signEthereumMessage')).toHaveLength(1);
    expect(relay.failures).toEqual([]);
    await page.reload();
    await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect(page.getByTestId('verified-address')).toHaveCount(0);
    expect((await page.request.get('/api/session')).status()).toBe(401);
  });
  test('a rejected SDK signature does not authenticate',async({page})=>{
    const relay=await coinbaseRelay(page,{rejectSignature:true});
    await page.goto('/');
    await page.getByRole('button',{name:'Sign in with Coinbase Wallet',exact:true}).click();
    await expect(page.getByLabel('Sign-in message', {exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Sign message & continue'}).click();
    await expect(page.getByRole('alert')).toContainText('Sign-in was cancelled');
    expect((await page.request.get('/api/session')).status()).toBe(401);
    expect(relay.methods).toContain('signEthereumMessage');
    expect(relay.failures).toEqual([]);
  });
});
