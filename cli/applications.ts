import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { CliError,refresh,storage,writePrivate } from './auth';
export async function command(store:ReturnType<typeof storage>,operation:string,flags:Map<string,string[]>,args:string[]){
  let credential=store.read();if(!credential)throw new CliError('Run login first.',3);
  if(credential.expires_at*1000<=Date.now())credential=await refresh(store,credential);
  async function api(path:string,method='GET',body?:unknown,token?:string,extra:Record<string,string>={}){
    const send=()=>fetch(credential!.origin+path,{method,redirect:'error',headers:{authorization:'Bearer '+(token??credential!.access_token),'content-type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    let response=await send();
    if(response.status===401&&!token){credential=await refresh(store,credential!);response=await send();}
    const value=await response.json();
    if(!response.ok)throw new CliError(value.error??'Management request failed.',response.status===401?3:response.status===429?5:response.status===404?6:2);
    return value;
  }
  if(operation==='iat'){
    const value=await api('/api/management/iat','POST',{});const file=join(store.directory,'iat-'+credential.authorization_id+'.json');writePrivate(file,value);return {iat_file:file,expires_at:value.expires_at};
  }
  if(operation==='create'){
    const name=flags.get('name')?.[0],redirectUris=flags.get('redirect')??[];
    if(!name||!redirectUris.length)throw new CliError('create requires --name and one or more --redirect values.',2);
    const requestId=flags.get('request-id')?.[0]??randomUUID();
    const body={name,redirectUris,requestId};
    console.log(JSON.stringify({registration_request_id:requestId}));
    const iat=await api('/api/management/iat','POST',{});
    const response=await fetch(credential.origin+'/api/applications',{method:'POST',redirect:'error',headers:{authorization:'Bearer '+iat.initial_access_token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const value=await response.json();if(!response.ok)throw new CliError(value.error??'Registration failed. Retry the same request ID.',response.status===429?5:2);
    if(value.clientSecret){
      const path=flags.get('secret-file')?.[0]??join(store.directory,'client-'+value.application.clientId+'.json');
      if(!/^[A-Za-z0-9_-]{1,128}$/.test(value.application.clientId))throw new CliError('Unexpected client ID. Registration may have committed; keep the request ID.',1);
      try{writePrivate(path,{client_id:value.application.clientId,client_secret:value.clientSecret});}
      catch{throw new CliError('Registration committed but its one-time secret could not be saved. Retain the request ID; the secret cannot be recovered. See the documented consented deletion/replacement procedure.',1);}
      delete value.clientSecret;value.secret_file=path;
    }
    return {...value,requestId};
  }
  if(operation==='list')return api('/api/applications');
  const id=args[0];if(!id)throw new CliError(operation+' requires a client ID.',2);
  const path='/api/applications/'+encodeURIComponent(id);
  if(operation==='get')return api(path);
  if(operation==='update'){
    const name=flags.get('name')?.[0],redirectUris=flags.get('redirect')??[];if(!name||!redirectUris.length)throw new CliError('update requires the complete --name and --redirect set.',2);
    return api(path,'PATCH',{name,redirectUris});
  }
  if(operation==='delete'){
    if(!flags.has('yes')){
      if(!process.stdin.isTTY)throw new CliError('Noninteractive deletion requires --yes.',2);
      const prompt=createInterface({input:process.stdin,output:process.stderr});
      try{if(await prompt.question('Permanently delete '+id+'? Type the client ID: ')!==id)throw new CliError('Deletion cancelled.',2);}finally{prompt.close();}
    }
    return api(path,'DELETE',undefined,undefined,{'x-walletgate-confirm-delete':id});
  }
  throw new CliError('Unknown command.',2);
}
