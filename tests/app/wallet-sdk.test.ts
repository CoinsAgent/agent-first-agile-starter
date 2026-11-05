import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
const mocks = vi.hoisted(() => ({ metamask: vi.fn(), coinbase: vi.fn() }));
vi.mock('@metamask/connect-evm', () => ({ createEVMClient: mocks.metamask }));
vi.mock('@coinbase/wallet-sdk', () => ({ createCoinbaseWalletSDK: mocks.coinbase }));
import { walletSdk, preloadWalletSdks, cancelWalletSdk, retryableSdkImport } from '../../src/wallet-sdk';
const address = '0x0000000000000000000000000000000000000001';
function setup(wallet: 'metamask' | 'coinbase') {
  const request = vi.fn(async ({method}: {method:string}) => method === 'eth_chainId' ? '0x1' : [address]);
  const provider = {request,on:vi.fn()};const disconnect=vi.fn();
  mocks.metamask.mockResolvedValue({getProvider:()=>provider,disconnect});
  mocks.coinbase.mockReturnValue({getProvider:()=>({...provider,disconnect})});
  const config=createConfig({chains:[mainnet],connectors:[walletSdk(wallet)],transports:{1:http('https://unused.test')}});
  return {connector:config.connectors[0], request,disconnect};
}
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('location',{origin:'https://walletgate.test'});});
describe('native wallet SDK delegation',()=>{
  it('preloads code without requesting accounts, opening QR, or initializing relay clients',async()=>{
    await preloadWalletSdks();expect(mocks.metamask).not.toHaveBeenCalled();expect(mocks.coinbase).not.toHaveBeenCalled();
  });
  it('configures MetaMask native QR UI with analytics disabled and forwards the real SDK URI event',async()=>{
    const {connector,request}=setup('metamask');const messages=vi.fn();connector.emitter.on('message',messages);
    await connector.getProvider();const options=mocks.metamask.mock.calls[0][0];
    expect(options.analytics).toEqual({enabled:false});expect(options.ui).toEqual({headless:false,preferExtension:true,showInstallModal:false});
    expect(options.api.supportedNetworks['0x1']).toBe('https://walletgate.test/api/wallet-rpc');
    options.eventHandlers.displayUri('metamask://sdk-test-pairing');expect(messages).toHaveBeenCalledWith(expect.objectContaining({type:'display_uri',data:'metamask://sdk-test-pairing'}));
    expect(request).not.toHaveBeenCalled();expect(await connector.connect()).toEqual({accounts:[address],chainId:1});
  });
  it('uses the Coinbase native SDK in EOA-only mode without WalletConnect configuration',async()=>{
    const {connector}=setup('coinbase');await connector.connect();
    expect(mocks.coinbase).toHaveBeenCalledWith({appName:'WalletGate',appChainIds:[1],preference:{options:'eoaOnly'}});
    expect(mocks.metamask).not.toHaveBeenCalled();
  });
  it('suppresses an SDK connection completing after cancellation and disconnects it',async()=>{
    const {connector,request,disconnect}=setup('metamask');let release:(value:string[])=>void=()=>{};
    request.mockImplementationOnce(()=>new Promise<'0x1' | string[]>(resolve=>{release=resolve;}));
    const result=connector.connect();await vi.waitFor(()=>expect(request).toHaveBeenCalled());await cancelWalletSdk(connector);
    release([address]);await expect(result).rejects.toThrow('cancelled');expect(disconnect).toHaveBeenCalled();
  });
  it('retries a failed SDK initialization without caching a permanent rejection',async()=>{
    const {connector}=setup('metamask');mocks.metamask.mockRejectedValueOnce(new Error('SDK unavailable'));
    await expect(connector.getProvider()).rejects.toThrow('SDK unavailable');await expect(connector.getProvider()).resolves.toBeDefined();
  });
});

it('retries an SDK chunk loader after a transient failure',async()=>{
  const load=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('sdk');
  const cached=retryableSdkImport(load);await expect(cached()).rejects.toThrow('offline');
  await expect(cached()).resolves.toBe('sdk');await expect(cached()).resolves.toBe('sdk');expect(load).toHaveBeenCalledTimes(2);
});
it('a late cancelled request cannot disconnect a newer successful SDK connection',async()=>{
  const {connector,request,disconnect}=setup('metamask');let release:(value:string[])=>void=()=>{};
  request.mockImplementationOnce(()=>new Promise<'0x1' | string[]>(resolve=>{release=resolve;}));
  const old=connector.connect();await vi.waitFor(()=>expect(request).toHaveBeenCalled());await cancelWalletSdk(connector);
  await expect(connector.connect()).resolves.toEqual({accounts:[address],chainId:1});const count=disconnect.mock.calls.length;
  release([address]);await expect(old).rejects.toThrow('cancelled');expect(disconnect).toHaveBeenCalledTimes(count);
});
it('cancellation during the chain lookup cannot publish a stale connection',async()=>{
  const {connector,request}=setup('metamask');let release:(value:'0x1')=>void=()=>{};
  request.mockImplementation(async({method})=>method==='eth_chainId'?new Promise<'0x1'>(resolve=>{release=resolve;}):[address]);
  const pending=connector.connect();await vi.waitFor(()=>expect(request).toHaveBeenCalledWith({method:'eth_chainId'}));
  await cancelWalletSdk(connector);release('0x1');await expect(pending).rejects.toThrow('cancelled');
});
it('dialog cleanup after a completed connection does not disconnect that established connector',async()=>{
  const {connector,disconnect}=setup('metamask');await connector.connect();await cancelWalletSdk(connector);expect(disconnect).not.toHaveBeenCalled();
});
