import type { Connector } from 'wagmi';
import metamask from '../../assets/wallets/metamask.svg';
import rabby from '../../assets/wallets/rabby.svg';
import rainbow from '../../assets/wallets/rainbow.svg';
import coinbase from '../../assets/wallets/coinbase.svg';
export const walletShortcuts = [
  { id: 'metamask', name: 'MetaMask', icon: metamask, connectorIds: ['io.metamask', 'metaMask'] },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: coinbase, connectorIds: ['com.coinbase.wallet'] },
  { id: 'rabby', name: 'Rabby', icon: rabby, connectorIds: ['io.rabby'] },
  { id: 'rainbow', name: 'Rainbow', icon: rainbow, connectorIds: ['me.rainbow'] },
] as const;
export type WalletShortcut = typeof walletShortcuts[number];
export function shortcutConnector(shortcut: WalletShortcut, connectors: readonly Connector[]) {
  // Provider IDs are self-reported routing hints, not verified endorsements.
  return connectors.find(connector => (shortcut.connectorIds as readonly string[]).includes(connector.id));
}
