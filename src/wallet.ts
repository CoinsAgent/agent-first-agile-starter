import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors/injected';
export const walletConfig = createConfig({
  chains: [mainnet], connectors: [injected({ target: 'metaMask' })],
  transports: { [mainnet.id]: http() }, storage: null, multiInjectedProviderDiscovery: false,
});

export class MetaMaskProviderUnavailableError extends Error {}

// Mobile in-app browsers can inject the provider after the page has loaded.
export async function waitForMetaMaskProvider() {
  const deadline = Date.now() + 3000;
  do {
    const provider = await walletConfig.connectors[0].getProvider();
    if (provider) return provider;
    await new Promise(resolve => window.setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  throw new MetaMaskProviderUnavailableError('MetaMask provider unavailable');
}
