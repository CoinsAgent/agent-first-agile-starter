import { expect, test } from '@playwright/test';
import { provider, wallet } from './wallet-fixture';

for (const [name,rdns] of [['MetaMask','io.metamask'],['Coinbase Wallet','com.coinbase.wallet']]) {
  test(`${name} skips the connection screen, cancels pending review safely and retries directly into SIWE`,async({page})=>{
    await provider(page,{eip6963:true,rdns,walletName:name});
    let release:(()=>void)|undefined;let first=true;
    await page.route('**/api/challenge',async route=>{
      if(first){first=false;await new Promise<void>(resolve=>{release=resolve;});}
      await route.continue();
    });
    await page.goto('/');
    const icon=page.getByRole('button',{name:`Sign in with ${name}`,exact:true});
    await icon.click();
    await expect.poll(()=>typeof release).toBe('function');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading',{name:/Continue with/})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Cancel connection'})).toBeVisible();
    expect((await page.request.get('/api/session')).status()).toBe(401);
    await page.getByRole('button',{name:'Cancel connection'}).click();
    await expect(icon).toBeFocused();
    const challengeReturned=page.waitForResponse(response=>response.url().endsWith('/api/challenge'));
    release!();await challengeReturned;
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByLabel('Sign-in message', {exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>(window as any).ethereum.completedSignatures)).toBe(0);
    await icon.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading',{name:'2 Review and sign',exact:true})).toHaveCount(1);
    await expect(page.getByRole('heading',{name:/Continue with/})).toHaveCount(0);
    await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(wallet.address);
    expect(await page.evaluate(()=>(window as any).ethereum.completedSignatures)).toBe(0);
    await page.getByRole('button',{name:'Sign message & continue'}).click();
    await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
  });
}
