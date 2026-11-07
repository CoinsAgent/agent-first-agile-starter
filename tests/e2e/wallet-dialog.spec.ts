import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { provider, wallet, other } from './wallet-fixture';

for (const choice of ['MetaMask','Rabby']) test(`EIP-6963 choice authenticates the chosen ${choice} account`,async({page})=>{
  await provider(page,{eip6963:true,secondWallet:true});await page.goto('/');
  await page.getByRole('button',{name:`Sign in with ${choice}`,exact:true}).click();
  await expect(page.getByRole('heading',{name:'Choose your wallet'})).toHaveCount(0);
  await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(choice==='Rabby'?other.address:wallet.address);
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByTestId('verified-address')).toHaveText((choice==='Rabby'?other:wallet).address.toLowerCase());
});
test('phone signs a real decoded QR request and only the original desktop receives a session',async({page,browser})=>{
  await page.goto('/');await page.getByRole('button',{name:/Use your phone/}).click();
  const qr=page.getByAltText('QR code to open WalletGate phone approval');await expect(qr).toBeVisible();
  const bytes=Buffer.from((await qr.getAttribute('src'))!.split(',')[1],'base64');const png=PNG.sync.read(bytes);
  const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);expect(decoded).not.toBeNull();
  const url=decoded!.data;expect(url).toMatch(/^http:\/\/localhost:3100\/#approve=[a-f0-9]{64}$/);
  const code=await page.getByTestId('desktop-confirmation').innerText();
  const phoneContext=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (Linux; Android 15) Chrome/130.0 Mobile Safari/537.36'});
  const stranger=await browser.newContext();
  try {
    const phone=await phoneContext.newPage();await provider(phone,{eip6963:true});await phone.goto(url);
    await expect(phone.getByTestId('phone-confirmation')).toHaveText(code);
    await phone.getByRole('button',{name:'Connect MetaMask to review'}).click();await expect(phone.getByLabel('Sign-in message', {exact:true})).toContainText(code);
    await expect(phone.getByRole('button',{name:'Sign and approve desktop login'})).toBeDisabled();
    await phone.getByRole('checkbox').check();await phone.getByRole('button',{name:'Sign and approve desktop login'}).click();
    await expect(phone.getByRole('heading',{name:'Desktop login approved'})).toBeVisible();
    expect((await phone.request.get('/api/session')).status()).toBe(401);
    await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
    expect((await stranger.request.get('http://localhost:3100/api/session')).status()).toBe(401);
    await page.reload();await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
    await page.getByRole('button',{name:'Sign out'}).click();expect((await page.request.get('/api/session')).status()).toBe(401);
  } finally {await phoneContext.close();await stranger.close();}
});
for(const theme of ['light','dark'] as const) test(`${theme} phone popup is keyboard accessible, responsive and network-scoped`,async({page})=>{
  const external:string[]=[],cspErrors:string[]=[];
  page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://localhost:3100/'))external.push(r.url());});
  page.on('console',m=>{if(m.type()==='error'&&/Content Security Policy/.test(m.text()))cspErrors.push(m.text());});
  await provider(page,{eip6963:true});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.goto('/');
  await expect(page.locator('.brand-mark')).toHaveText('W');
  await expect(page.locator('.brand img')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'WalletGate',exact:true})).toBeVisible();
  const trigger=page.getByRole('button',{name:/Use your phone/});await trigger.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog',{name:'Use your phone',exact:true})).toBeVisible();
  await expect(page.locator('html')).toHaveClass(theme==='dark'?'dark':'');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await expect(page.getByAltText('QR code to open WalletGate phone approval')).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  const requestBeforeThemeChange = await page.getByRole('link',{name:'Open phone approval link'}).getAttribute('href');
  await page.emulateMedia({colorScheme:theme==='light'?'dark':'light'});
  await expect(page.getByRole('link',{name:'Open phone approval link'})).toHaveAttribute('href', requestBeforeThemeChange!);
  await page.emulateMedia({colorScheme:theme});
  await page.screenshot({path:`work/US-001-04/artifacts/phone-popup-${theme}.png`,fullPage:true});
  await page.setViewportSize({width:320,height:740});
  await expect(page.getByRole('heading',{name:'Choose your wallet'})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`work/US-001-04/artifacts/phone-popup-mobile-${theme}.png`,fullPage:true});
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(trigger).toBeFocused();
  expect(external).toEqual([]);expect(cspErrors).toEqual([]);
});
test('live theme change preserves an in-flight challenge and selected connector',async({page})=>{
  await provider(page,{eip6963:true});await page.emulateMedia({colorScheme:'light'});await page.goto('/');
  await page.getByRole('button',{name:'Sign in with MetaMask',exact:true}).click();
  await expect(page.getByLabel('Sign-in message', {exact:true})).toBeVisible();const before=await page.getByLabel('Sign-in message', {exact:true}).innerText();
  await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveClass('dark');
  await expect(page.getByLabel('Sign-in message', {exact:true})).toHaveText(before);
  await page.getByRole('button',{name:'Sign message & continue'}).click();await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
});
test('cancelling phone popup invalidates the phone link and permits a fresh attempt',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:/Use your phone/}).click();
  const link=page.getByRole('link',{name:'Open phone approval link'});await expect(link).toBeVisible();const old=await link.getAttribute('href');
  await page.getByRole('button',{name:'Cancel phone approval'}).click();
  await expect.poll(async()=>(await page.request.post('/api/qr/inspect',{data:{id:old!.split('=')[1]},headers:{origin:'http://localhost:3100'}})).status()).toBe(410);
  await page.getByRole('button',{name:/Use your phone/}).click();
  await expect(link).toBeVisible();expect(await link.getAttribute('href')).not.toBe(old);
});
test('switching from a connected MetaMask to Rabby reviews and signs only the newly selected wallet',async({page})=>{
  await provider(page,{eip6963:true,secondWallet:true});await page.goto('/');await page.getByRole('button',{name:'Sign in with MetaMask',exact:true}).click();
  await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(wallet.address);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Sign in with Rabby',exact:true}).click();await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(other.address);
  await page.getByRole('button',{name:'Sign message & continue'}).click();await expect(page.getByTestId('verified-address')).toHaveText(other.address.toLowerCase());
});
test('wallet discovery metadata is text, and phone popup traps keyboard focus',async({page})=>{
  await provider(page,{eip6963:true,rdns:'test.untrusted',walletName:'<img src=x onerror=alert(1)>'});await page.goto('/');
  await page.getByRole('button',{name:/Use your phone/}).click();
  await expect(page.getByRole('button',{name:'Connect <img src=x onerror=alert(1)>',exact:true})).toHaveCount(0);
  // Wallet metadata is text; the separate QR panel may legitimately contain an image.
  expect(await page.locator('.wallet-list').locator('img').count()).toBe(0);
  expect(await page.locator('.sign-in-card [onerror]').count()).toBe(0);
  const dialog=page.getByRole('dialog',{name:'Use your phone',exact:true});
  await expect(dialog).toHaveAttribute('aria-modal','true');
  expect(await dialog.locator('[onerror]').count()).toBe(0);
  await expect(dialog.getByRole('link',{name:'Open phone approval link'})).toBeVisible();
  await dialog.getByRole('button',{name:'Close phone approval'}).focus();
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
  await page.getByRole('button',{name:'Cancel phone approval'}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Use your phone'})).toBeFocused();
});
test('overlapping initial QR creation responses cannot replace the active owner capability',async({page})=>{
  let firstRelease:()=>void=()=>{};let firstSeen:()=>void=()=>{};
  const firstStarted=new Promise<void>(resolve=>{firstSeen=resolve;});
  const release=new Promise<void>(resolve=>{firstRelease=resolve;});let creates=0;
  await page.route('**/api/qr/create',async route=>{
    creates++;const response=await route.fetch();
    if(creates===1){firstSeen();await release;}
    await route.fulfill({response});
  });
  await page.goto('/');await page.getByRole('button',{name:/Use your phone/}).click();
  await firstStarted;
  await page.getByRole('button',{name:'Cancel phone approval'}).click();
  await page.getByRole('button',{name:/Use your phone/}).click();
  firstRelease();await expect(page.getByRole('link',{name:'Open phone approval link'})).toBeVisible();
  const href=await page.getByRole('link',{name:'Open phone approval link'}).getAttribute('href');
  const response=await page.request.post('/api/qr/status',{data:{id:href!.split('=')[1]},headers:{origin:'http://localhost:3100'}});
  expect(response.status()).toBe(200);await expect(page.getByRole('alert')).toHaveCount(0);
});
test('phone approval copy reflects expiry when the desktop never redeems',async({page,browser})=>{
  const create=await page.request.post('/api/qr/create',{data:{},headers:{origin:'http://localhost:3100'}});expect(create.status()).toBe(200);
  const q=await create.json();const context=await browser.newContext();
  try {
    const phone=await context.newPage();await provider(phone,{eip6963:true});await phone.clock.install();await phone.goto(q.approvalUrl);
    await phone.getByRole('button',{name:'Connect MetaMask to review'}).click();await phone.getByRole('checkbox').check();
    await phone.getByRole('button',{name:'Sign and approve desktop login'}).click();await expect(phone.getByRole('heading',{name:'Desktop login approved'})).toBeVisible();
    await phone.clock.fastForward(300_001);await expect(phone.getByRole('status')).toContainText('approval window has expired');
    expect((await phone.request.get('/api/session')).status()).toBe(401);expect((await page.request.get('/api/session')).status()).toBe(401);
  }finally{await context.close();}
});
test('a delayed authenticated-session response cannot replace a newer wallet review',async({page})=>{
  let release:()=>void=()=>{},arrived:()=>void=()=>{};const held=new Promise<void>(resolve=>{release=resolve;});const fetched=new Promise<void>(resolve=>{arrived=resolve;});
  let shouldHold=false;
  await page.route('**/api/session',async route=>{const response=await route.fetch();if(shouldHold){shouldHold=false;arrived();await held;}await route.fulfill({response});});
  await provider(page,{eip6963:true,secondWallet:true});await page.goto('/');await page.getByRole('button',{name:'Sign in with MetaMask',exact:true}).click();
  await expect(page.getByLabel('Sign-in message', {exact:true})).toBeVisible();
  shouldHold=true;await page.getByRole('button',{name:'Sign message & continue'}).click();await fetched;
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Sign in with MetaMask',exact:true}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Sign in with Rabby',exact:true}).click();await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(other.address);
  release();await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(other.address);await expect(page.getByTestId('verified-address')).toHaveCount(0);
  await page.getByRole('button',{name:'Sign message & continue'}).click();await expect(page.getByTestId('verified-address')).toHaveText(other.address.toLowerCase());
});
