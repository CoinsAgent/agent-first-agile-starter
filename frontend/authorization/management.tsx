import { useCallback,useEffect,useRef,useState,type ReactNode } from 'react';
import { Button } from '../ui/button';
import './style.css';
type Permissions=Record<string,('read'|'update'|'delete')[]>;
type Approval={needsLogin?:boolean;address:string;label:string;expiresAt:number;clients:{clientId:string;name:string}[];registration:boolean;replacement?:string};
type Authorization={id:string;label:string;permissions:Permissions;registration:boolean;createdAt:number;lastActivity:number;expiresAt:number;active:boolean};
async function request(path:string,body?:unknown){
 const response=await fetch('/api/management/'+path,{credentials:'same-origin',cache:'no-store',...(body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 const value=await response.json();if(!response.ok)throw new Error(value.error??'Request could not complete.');return value;
}
export function ManagementApproval({id,signIn}:{id:string;signIn:(ready:()=>void)=>ReactNode}){
 const [details,setDetails]=useState<Approval|null>(null),[login,setLogin]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[registration,setRegistration]=useState(false),[permissions,setPermissions]=useState<Permissions>({});
 const heading=useRef<HTMLHeadingElement>(null),inFlight=useRef(false),active=useRef(true);
 const load=useCallback(async()=>{try{const value=await request('approval/'+id);if(!active.current)return;if(value.needsLogin){setLogin(true);setDetails(null);}else{setDetails(value);setLogin(false);setRegistration(false);setPermissions({});setError('');}}catch(e){if(active.current){setDetails(null);setError(e instanceof Error?e.message:'Request failed.');}}},[id]);
 useEffect(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]);
 useEffect(()=>{if(details)heading.current?.focus();},[details]);
 useEffect(()=>{if(!details)return;const timer=setTimeout(()=>{setDetails(null);setError('CLI authorization expired. Start login again.');},Math.max(0,details.expiresAt-Date.now()));return()=>clearTimeout(timer);},[details]);
 async function decide(accept:boolean){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  try{const value=await request('approval/'+id,{accept,registration,permissions});if(!active.current)return;if(value.needsLogin){setLogin(true);setDetails(null);return;}if(!value.redirect||typeof value.url!=='string')throw new Error('Authorization could not finish. Start again.');window.location.assign(value.url);}
  catch(e){if(active.current)setError(e instanceof Error?e.message:'Request failed.');}
  finally{inFlight.current=false;if(active.current)setBusy(false);}
 }
 function toggle(id:string,operation:'read'|'update'|'delete'){
  setPermissions(previous=>{const next={...previous};const selected=new Set(next[id]??[]);if(selected.has(operation))selected.delete(operation);else selected.add(operation);if(selected.size)next[id]=[...selected];else delete next[id];return next;});
 }
 return <div className="authorization-shell"><section className="auth-card authorization-card" aria-labelledby="cli-title">
  <h1 id="cli-title" ref={heading} tabIndex={-1}>Authorize WalletGate CLI</h1>
  {!details&&!login&&!error&&<p role="status">Checking CLI authorization…</p>}
  {details&&<><p>Installation label: <strong>{details.label}</strong>. This label does not verify a device or executable.</p><dl><dt>Your verified wallet</dt><dd>{details.address}</dd></dl>
   <p>Select exactly what this installation may do. Its public client ID does not establish trust in the software.</p>
   {details.replacement&&<p>This replaces the selected installation’s authorization after successful completion. Other installations remain unchanged.</p>}
   <fieldset disabled={busy}><legend>Registration permission</legend>{details.registration?<label className="management-choice"><input type="checkbox" checked={registration} onChange={e=>setRegistration(e.target.checked)}/>Create new applications using single-use IATs</label>:<p>Registration was not requested.</p>}</fieldset>
   <p>New clients require separate management consent after registration. Lost client secrets cannot be recovered.</p>
   <div className="management-targets">{details.clients.map(client=><fieldset key={client.clientId} disabled={busy}><legend>{client.name||client.clientId}</legend><p className="management-id">{client.clientId}</p>{(['read','update','delete'] as const).map(operation=><label key={operation} className="management-choice"><input type="checkbox" checked={permissions[client.clientId]?.includes(operation)??false} onChange={()=>toggle(client.clientId,operation)}/>{operation==='read'?'Read configuration':operation==='update'?'Update name and redirects':'Permanently delete'}</label>)}</fieldset>)}</div>
   {!details.clients.length&&<p>No owned applications yet. You can separately approve registration.</p>}
   <p>Offline authorization: access lasts up to 15 minutes per token. Successful refresh or management use keeps authorization active for up to seven days of inactivity, with a 30-day maximum from consent. Browser sign-out does not revoke this authorization.</p>
   <p>You can revoke this installation from <a href="/#authorizations">CLI authorizations</a>. Refresh reuse requires authorization again.</p>
   <div className="authorization-actions"><Button variant="secondary" disabled={busy} onClick={()=>void decide(false)}>Deny</Button><Button disabled={busy} onClick={()=>void decide(true)}>Allow selected access</Button></div></>}
  {busy&&<p role="status">Completing authorization…</p>}{login&&<p>Sign in with your wallet, then review the CLI permissions.</p>}{error&&<p className="error" role="alert">{error}</p>}
 </section>{login&&signIn(()=>void load())}</div>;
}
export function ManagementAuthorizations({signIn}:{signIn:(ready:()=>void)=>ReactNode}){
 const [items,setItems]=useState<Authorization[]>([]),[login,setLogin]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[confirm,setConfirm]=useState<string|null>(null);
 const flight=useRef(false),active=useRef(true);
 const load=useCallback(async()=>{try{const response=await fetch('/api/management/authorizations',{credentials:'same-origin',cache:'no-store'});if(!active.current)return;if(response.status===401){setLogin(true);setItems([]);return;}const value=await response.json();if(!response.ok)throw new Error(value.error);setItems(value.authorizations);setLogin(false);}catch(e){if(active.current)setError(e instanceof Error?e.message:'Could not load authorizations.');}},[]);
 useEffect(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]);
 async function revoke(id:string){if(flight.current)return;flight.current=true;setBusy(true);setError('');try{await request('authorizations/'+id,{});setConfirm(null);setStatus('Selected authorization revoked. Other installations are unchanged.');await load();}catch(e){setError(e instanceof Error?e.message:'Revocation failed.');}finally{flight.current=false;setBusy(false);}}
 return <div className="authorization-shell"><section className="auth-card authorization-card" aria-labelledby="authorizations-title"><h1 id="authorizations-title">CLI authorizations</h1><p>Review and revoke installations authorized by your wallet. Labels are descriptive and do not verify device identities.</p>
  {login&&<p>Sign in to review your CLI authorizations.</p>}{!login&&!items.length&&<p>No CLI authorizations.</p>}
  {items.map(item=><article key={item.id} className="management-authorization"><h2>{item.label}</h2><dl><dt>Authorization ID</dt><dd>{item.id}</dd><dt>Created</dt><dd>{new Date(item.createdAt).toISOString()}</dd><dt>Last activity</dt><dd>{new Date(item.lastActivity).toISOString()}</dd><dt>Expires</dt><dd>{new Date(item.expiresAt).toISOString()}</dd><dt>Status</dt><dd>{item.active?'Active':'Expired or revoked'}</dd><dt>Registration</dt><dd>{item.registration?'Allowed':'Not allowed'}</dd></dl>
   <ul>{Object.entries(item.permissions).map(([client,operations])=><li key={client}><span className="management-id">{client}</span>: {operations.join(', ')}</li>)}</ul>
   {item.active&&(confirm===item.id?<><p>Revoke access and refresh credentials for this authorization?</p><Button variant="secondary" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</Button><Button disabled={busy} onClick={()=>void revoke(item.id)}>Confirm revoke</Button></>:<Button disabled={busy} onClick={()=>setConfirm(item.id)}>Revoke {item.label}</Button>)}</article>)}
  {busy&&<p role="status">Revoking authorization…</p>}{status&&<p role="status">{status}</p>}{error&&<p className="error" role="alert">{error}</p>}
 </section>{login&&signIn(()=>void load())}</div>;
}
