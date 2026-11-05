import { expect, test } from '@playwright/test';
import { provider, wallet } from './wallet-fixture';
const shortcuts = [
  ['MetaMask','io.metamask'], ['Coinbase Wallet','com.coinbase.wallet'], ['Rabby','io.rabby'], ['Rainbow','me.rainbow'],
] as const;
test('four wallet icons and a phone icon occupy the former action slot and keep mobile reflow',async({page})=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/');
  const group=page.getByRole('group',{name:'Sign in with a wallet'});
  await expect(group.getByRole('button')).toHaveCount(5);
  await expect(page.getByRole('button',{name:'Continue with wallet'})).toHaveCount(0);
  for(const [name] of shortcuts) {
    const icon=group.getByRole('button',{name:`Sign in with ${name}`,exact:true});
    await expect(icon).toBeVisible();
    expect(await icon.locator('img').evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
    const box=await icon.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const phone=group.getByRole('button',{name:'Use your phone',exact:true});
  await expect(phone.locator('svg')).toBeVisible();
  await expect(page.getByRole('button',{name:'Sign in with Trust Wallet',exact:true})).toHaveCount(0);
  expect(await group.getByRole('button').evaluateAll(buttons=>buttons.map(button=>button.getAttribute('aria-label')))).toEqual([...shortcuts.map(([name])=>`Sign in with ${name}`),'Use your phone']);
  const phoneBox=await phone.boundingBox();expect(phoneBox!.width).toBeGreaterThanOrEqual(44);expect(phoneBox!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'work/US-001-01/artifacts/wallet-icons-mobile.png',fullPage:true});
});
for(const [name] of shortcuts) test(`${name} icon uses supported SDK or extension-only recovery when its extension is absent`,async({page})=>{
  await page.goto('/');const icon=page.getByRole('button',{name:`Sign in with ${name}`,exact:true});await icon.click();
  if (name === 'MetaMask' || name === 'Coinbase Wallet') {
    await expect(page.getByRole('button',{name:'Cancel connection'})).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('link',{name:'Open WalletGate in Coinbase'})).toHaveCount(0);
  }
  else await expect(page.getByRole('heading',{name:`${name} connection unavailable`})).toBeVisible();
  await expect(page.getByLabel('Sign-in message', {exact:true})).toHaveCount(0);
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await page.getByRole('button',{name:name === 'MetaMask' || name === 'Coinbase Wallet' ? 'Cancel connection' : 'Back to wallet choices'}).click();await expect(icon).toBeFocused();
});
for(const [name,rdns] of shortcuts) test(`${name} icon connects its detected provider without opening QR`,async({page})=>{
  await provider(page,{eip6963:true,rdns,walletName:name});await page.goto('/');
  await page.getByRole('button',{name:`Sign in with ${name}`,exact:true}).click();
  await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(wallet.address);
  await expect(page.getByRole('heading',{name:'Choose your wallet'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Connect (MetaMask|Rabby)/})).toHaveCount(0);
  await expect(page.getByAltText('QR code to open WalletGate phone approval')).toHaveCount(0);
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
});
test('an absent wallet icon does not silently connect a different installed wallet',async({page})=>{
  await provider(page,{eip6963:true});await page.goto('/');
  await page.getByRole('button',{name:'Sign in with Rabby',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Rabby connection unavailable'})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).ethereum.connectionRequests)).toBe(0);
  await expect(page.getByRole('link',{name:/Get |Install /})).toHaveCount(0);
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

for (const [name, rdns] of [...shortcuts.filter(([name]) => name !== 'MetaMask'), ['Trust Wallet','com.trustwallet.app']]) test(`MetaMask icon does not connect ${name} through a compatibility flag`, async ({page}) => {
  await provider(page, {eip6963:true, rdns, walletName:name, metaMask:true}); await page.goto('/');
  await page.getByRole('button', {name:'Sign in with MetaMask',exact:true}).click();
  await expect(page.getByRole('button',{name:'Cancel connection'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Choose your wallet'})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).ethereum.connectionRequests)).toBe(0);
  await expect(page.getByLabel('Sign-in message', {exact:true})).toHaveCount(0);
});
