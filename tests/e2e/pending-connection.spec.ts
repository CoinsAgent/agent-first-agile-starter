import { expect, test } from '@playwright/test';
import { provider, wallet } from './wallet-fixture';

for (const [name,rdns] of [['MetaMask','io.metamask'],['Coinbase Wallet','com.coinbase.wallet']]) {
  test(`${name} permits one connection attempt until cancellation or completion`,async({page})=>{
    await provider(page,{eip6963:true,rdns,walletName:name});
    let release:()=>void=()=>{},arrived:()=>void=()=>{};
    const held=new Promise<void>(resolve=>{release=resolve;});
    const seen=new Promise<void>(resolve=>{arrived=resolve;});let first=true;
    await page.route('**/api/challenge',async route=>{
      if(first){first=false;arrived();await held;}
      await route.continue();
    });
    await page.goto('/');
    const icon=page.getByRole('button',{name:`Sign in with ${name}`,exact:true});
    // Two synchronous DOM clicks also cover the gap before React renders disabled state.
    await icon.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
    await seen;
    for(const button of await page.locator('.wallet-shortcut').all()) await expect(button).toBeDisabled();
    expect(await page.evaluate(()=>(window as any).ethereum.connectionRequests)).toBe(1);
    await page.getByRole('button',{name:'Cancel connection',exact:true}).click();
    await expect(icon).toBeEnabled();
    release();
    await icon.click();
    await expect(page.getByLabel('Sign-in message',{exact:true})).toContainText(wallet.address);
    await page.getByRole('button',{name:'Sign message & continue'}).click();
    await expect(page.getByTestId('verified-address')).toBeVisible();
    // Freeze the connector's 100ms permission-revocation timeout while inspecting cleanup state.
    await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
    // Keep wallet cleanup pending after the server session has already ended.
    await page.evaluate(()=>{
      const eth=(window as any).ethereum;const request=eth.request.bind(eth);
      eth.request=async(args:any)=>{
        if(args.method==='wallet_revokePermissions') await new Promise<void>(resolve=>{eth.releaseDisconnect=resolve;});
        return request(args);
      };
    });
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>typeof (window as any).ethereum.releaseDisconnect)).toBe('function');
    expect((await page.request.get('/api/session')).status()).toBe(401);
    await expect(icon).toBeDisabled();
    await icon.evaluate((button:HTMLButtonElement)=>button.click());
    await page.evaluate(()=>(window as any).ethereum.releaseDisconnect());
    await expect(icon).toBeEnabled();await expect(page.getByRole('alert')).toHaveCount(0);
    await page.clock.resume();
  });
}
