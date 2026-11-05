import { createConnector, type Connector } from 'wagmi';
import { getAddress, type Address, type EIP1193Provider } from 'viem';

export const sdkIds = { metamask: 'walletgate-metamask-sdk', coinbase: 'walletgate-coinbase-sdk' } as const;
type SdkProperties = { cancelPending(): Promise<void> };
type ConnectedAccounts<T extends boolean> = T extends true ? readonly { address: Address; capabilities: Record<string, unknown> }[] : readonly Address[];
type Wallet = keyof typeof sdkIds;
export function retryableSdkImport<T>(load: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return () => pending ??= load().catch(error => { pending = undefined; throw error; });
}
const loadMetaMask = retryableSdkImport(() => import('@metamask/connect-evm'));
const loadCoinbase = retryableSdkImport(() => import('@coinbase/wallet-sdk'));
// Preload each wallet independently; an unavailable chunk cannot disable the other.
export function preloadWalletSdks() {
  return Promise.allSettled([loadMetaMask(), loadCoinbase()]);
}
export async function cancelWalletSdk(connector: Connector | null) {
  if (connector && 'cancelPending' in connector) await (connector as Connector & { cancelPending(): Promise<void> }).cancelPending().catch(() => {});
}
export function walletSdk(wallet: Wallet) {
  return createConnector<EIP1193Provider, SdkProperties>((config) => {
    let providerPromise: Promise<EIP1193Provider> | undefined;
    let disconnectSdk: (() => Promise<void> | void) | undefined;
    let generation = 0;
    let pendingAttempt: number | undefined;
    let cleanup = Promise.resolve();
    let listenersAttached = false;
    return {
      id: sdkIds[wallet], name: wallet === 'metamask' ? 'MetaMask' : 'Coinbase Wallet', type: 'walletSdk',
      async getProvider() {
        if (!providerPromise) providerPromise = (async () => {
          if (wallet === 'metamask') {
            const metamask = await loadMetaMask();
            const client = await metamask.createEVMClient({
              dapp: { name: 'WalletGate', url: location.origin },
              api: { supportedNetworks: { '0x1': new URL('/api/wallet-rpc', location.origin).href } },
              analytics: { enabled: false }, skipAutoAnnounce: true, ui: { headless: false, preferExtension: true, showInstallModal: false },
              eventHandlers: { displayUri: uri => config.emitter.emit('message', { type: 'display_uri', data: uri }) },
            });
            disconnectSdk = () => client.disconnect();
            return client.getProvider() as unknown as EIP1193Provider;
          }
          // Stable 4.4.0 API: sdk.getProvider(), eth_requestAccounts, then
          // personal_sign through this same EIP-1193 provider. Keep EOA-only.
          const coinbase = await loadCoinbase();
          const sdk = coinbase.createCoinbaseWalletSDK({ appName: 'WalletGate', appChainIds: [1], preference: { options: 'eoaOnly' } });
          const provider = sdk.getProvider(); disconnectSdk = () => provider.disconnect();
          return provider as unknown as EIP1193Provider;
        })().catch(error => { providerPromise = undefined; throw error; });
        return providerPromise;
      },
      async connect<withCapabilities extends boolean = false>({ withCapabilities }: { chainId?: number; isReconnecting?: boolean; withCapabilities?: withCapabilities | boolean } = {}) {
        const attempt = ++generation;
        pendingAttempt = attempt;
        try {
          await cleanup;
          const provider = await this.getProvider() as EIP1193Provider;
          if (attempt !== generation) throw new Error('Connection cancelled.');
          const accounts = (await provider.request({ method: 'eth_requestAccounts' })).map(getAddress);
          if (attempt !== generation) throw new Error('Connection cancelled.');
          const chainId = await this.getChainId();
          if (attempt !== generation) throw new Error('Connection cancelled.');
          if (!listenersAttached) {
            provider.on('accountsChanged', this.onAccountsChanged);
            provider.on('chainChanged', this.onChainChanged);
            provider.on('disconnect', this.onDisconnect);
            listenersAttached = true;
          }
          return { accounts: (withCapabilities ? accounts.map(address => ({ address, capabilities: {} })) : accounts) as unknown as ConnectedAccounts<withCapabilities>, chainId };
        } finally { if (pendingAttempt === attempt) pendingAttempt = undefined; }
      },
      async cancelPending() {
        if (pendingAttempt === undefined) return;
        generation++; pendingAttempt = undefined;
        cleanup = cleanup.then(() => disconnectSdk?.()).then(() => {});
        await cleanup;
      },
      async disconnect() {
        generation++; pendingAttempt = undefined;
        cleanup = cleanup.then(() => disconnectSdk?.()).then(() => {});
        await cleanup;
      },
      async getAccounts() { return (await (await this.getProvider() as EIP1193Provider).request({ method: 'eth_accounts' })).map(getAddress); },
      async getChainId() { return Number(await (await this.getProvider() as EIP1193Provider).request({ method: 'eth_chainId' })); },
      async isAuthorized() { return false; }, // Connection state never authenticates the application.
      async switchChain({ chainId }) {
        const chain = config.chains.find(chain => chain.id === chainId);
        if (!chain) throw new Error('Unsupported network.');
        await (await this.getProvider() as EIP1193Provider).request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chainId.toString(16)}` }] });
        return chain;
      },
      onAccountsChanged(accounts: string[]) { if (!accounts.length) config.emitter.emit('disconnect'); else config.emitter.emit('change', { accounts: accounts.map(getAddress) as Address[] }); },
      onChainChanged(chainId: string) { config.emitter.emit('change', { chainId: Number(chainId) }); },
      onDisconnect() { config.emitter.emit('disconnect'); },
    };
  });
}
