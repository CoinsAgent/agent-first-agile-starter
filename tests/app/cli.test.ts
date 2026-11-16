import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { mkdtempSync,rmSync,chmodSync,readFileSync,writeFileSync,statSync,symlinkSync,mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { storage,writePrivate,logout,refresh,type Credential } from '../../cli/auth';
let dir:string;
beforeEach(()=>{dir=mkdtempSync(join(tmpdir(),'walletgate-cli-test-'));});
afterEach(()=>{vi.unstubAllGlobals();rmSync(dir,{recursive:true,force:true});});
const fixture:Credential={origin:'http://localhost:3100',issuer:'http://localhost:3100/api/auth',access_token:'fixture-access-never-log',refresh_token:'fixture-refresh-never-log',expires_at:Math.floor(Date.now()/1000)+900,authorization_id:'fixture-authorization',owner:'0x'+'1'.repeat(40),permissions:{},registration:true,grant_expires_at:Date.now()+86400000};
describe('US-004 CLI credential and error boundaries',()=>{
 it('stores owner-only credentials outside the repo and rejects unsafe existing permissions',()=>{
  const store=storage(dir);store.write(fixture);expect(statSync(store.file).mode&0o777).toBe(0o600);expect(store.read()).toEqual(fixture);chmodSync(store.file,0o644);expect(()=>store.read()).toThrow(/Unsafe/);expect(()=>store.write(fixture)).toThrow(/Unsafe/);
 });
 it('rejects world-readable directory, symlink files/directories, traversal profiles and repo paths',()=>{
  chmodSync(dir,0o755);expect(()=>storage(dir)).toThrow(/0700/);chmodSync(dir,0o700);
  expect(()=>storage(dir,'../escape')).toThrow(/profile/);expect(()=>storage(process.cwd())).toThrow(/outside/);
  const target=join(dir,'target');writeFileSync(target,'preserve',{mode:0o600});symlinkSync(target,join(dir,'default.json'));expect(()=>storage(dir).read()).toThrow(/Unsafe/);expect(()=>writePrivate(join(dir,'default.json'),fixture)).toThrow(/Unsafe/);expect(readFileSync(target,'utf8')).toBe('preserve');
  const real=join(dir,'real');mkdirSync(real,{mode:0o700});symlinkSync(real,join(dir,'linked'));expect(()=>storage(join(dir,'linked'))).toThrow(/symlinks/);
 });
 it('retains protected credentials when logout cannot confirm server revocation',async()=>{
  const store=storage(dir);store.write(fixture);vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));await expect(logout(store)).rejects.toThrow(/Revocation incomplete/);expect(store.read()).toEqual(fixture);
 });
 it('clears credentials only on successful server revocation and never sends cookies',async()=>{
  const store=storage(dir);store.write(fixture);const fetch=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetch);await expect(logout(store)).resolves.toEqual({logged_out:true});expect(store.read()).toBeNull();const args=fetch.mock.calls[0];expect(args[1].headers.cookie).toBeUndefined();expect(args[1].redirect).toBe('error');expect(args[1].body.get('client_id')).toBe('walletgate-cli');
 });
 it('refuses a changed refresh owner/authorization without overwriting the credential',async()=>{
  const store=storage(dir);store.write(fixture);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({...fixture,owner:'0x'+'2'.repeat(40)}))));await expect(refresh(store,fixture)).rejects.toThrow(/identity mismatch/);expect(store.read()).toEqual(fixture);
 });
 it('does not retry a consumed refresh credential or silently start browser authorization',async()=>{
  const store=storage(dir);store.write(fixture);const fetch=vi.fn().mockResolvedValue(new Response('{"error":"invalid_grant"}',{status:400}));vi.stubGlobal('fetch',fetch);await expect(refresh(store,fixture)).rejects.toThrow(/Authorize again/);expect(fetch).toHaveBeenCalledTimes(1);expect(store.read()).toEqual(fixture);
 });
 it('rejects raw credential arguments and noninteractive deletion without confirmation using real CLI processes',()=>{
  const credential='argument-credential-never-log';const invalid=spawnSync(process.execPath,['--import','tsx','cli/index.ts','list','--token',credential],{encoding:'utf8'});expect(invalid.status).toBe(2);expect(invalid.stdout+invalid.stderr).not.toContain(credential);
  storage(dir).write(fixture);const deletion=spawnSync(process.execPath,['--import','tsx','cli/index.ts','delete','selected-id','--state-dir',dir],{encoding:'utf8'});expect(deletion.status).toBe(2);expect(deletion.stderr).toContain('--yes');expect(deletion.stdout+deletion.stderr).not.toContain(fixture.access_token);
 });
});
