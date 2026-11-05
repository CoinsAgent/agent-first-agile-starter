import { expect, test } from '@playwright/test';
import { provider, wallet } from './wallet-fixture';

test.use({userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', viewport:{width:393,height:851}, isMobile:true, hasTouch:true});

test('pending Coinbase Android connection gives manual recovery without an unverified app link or authentication', async ({page}) => {
  let challenges = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/challenge') challenges++; });
  await page.goto('/');
  const trigger=page.getByRole('button',{name:'Sign in with Coinbase Wallet',exact:true});
  await trigger.click();
  await expect(page.getByText(/cancel this attempt and open this site manually in Coinbase/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Open WalletGate in Coinbase'})).toHaveCount(0);
  await expect(page.locator('a[href^="https://go.cb-w.com/"]')).toHaveCount(0);
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await expect(page.getByLabel('Sign-in message', {exact:true})).toHaveCount(0);
  expect(challenges).toBe(0);
  await page.getByRole('button',{name:'Cancel connection'}).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByText(/cancel this attempt and open this site manually in Coinbase/)).toHaveCount(0);
  expect((await page.request.get('/api/session')).status()).toBe(401);
});

test('installed Coinbase provider on Android retains direct connection and explicit SIWE signing', async ({page}) => {
  await provider(page,{eip6963:true,rdns:'com.coinbase.wallet',walletName:'Coinbase Wallet'});
  await page.goto('/');
  await page.getByRole('button',{name:'Sign in with Coinbase Wallet',exact:true}).click();
  await expect(page.getByLabel('Sign-in message', {exact:true})).toContainText(wallet.address);
  await expect(page.getByRole('link',{name:'Open WalletGate in Coinbase'})).toHaveCount(0);
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByTestId('verified-address')).toHaveText(wallet.address.toLowerCase());
});
