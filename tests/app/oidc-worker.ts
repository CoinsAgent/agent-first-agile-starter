// Independent process fixture. Test credentials arrive through stdin, never argv/logs.
import { createWalletGate } from '../../backend/wallet-auth/auth';
let input='';
for await (const chunk of process.stdin) input+=chunk;
const { config, client, refreshToken }=JSON.parse(input);
const gate=await createWalletGate(config);
try {
  const response=await gate.handle(new Request(config.origin+'/api/auth/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',authorization:'Basic '+Buffer.from(client.id+':'+client.secret).toString('base64')},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:refreshToken})}));
  process.stdout.write(JSON.stringify({status:response.status})+'\n');
} finally { gate.close(); }
