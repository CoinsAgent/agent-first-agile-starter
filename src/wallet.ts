import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { walletSdk } from './wallet-sdk';
import { injected } from 'wagmi/connectors/injected';
// No public RPC fallback: the SIWE EOA flow uses the selected wallet for chain/signing
// and server-side cryptographic verification. ENS/balance enrichment is not requested.
// If future onchain reads are added, configure their RPC explicitly and audit traffic.
export const walletConfig = createConfig({
  chains: [mainnet], connectors: [injected({ target: 'metaMask', unstable_shimAsyncInject: 3000 }), walletSdk('metamask'), walletSdk('coinbase')],
  transports: { [mainnet.id]: http('/api/rpc-not-configured', { retryCount: 0 }) },
  storage: null, multiInjectedProviderDiscovery: true,
});
