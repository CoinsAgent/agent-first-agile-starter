import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { createTestWalletGate } from './database-fixture';
export const managementOrigin='http://localhost:3000';
export type TestGate=Awaited<ReturnType<typeof createTestWalletGate>>;
export class ManagementBrowser {
  account=privateKeyToAccount(generatePrivateKey());
  cookies=new Map<string,string>();
  constructor(public gate:TestGate, public origin=managementOrigin){}
  async request(path:string,body?:unknown,method=body===undefined?'GET':'POST'){
    const headers=new Headers({origin:this.origin,cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ')});
    if(body!==undefined)headers.set('content-type','application/json');
    const response=await this.gate.handle(new Request(this.origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}));
    for(const cookie of response.headers.getSetCookie()){const [k,...v]=cookie.split(';')[0].split('=');this.cookies.set(k,v.join('='));}
    return response;
  }
  async login(){
    const challenge=await(await this.request('/api/challenge',{address:this.account.address,chainId:1})).json();
    const response=await this.request('/api/verify',{message:challenge.message,signature:await this.account.signMessage({message:challenge.message})});expect(response.status).toBe(200);
  }
  async begin(extra:Record<string,string>={}){
    const verifier=randomBytes(32).toString('base64url');
    const query=new URLSearchParams({client_id:'walletgate-cli',response_type:'code',redirect_uri:'http://127.0.0.1:54321/callback',scope:'clients:manage clients:register offline_access',state:randomBytes(24).toString('base64url'),code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',resource:'urn:walletgate:management',walletgate_label:'Test CLI',...extra});
    const response=await this.request('/api/auth/oauth2/authorize?'+query);
    expect(response.status,await response.clone().text()).toBe(302);
    return {id:response.headers.get('location')!.split('=')[1],verifier,query};
  }
  async authorize(permissions:Record<string,string[]>={},registration=true,extra:Record<string,string>={}){
    const flow=await this.begin(extra);
    const review=await this.request('/api/management/approval/'+flow.id);expect(review.status,await review.clone().text()).toBe(200);
    const consent=await this.request('/api/management/approval/'+flow.id,{accept:true,registration,permissions});
    expect(consent.status,await consent.clone().text()).toBe(200);
    const result=await consent.json();expect(result.redirect).toBe(true);
    const code=new URL(result.url).searchParams.get('code')!;
    const response=await this.exchange({grant_type:'authorization_code',code,code_verifier:flow.verifier,redirect_uri:flow.query.get('redirect_uri')!});
    expect(response.status,await response.clone().text()).toBe(200);
    return response.json();
  }
  exchange(fields:Record<string,string>,endpoint='token'){
    return this.gate.handle(new Request(this.origin+'/api/auth/oauth2/'+endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:'walletgate-cli',...fields})}));
  }
  api(path:string,token:string,body?:unknown,method=body===undefined?'GET':'POST',extra:Record<string,string>={}){
    return this.gate.handle(new Request(this.origin+path,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)}));
  }
  async register(tokens?:{access_token:string},body?:unknown){
    const auth=tokens??await this.authorize();
    const response=await this.api('/api/management/iat',auth.access_token,{});expect(response.status,await response.clone().text()).toBe(201);
    const iat=await response.json();
    return this.api('/api/applications',iat.initial_access_token,body??{name:'Managed RP',redirectUris:['https://rp.example/callback'],requestId:randomUUID()});
  }
}
