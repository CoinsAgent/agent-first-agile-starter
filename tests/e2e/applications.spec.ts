import { expect,test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { walletLogin } from './management-fixture';
test.use({trace:'off'});
for(const theme of ['light','dark'] as const)test(`${theme} old applications entry gives accessible CLI guidance without session CRUD`,async({page})=>{
 await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.setViewportSize({width:320,height:812});await page.goto('/#applications');
 await expect(page.getByRole('heading',{name:'Manage applications with the CLI'})).toBeVisible();await expect(page.getByText('Browser sessions cannot register or manage clients.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Register application',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 await page.setViewportSize({width:640,height:1000});await page.evaluate(()=>{document.documentElement.style.zoom='2';});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'Review or revoke CLI authorizations'}).focus();await expect(page.getByRole('link',{name:'Review or revoke CLI authorizations'})).toBeFocused();
 await page.screenshot({path:`work/US-004/artifacts/cli-guidance-${theme}.png`,fullPage:true});
});
test('a real wallet session alone cannot create/list/get clients or use provider aliases',async({page})=>{
 await walletLogin(page);expect((await page.request.get('/api/applications')).status()).toBe(401);
 expect((await page.request.post('/api/applications',{headers:{origin:'http://localhost:3100'},data:{name:'Cookie bypass',redirectUris:['https://rp.example/callback'],requestId:crypto.randomUUID()}})).status()).toBe(401);
 expect((await page.request.get('/api/applications/guessed')).status()).toBe(401);
 for(const path of ['register','create-client','update-client','delete-client'])expect((await page.request.post('/api/auth/oauth2/'+path,{headers:{origin:'http://localhost:3100'},data:{}})).status()).toBe(404);
});
