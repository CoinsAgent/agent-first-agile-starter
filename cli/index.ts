import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CliError,storage,login,logout } from './auth';
import { command } from './applications';
export async function main(argv=process.argv.slice(2)){
  const operation=argv.shift();
  const flags=new Map<string,string[]>(),args:string[]=[];
  const switches=['yes','no-open'];const allowed=[...switches,'origin','state-dir','profile','label','ssh-host','name','redirect','request-id','secret-file'];
  for(let i=0;i<argv.length;i++){
    const value=argv[i];if(!value.startsWith('--')){args.push(value);continue;}
    const key=value.slice(2);if(!allowed.includes(key))throw new CliError('Unknown option. See help.',2);
    const item=switches.includes(key)?'true':argv[++i];if(!item||item.startsWith('--'))throw new CliError('Missing option value: '+key,2);
    if(key!=='redirect'&&flags.has(key))throw new CliError('Duplicate option: '+key,2);
    flags.set(key,[...(flags.get(key)??[]),item]);
  }
  if(!operation||operation==='help'){console.log('WalletGate CLI: login | iat | create | list | get ID | update ID | delete ID | logout. See docs/DEVELOPMENT.md.');return;}
  if(!['login','logout','iat','create','list','get','update','delete'].includes(operation))throw new CliError('Unknown command.',2);
  const store=storage(flags.get('state-dir')?.[0],flags.get('profile')?.[0]);
  const result=operation==='login'?await login(store,flags.get('origin')?.[0]??'',flags.get('label')?.[0]??'CLI',flags.has('no-open'),flags.get('ssh-host')?.[0]):operation==='logout'?await logout(store):await command(store,operation,flags,args);
  console.log(JSON.stringify(result));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
  console.error(JSON.stringify({error:error instanceof CliError?error.message:'Operation failed. Credentials were not printed. Check connectivity and retry safely.'}));process.exitCode=error instanceof CliError?error.code:1;
});
