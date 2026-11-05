import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Page } from '@playwright/test';
import { hexToString, type Hex } from 'viem';
import { wallet } from './wallet-fixture';

// Run the unmodified stable Coinbase SDK. Only its remote popup/relay and wallet
// are simulated. These checks do not establish real Coinbase/Android support.
export async function coinbaseRelay(page: Page, options: { rejectSignature?: boolean } = {}) {
  const methods: string[] = [];
  const failures: string[] = [];
  const popupHtml = `<!doctype html><title>Simulated Coinbase wallet service</title><p>Simulated Coinbase EOA connection</p><script>
    let requestId, connected = false, replied = false;
    function finish() {
      if (requestId && connected && !replied) {
        replied = true;
        opener.postMessage({requestId, data:'walletlink'}, ${JSON.stringify('http://localhost:3100')});
      }
    }
    addEventListener('message', event => {
      if (event.origin !== 'http://localhost:3100') return;
      const message = event.data;
      if (message.data?.version) {
        window.fixtureSdkVersion = message.data.version;
        window.fixturePreference = message.data.preference;
        opener.postMessage({event:'WalletLinkSessionRequest'}, event.origin);
      }
      if (message.event === 'selectSignerType') { requestId = message.id; finish(); }
      if (message.event === 'WalletLinkUpdate' && message.data?.connected) { connected = true; finish(); }
    });
    opener.postMessage({event:'PopupLoaded',id:'fixture-loaded'}, 'http://localhost:3100');
  </script>`;
  await page.context().route('https://keys.coinbase.com/**', route => route.fulfill({contentType:'text/html',body:popupHtml}));
  await page.context().route('https://go.cb-w.com/**', route => route.fulfill({contentType:'text/html',body:'<p>Simulated SDK-owned wallet handoff</p>'}));
  await page.context().route('https://www.walletlink.org/**', route => route.fulfill({
    contentType:'application/json', body:JSON.stringify({events:[]}),
    headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization','access-control-allow-methods':'GET, POST, OPTIONS'},
  }));
  await page.routeWebSocket('wss://www.walletlink.org/rpc', socket => {
    let sequence=Promise.resolve();
    socket.onMessage(raw => {
      sequence=sequence.then(async()=>{
        if (raw.toString()==='h') {socket.send('h');return;}
        const message=JSON.parse(raw.toString());
        const send=(value:object)=>socket.send(JSON.stringify({id:message.id,sessionId:message.sessionId,...value}));
        if (message.type==='HostSession' || message.type==='SetSessionConfig') {send({type:'OK'});return;}
        if (message.type==='IsLinked') {send({type:'IsLinkedOK',linked:true,onlineGuests:1});return;}
        if (message.type==='GetSessionConfig') {send({type:'GetSessionConfigOK',metadata:{}});return;}
        if (message.type!=='PublishEvent') throw Error('Unexpected simulated Coinbase relay operation');
        send({type:'PublishEventOK',eventId:crypto.randomUUID()});
        if (message.event!=='Web3Request') return;
        const secret=await page.evaluate(()=>localStorage.getItem('-walletlink:https://www.walletlink.org:session:secret'));
        if (!secret) throw Error('Stable SDK did not initialize its relay session');
        const bytes=Buffer.from(message.data,'hex');
        const decipher=createDecipheriv('aes-256-gcm',Buffer.from(secret,'hex'),bytes.subarray(0,12));
        decipher.setAuthTag(bytes.subarray(12,28));
        const request=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString());
        methods.push(request.request.method);
        let response:object;
        if (request.request.method==='requestEthereumAccounts') response={method:request.request.method,result:[wallet.address]};
        else if (request.request.method==='signEthereumMessage') {
          const params=request.request.params;
          if (params.address.toLowerCase()!==wallet.address.toLowerCase() || params.addPrefix!==true || params.typedDataJson!==null) throw Error('SDK changed the selected EOA or signature method');
          response=options.rejectSignature ? {method:request.request.method,errorCode:4001,errorMessage:'User rejected signature'} : {
            method:request.request.method,result:await wallet.signMessage({message:hexToString(params.message as Hex)}),
          };
        } else throw Error('Unexpected wallet request: '+request.request.method);
        const iv=randomBytes(12);
        const cipher=createCipheriv('aes-256-gcm',Buffer.from(secret,'hex'),iv);
        const payload=JSON.stringify({type:'WEB3_RESPONSE',id:request.id,response});
        const encrypted=Buffer.concat([cipher.update(payload),cipher.final()]);
        const data=Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('hex');
        socket.send(JSON.stringify({type:'Event',sessionId:message.sessionId,eventId:crypto.randomUUID(),event:'Web3Response',data}));
      }).catch(()=>{failures.push('Simulated Coinbase relay protocol failed');});
    });
  });
  return {methods,failures};
}
