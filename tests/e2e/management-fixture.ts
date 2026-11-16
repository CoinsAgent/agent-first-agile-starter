import { expect,type Page } from '@playwright/test';
import { createHash,randomBytes,randomUUID } from 'node:crypto';
import { generatePrivateKey,privateKeyToAccount } from 'viem/accounts';
export const origin='http://localhost:3100';
export async function walletLogin(page:Page){
 const account=privateKeyToAccount(generatePrivateKey());
 const challenge=await(await page.request.post('/api/challenge',{headers:{origin},data:{address:account.address,chainId:1}})).json();
 expect((await page.request.post('/api/verify',{headers:{origin},data:{message:challenge.message,signature:await account.signMessage({message:challenge.message})}})).status()).toBe(200);return account;
}
export function cliQuery(){const verifier=randomBytes(32).toString('base64url');return {verifier,query:new URLSearchParams({client_id:'walletgate-cli',response_type:'code',redirect_uri:'http://127.0.0.1:54321/callback',scope:'clients:manage clients:register offline_access',state:randomBytes(24).toString('base64url'),code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',resource:'urn:walletgate:management',walletgate_label:'Browser test CLI'})};}
export async function manager(page:Page,permissions:Record<string,string[]>={}){
 const {verifier,query}=cliQuery();const begin=await page.request.get('/api/auth/oauth2/authorize?'+query,{maxRedirects:0});expect(begin.status()).toBe(302);const id=begin.headers().location.split('=')[1];
 expect((await page.request.get('/api/management/approval/'+id)).status()).toBe(200);
 const consent=await page.request.post('/api/management/approval/'+id,{headers:{origin},data:{accept:true,registration:true,permissions}});expect(consent.status()).toBe(200);const code=new URL((await consent.json()).url).searchParams.get('code')!;
 const response=await page.request.post('/api/auth/oauth2/token',{form:{client_id:'walletgate-cli',grant_type:'authorization_code',code,code_verifier:verifier,redirect_uri:query.get('redirect_uri')!}});expect(response.status()).toBe(200);return response.json();
}
export async function registerRp(page:Page,name='Example application'){
 const token=await manager(page);const iat=await(await page.request.post('/api/management/iat',{headers:{authorization:'Bearer '+token.access_token},data:{}})).json();
 const response=await page.request.post('/api/applications',{headers:{authorization:'Bearer '+iat.initial_access_token},data:{name,redirectUris:['https://rp.example/callback'],requestId:randomUUID()}});expect(response.status()).toBe(201);return response.json();
}
