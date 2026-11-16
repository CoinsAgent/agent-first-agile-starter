import { test,expect,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { mkdtempSync,rmSync,readFileSync,statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { walletLogin,cliQuery,manager,registerRp,origin } from './management-fixture';
test.use({trace:'off'});
function launch(args:string[]){const child=spawn(process.execPath,['--import','tsx','cli/index.ts',...args],{stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const lines:string[]=[];const waiters:((value:string)=>void)[]=[];child.stdout.on('data',chunk=>{stdout+=chunk;for(const line of String(chunk).trim().split('\n')){if(waiters.length)waiters.shift()!(line);else lines.push(line);}});child.stderr.on('data',chunk=>stderr+=chunk);return {child,line:()=>lines.length?Promise.resolve(lines.shift()!):new Promise<string>(r=>waiters.push(r)),done:new Promise<{status:number|null;stdout:string;stderr:string}>(resolve=>child.once('close',status=>resolve({status,stdout,stderr})))};}
async function loginCli(page:Page,dir:string,chooseTargets=false){
 const process=launch(['login','--origin',origin,'--state-dir',dir,'--no-open','--label','My Linux CLI']);
 const event=JSON.parse(await process.line());await page.goto(event.authorization_url);await expect(page.getByRole('heading',{name:'Authorize WalletGate CLI'})).toBeVisible();
 await page.getByLabel('Create new applications using single-use IATs').check();
 if(chooseTargets){await page.getByLabel('Read configuration').check();await page.getByLabel('Update name and redirects').check();await page.getByLabel('Permanently delete',{exact:true}).check();}
 await page.getByRole('button',{name:'Allow selected access'}).click();const result=await process.done;expect(result.status,result.stderr).toBe(0);return result;
}
for(const theme of ['light','dark'] as const)test(`${theme} target consent and individual revocation are accessible, keyboard usable and responsive`,async({page})=>{
 await walletLogin(page);await registerRp(page,'Untrusted <script>name</script>');await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:375,height:812});
 const {query}=cliQuery();await page.goto('/api/auth/oauth2/authorize?'+query);await expect(page.getByRole('button',{name:'Allow selected access'})).toBeVisible();
 expect(await page.getByLabel('Read configuration').isChecked()).toBe(false);expect(await page.getByLabel('Create new applications using single-use IATs').isChecked()).toBe(false);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Read configuration').focus();await page.keyboard.press('Space');await expect(page.getByLabel('Read configuration')).toBeChecked();await page.setViewportSize({width:750,height:1000});await page.evaluate(()=>{document.documentElement.style.zoom='2';});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>{document.documentElement.style.zoom='1';});await page.setViewportSize({width:375,height:812});
 await page.screenshot({path:`work/US-004/artifacts/management-consent-${theme}.png`,fullPage:true});
 const a=await manager(page),b=await manager(page);await page.goto('/#authorizations');await expect(page.getByRole('heading',{name:'CLI authorizations',exact:true})).toBeVisible();
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 const entry=page.locator('article').filter({hasText:a.authorization_id});await entry.getByRole('button',{name:'Revoke Browser test CLI',exact:true}).click();await entry.getByRole('button',{name:'Confirm revoke',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Selected authorization revoked'})).toBeVisible();
 expect((await page.request.get('/api/applications',{headers:{authorization:'Bearer '+a.access_token}})).status()).toBe(401);expect((await page.request.get('/api/applications',{headers:{authorization:'Bearer '+b.access_token}})).status()).toBe(200);
 await page.screenshot({path:`work/US-004/artifacts/management-authorizations-${theme}.png`,fullPage:true});
});
test('actual CLI/skill commands log in, save one-time secret, consent to a target, update, delete and revoke',async({page})=>{
 const dir=mkdtempSync(join(tmpdir(),'walletgate-cli-browser-'));
 try{
  await walletLogin(page);await loginCli(page,dir);
  const run=async(args:string[])=>{const result=await launch([...args,'--state-dir',dir]).done;expect(result.status,result.stderr).toBe(0);return {result,value:JSON.parse(result.stdout.trim().split('\n').pop()!)};};
  const requestId=randomUUID();const created=await run(['create','--name','CLI RP','--redirect','https://rp.example/callback','--request-id',requestId]);const id=created.value.application.clientId;
  expect(created.value).not.toHaveProperty('clientSecret');expect(created.result.stdout).not.toContain('"client_secret":');expect(statSync(created.value.secret_file).mode&0o777).toBe(0o600);const secret=JSON.parse(readFileSync(created.value.secret_file,'utf8')).client_secret;expect(created.result.stdout).not.toContain(secret);
  const replay=await run(['create','--name','CLI RP','--redirect','https://rp.example/callback','--request-id',requestId]);expect(replay.value.replayed).toBe(true);expect(replay.value.secret_file).toBeUndefined();
  expect((await run(['list'])).value.applications).toEqual([]);await loginCli(page,dir,true);
  expect((await run(['list'])).value.applications.map((c:{clientId:string})=>c.clientId)).toEqual([id]);
  expect((await run(['get',id])).value.application.name).toBe('CLI RP');await run(['update',id,'--name','Updated CLI RP','--redirect','https://rp.example/new']);expect((await run(['get',id])).value.application.name).toBe('Updated CLI RP');

  await run(['delete',id,'--yes']);expect((await run(['list'])).value.applications).toEqual([]);await run(['logout']);expect(()=>readFileSync(join(dir,'default.json'))).toThrow();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('expired approval announces restart and removes consent actions',async({page})=>{
 await walletLogin(page);const {query}=cliQuery();await page.route('**/api/management/approval/*',async route=>{const response=await route.fetch();await route.fulfill({response,json:{...await response.json(),expiresAt:Date.now()+200}});});await page.goto('/api/auth/oauth2/authorize?'+query);await expect(page.getByRole('alert')).toContainText('expired');await expect(page.getByRole('button',{name:'Allow selected access'})).toHaveCount(0);
});
