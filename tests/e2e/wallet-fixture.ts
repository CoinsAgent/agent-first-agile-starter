import type { Page } from '@playwright/test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { hexToString, type Hex } from 'viem';
export const wallet = privateKeyToAccount(generatePrivateKey());
export const other = privateKeyToAccount(generatePrivateKey());
// Real EIP-191 signatures behind a simulated provider. This is NOT a MetaMask/device compatibility test.
export async function provider(page: Page, options: { chain?: string; metaMask?: boolean; switchBehavior?: 'approve' | 'reject'; injectDelay?: number; unsupportedPermissions?: boolean; eip6963?: boolean; rdns?: string; walletName?: string; secondWallet?: boolean } = {}) {
  await page.exposeFunction('walletTestSign', (message: Hex, address?: string) => (address?.toLowerCase() === other.address.toLowerCase() ? other : wallet).signMessage({ message: hexToString(message) }));
  await page.addInitScript(({ address, otherAddress, chain, metaMask, switchBehavior, injectDelay, unsupportedPermissions, eip6963, rdns, walletName, secondWallet }) => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const eth = {
      switchBehavior, switchRequests: 0, connectionRequests: 0, isMetaMask: metaMask, selectedAddress: address, chainId: chain, rejectSignature: false, rejectConnection: false, changeOnSign: false, disconnectOnSign: false, deferSignature: false, completedSignatures: 0, releaseSignature: undefined as undefined | (()=>void),
      on(event: string, callback: (...args:unknown[])=>void) { if(!listeners.has(event)) listeners.set(event,new Set()); listeners.get(event)!.add(callback); },
      removeListener(event: string, callback: (...args:unknown[])=>void) { listeners.get(event)?.delete(callback); },
      emit(event: string, value: unknown) { for(const cb of listeners.get(event)??[]) cb(value); },
      async request({ method, params }: { method: string; params?: unknown[] }) {
        if (['eth_requestAccounts','wallet_requestPermissions'].includes(method)) this.connectionRequests++;
        if (this.rejectConnection && ['eth_requestAccounts','wallet_requestPermissions'].includes(method)) throw Object.assign(new Error('Connection rejected'),{code:4001});
        if (method === 'wallet_requestPermissions' && unsupportedPermissions) throw Object.assign(new Error('Method not supported'),{code:4200});
        if (method === 'wallet_switchEthereumChain') {
          this.switchRequests++;
          if(this.switchBehavior==='reject') throw Object.assign(new Error('Switch rejected'),{code:4001});
          if(this.switchBehavior==='approve') { this.chainId=(params![0] as {chainId:string}).chainId; this.emit('chainChanged',this.chainId); return null; }
          throw Object.assign(new Error('Switch unsupported'),{code:4200});
        }
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [this.selectedAddress];
        if (method === 'eth_chainId') return this.chainId;
        if (method === 'wallet_requestPermissions' || method === 'wallet_getPermissions') return [{ parentCapability:'eth_accounts', caveats:[{ type:'restrictReturnedAccounts', value:[this.selectedAddress] }] }];
        if (method === 'wallet_revokePermissions') return null;
        if (method === 'personal_sign') {
          if (this.deferSignature) { this.deferSignature=false; await new Promise<void>(resolve=>{this.releaseSignature=resolve;}); }
          if (this.rejectSignature) { this.rejectSignature=false; throw Object.assign(new Error('User rejected'),{code:4001}); }
          if (this.changeOnSign) { this.selectedAddress=otherAddress; this.emit('accountsChanged',[otherAddress]); }
          if (this.disconnectOnSign) this.emit('disconnect', {code:4900,message:'Disconnected'});
          const signature = await (window as unknown as { walletTestSign: (message: unknown, address?: unknown)=>Promise<string> }).walletTestSign(params![0], params![1]);
          this.completedSignatures++;
          return signature;
        }
        throw new Error(`Unexpected wallet method ${method}`);
      },
    };
    const inject=()=>{Object.defineProperty(window,'ethereum',{ value:eth, configurable:true }); window.dispatchEvent(new Event('ethereum#initialized')); if(eip6963) { const announce=()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'da369a0c-31eb-4e7b-911f-45656ce972b3',name:walletName??'MetaMask',rdns:rdns??'io.metamask',icon:'data:image/png;base64,'},provider:eth}})); window.addEventListener('eip6963:requestProvider',announce); announce(); if(secondWallet) { const rabby={...eth,isMetaMask:false,isRabby:true,selectedAddress:otherAddress}; const announceRabby=()=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'cb1247f1-9eb6-4349-bcca-e76d24018b2a',name:'Rabby',rdns:'io.rabby',icon:'data:image/png;base64,'},provider:rabby}})); window.addEventListener('eip6963:requestProvider',announceRabby); announceRabby(); }  } };
    if(injectDelay) setTimeout(inject,injectDelay); else inject();
  }, { address:wallet.address, otherAddress:other.address, chain:options.chain ?? '0x1', metaMask:options.metaMask ?? true, switchBehavior:options.switchBehavior, injectDelay:options.injectDelay, unsupportedPermissions:options.unsupportedPermissions, eip6963:options.eip6963, rdns:options.rdns, walletName:options.walletName, secondWallet:options.secondWallet });
}
