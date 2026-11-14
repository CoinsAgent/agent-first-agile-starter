import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { provider } from './wallet-fixture';

test.use({ trace: 'off' });
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
const origin='http://localhost:3100';
async function prepare(page:Page,name='Example application'){
  const account=privateKeyToAccount(generatePrivateKey());
  const challenge=await(await page.request.post('/api/challenge',{headers:{origin},data:{address:account.address,chainId:1}})).json();
  expect((await page.request.post('/api/verify',{headers:{origin},data:{message:challenge.message,signature:await account.signMessage({message:challenge.message})}})).status()).toBe(200);
  const response=await page.request.post('/api/applications',{headers:{origin},data:{name,redirectUris:['https://rp.example/callback'],requestId:randomUUID()}});expect(response.status()).toBe(201);
  const client=await response.json();const verifier=randomBytes(32).toString('base64url');
  const query=new URLSearchParams({client_id:client.application.clientId,redirect_uri:'https://rp.example/callback',response_type:'code',scope:'openid offline_access',state:'browser-state',nonce:'browser-nonce',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
  return {client,verifier,path:'/api/auth/oauth2/authorize?'+query};
}
for(const theme of ['light','dark'] as const)test(`${theme} consent is accessible at narrow width and keyboard approval completes the real token flow`,async({page})=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:375,height:812});
  const setup=await prepare(page,'<script>Owner supplied application name</script>');
  await page.route('https://rp.example/callback**',route=>route.fulfill({contentType:'text/html',body:'<h1>Application callback</h1>'}));
  await page.goto(setup.path);await expect(page.getByRole('heading',{name:'Approve application sign-in'})).toBeVisible();await expect(page.getByRole('button',{name:'Allow',exact:true})).toBeVisible();
  await expect(page.getByText('Continued access:',{exact:false})).toContainText('including after you sign out');
  expect(await page.locator('script').filter({hasText:'Owner supplied'}).count()).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:`work/US-003/artifacts/consent-mobile-${theme}.png`,fullPage:true});
  await page.getByRole('button',{name:'Deny',exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Allow',exact:true})).toBeFocused();await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/^https:\/\/rp.example\/callback/);
  const code=new URL(page.url()).searchParams.get('code')!;expect(new URL(page.url()).searchParams.get('state')).toBe('browser-state');
  const response=await page.request.post(origin+'/api/auth/oauth2/token',{headers:{authorization:'Basic '+Buffer.from(setup.client.application.clientId+':'+setup.client.clientSecret).toString('base64')},form:{grant_type:'authorization_code',code,code_verifier:setup.verifier,redirect_uri:'https://rp.example/callback'}});expect(response.status()).toBe(200);
  const tokens=await response.json();expect(typeof tokens.refresh_token).toBe('string');
  expect((await page.request.get(origin+'/api/auth/oauth2/userinfo',{headers:{authorization:'Bearer '+tokens.access_token}})).status()).toBe(200);
});
test('unauthenticated authorization signs through wallet UI before consent and denies safely',async({page})=>{
  const setup=await prepare(page);await page.request.post('/api/logout',{headers:{origin},data:{}});await provider(page);
  await page.route('https://rp.example/callback**',route=>route.fulfill({contentType:'text/html',body:'<h1>Application callback</h1>'}));
  await page.goto(setup.path);await expect(page.getByRole('button',{name:'Sign in with MetaMask',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sign in with MetaMask',exact:true}).click();await page.getByRole('button',{name:'Sign message & continue',exact:true}).click();
  await expect(page.getByRole('button',{name:'Allow',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Deny',exact:true}).click();await expect(page).toHaveURL(/error=access_denied/);expect(new URL(page.url()).searchParams.has('code')).toBe(false);
});
test('one pending click yields one consent submission and zoom preserves actions',async({page})=>{
  const setup=await prepare(page);await page.goto(setup.path);await expect(page.getByRole('button',{name:'Allow',exact:true})).toBeVisible();
  await page.evaluate(()=>{document.documentElement.style.zoom='2';});await expect(page.getByRole('button',{name:'Deny',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  let count=0;await page.route('**/api/authorization/*',async route=>{if(route.request().method()==='POST'){count++;await new Promise(r=>setTimeout(r,150));await route.fulfill({status:409,contentType:'application/json',body:'{"error":"Session changed. Review consent again."}'});}else await route.continue();});
  await page.getByRole('button',{name:'Allow',exact:true}).dblclick({force:true});await expect(page.getByRole('alert')).toContainText('Review consent again');expect(count).toBe(1);
});
test('forced login replaces the old session and returns to explicit consent',async({page})=>{
  const setup=await prepare(page);await provider(page);await page.goto(setup.path+'&prompt=login');
  await expect(page.getByRole('button',{name:'Sign in again',exact:true})).toBeVisible();await page.getByRole('button',{name:'Sign in again',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sign in with MetaMask',exact:true})).toBeVisible();await page.getByRole('button',{name:'Sign in with MetaMask',exact:true}).click();await page.getByRole('button',{name:'Sign message & continue',exact:true}).click();
  await expect(page.getByRole('button',{name:'Allow',exact:true})).toBeVisible();
});
test('expired consent removes approval actions and announces how to restart',async({page})=>{
  const setup=await prepare(page);await page.route('**/api/authorization/*',async route=>{const response=await route.fetch();const value=await response.json();await route.fulfill({response,json:{...value,expiresAt:Date.now()+200}});});
  await page.goto(setup.path);await expect(page.getByRole('alert')).toContainText('Authorization expired');await expect(page.getByRole('button',{name:'Allow',exact:true})).toHaveCount(0);
});
