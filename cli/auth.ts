import { constants, lstatSync, mkdirSync, readFileSync, openSync, writeFileSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, isAbsolute, resolve, join, relative } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
export type Credential = { origin:string; access_token:string; refresh_token:string; expires_at:number; authorization_id:string; owner:string; issuer:string; permissions:Record<string,string[]>; registration:boolean; grant_expires_at:number };
export class CliError extends Error { constructor(message:string,public code=1){super(message);} }
const repository=resolve(fileURLToPath(new URL('../',import.meta.url)));
export function safeDirectory(path:string){
  if(!isAbsolute(path))throw new CliError('Credential storage requires an absolute path.',2);
  const relativePath=relative(repository,path);
  if(relativePath==='' || !relativePath.startsWith('..'))throw new CliError('Store credentials outside the repository.',2);
  mkdirSync(path,{recursive:true,mode:0o700});
  for(let current=path;;current=dirname(current)){
    if(lstatSync(current).isSymbolicLink())throw new CliError('Credential paths cannot contain symlinks.',2);
    if(dirname(current)===current)break;
  }
  const info=lstatSync(path);
  if(!info.isDirectory() || info.uid!==process.getuid?.() || (info.mode&0o077)!==0)throw new CliError('Credential directory must be owned by you with permissions 0700.',2);
}
export function writePrivate(path:string,value:unknown){
  safeDirectory(dirname(path));
  try {const info=lstatSync(path);if(!info.isFile()||info.isSymbolicLink()||info.uid!==process.getuid?.()||(info.mode&0o077)!==0)throw new CliError('Unsafe credential file permissions.',2);}catch(e){if(!(e instanceof Error && 'code' in e && e.code==='ENOENT'))throw e;}
  const temporary=path+'.'+randomBytes(12).toString('hex');
  const fd=openSync(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{writeFileSync(fd,JSON.stringify(value)+'\n');}finally{closeSync(fd);}
  renameSync(temporary,path);
}
export function storage(directory=join(process.env.XDG_STATE_HOME??join(homedir(),'.local/state'),'walletgate'),profile='default'){
  if(!/^[A-Za-z0-9_-]{1,64}$/.test(profile))throw new CliError('Invalid profile name.',2);
  safeDirectory(directory);const file=join(directory,profile+'.json');
  return {directory,file,read():Credential|null{
    try{
      const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||info.uid!==process.getuid?.()||(info.mode&0o077)!==0)throw new CliError('Unsafe credential file permissions.',2);
      const data=JSON.parse(readFileSync(file,'utf8')) as Credential;
      if(typeof data.origin!=='string'||typeof data.refresh_token!=='string'||typeof data.access_token!=='string'||!Number.isFinite(data.expires_at)||typeof data.authorization_id!=='string'||typeof data.owner!=='string')throw new CliError('Invalid credential file; authorize again.',3);
      validateOrigin(data.origin);return data;
    }catch(e){if(e instanceof Error && 'code' in e && e.code==='ENOENT')return null;throw e;}
  },write(value:Credential){writePrivate(file,value);},clear(){unlinkSync(file);}};
}
export function validateOrigin(origin:string){
  const url=new URL(origin);
  if(url.origin!==origin||url.username||url.password||(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new CliError('Use an HTTPS origin, or HTTP loopback for development.',2);
  return origin;
}
export async function form(origin:string,endpoint:string,body:Record<string,string>){
  return fetch(origin+'/api/auth/oauth2/'+endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:'walletgate-cli',...body}),signal:AbortSignal.timeout(15000)});
}
export async function login(store:ReturnType<typeof storage>,origin:string,label:string,noOpen=false,sshHost?:string){
  validateOrigin(origin);if(!label.trim()||label.length>80)throw new CliError('Use a label of 1–80 characters.',2);
  const previous=store.read();if(previous&&previous.origin!==origin)throw new CliError('Use another profile for a different issuer.',2);
  const verifier=randomBytes(32).toString('base64url'),state=randomBytes(32).toString('base64url');
  let finish!:(value:string)=>void,fail!:(error:Error)=>void;
  const code=new Promise<string>((resolve,reject)=>{finish=resolve;fail=reject;});
  const server=createServer((request,response)=>{
    const url=new URL(request.url??'/', 'http://127.0.0.1');
    if(url.pathname!=='/callback'||url.searchParams.getAll('state').length!==1||url.searchParams.get('state')!==state){response.writeHead(400);response.end('Invalid authorization callback.');return;}
    if(url.searchParams.has('error')){response.end('Authorization declined. You may close this tab.');fail(new CliError('Authorization declined.',3));return;}
    const value=url.searchParams.get('code');if(!value||url.searchParams.getAll('code').length!==1){response.writeHead(400);response.end('Missing authorization code.');return;}
    response.setHeader('Cache-Control','no-store');response.end('Authorization received. Return to the CLI.');finish(value);
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();if(!address||typeof address==='string')throw new CliError('Callback unavailable.');
  const redirect='http://127.0.0.1:'+address.port+'/callback';
  const query=new URLSearchParams({client_id:'walletgate-cli',response_type:'code',redirect_uri:redirect,scope:'clients:manage clients:register offline_access',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',resource:'urn:walletgate:management',walletgate_label:label,...(previous?{walletgate_replace:previous.authorization_id}:{})});
  const url=origin+'/api/auth/oauth2/authorize?'+query;
  const timer=setTimeout(()=>fail(new CliError('Authorization timed out. Start login again.',3)),300000);
  console.log(JSON.stringify({authorization_url:url,...(sshHost?{ssh_forward:['ssh','-N','-L',`${address.port}:127.0.0.1:${address.port}`,sshHost]}:{})}));
  if(!noOpen&&!sshHost){const child=spawn('xdg-open',[url],{stdio:'ignore'});child.on('error',()=>{});child.unref();}
  try{
    const value=await code;const response=await form(origin,'token',{grant_type:'authorization_code',code:value,code_verifier:verifier,redirect_uri:redirect,resource:'urn:walletgate:management'});
    if(!response.ok)throw new CliError('Code exchange failed. Start authorization again.',3);
    const token=await response.json();if(token.issuer!==origin+'/api/auth'||typeof token.refresh_token!=='string'||(previous&&token.owner!==previous.owner))throw new CliError('Authorization identity mismatch.',3);
    store.write({...token,origin});return {owner:token.owner,authorization_id:token.authorization_id,permissions:token.permissions,registration:token.registration};
  }finally{clearTimeout(timer);server.close();}
}
export async function refresh(store:ReturnType<typeof storage>,credential:Credential){
  const response=await form(credential.origin,'token',{grant_type:'refresh_token',refresh_token:credential.refresh_token,resource:'urn:walletgate:management'});
  if(!response.ok)throw new CliError('Refresh failed. Authorize again; do not retry a consumed refresh credential.',3);
  const next=await response.json();if(next.owner!==credential.owner||next.authorization_id!==credential.authorization_id)throw new CliError('Refresh identity mismatch.',3);
  const value={...credential,...next};store.write(value);return value as Credential;
}
export async function logout(store:ReturnType<typeof storage>){
  const credential=store.read();if(!credential)return {logged_out:true};
  try{const response=await form(credential.origin,'revoke',{token:credential.refresh_token,token_type_hint:'refresh_token'});if(!response.ok)throw new Error();}
  catch{throw new CliError('Revocation incomplete. Credentials retained for retry; use the browser authorizations page to revoke this installation.',4);}
  store.clear();return {logged_out:true};
}
