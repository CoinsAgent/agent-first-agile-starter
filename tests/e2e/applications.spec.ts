import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { provider, other } from './wallet-fixture';

// Creation responses contain one-time credentials. Keep them out of Playwright trace/network artifacts.
test.use({ trace: 'off' });
// Disable automatic DOM error snapshots for this credential-bearing suite.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
const origin = 'http://localhost:3100';
async function loginApi(page: Page) {
  const account = privateKeyToAccount(generatePrivateKey());
  const challenge = await (await page.request.post('/api/challenge', { headers: { origin }, data: { address: account.address, chainId: 1 } })).json();
  const response = await page.request.post('/api/verify', { headers: { origin }, data: { message: challenge.message, signature: await account.signMessage({ message: challenge.message }) } });
  expect(response.status()).toBe(200);
  return account;
}
async function signUi(page: Page) {
  const review = page.getByRole('button', { name: 'Review a new sign-in message', exact: true });
  if (await review.isVisible()) await review.click();
  else await page.getByRole('button', { name: 'Sign in with MetaMask', exact: true }).click();
  await page.getByRole('button', { name: 'Sign message & continue', exact: true }).click();
}
async function openForm(page: Page) {
  await expect(page.getByRole('heading', { name: 'My applications', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Register application', exact: true }).click();
  await expect(page.getByLabel('Application name', { exact: true })).toBeVisible();
}
async function fill(page: Page, name = 'Example application') {
  await page.getByLabel('Application name', { exact: true }).fill(name);
  await page.getByLabel('Redirect URIs', { exact: true }).fill('https://application.example:8443/callback?source=wallet');
}
async function submit(page: Page) { await page.getByRole('button', { name: 'Register application', exact: true }).click(); }

test('web owner signs in, registers independently, saves once, and returns to the persistent list', async ({ page }) => {
  await provider(page); await page.goto('/'); await signUi(page);
  await page.getByRole('link', { name: 'My applications', exact: true }).click();
  await openForm(page); await fill(page, '<script>Untrusted name</script>'); await submit(page);
  await expect(page.getByRole('heading', { name: 'Application registered', exact: true })).toBeVisible();
  const firstId = await page.locator('#client-id').textContent();
  const secret = await page.locator('#client-secret').textContent();
  expect(Boolean(secret && secret.length >= 32)).toBe(true);
  expect(await page.locator('script').filter({ hasText: 'Untrusted name' }).count()).toBe(0);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored.includes(secret!)).toBe(false); expect(page.url().includes(secret!)).toBe(false);
  await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
  await page.getByRole('button', { name: 'Copy client secret', exact: true }).click();
  await expect(page.locator('.applications p[role="status"]')).toContainText('Client secret copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText()) === secret).toBe(true);
  await page.getByRole('button', { name: 'Return to applications', exact: true }).click();
  await expect(page.locator('#client-secret')).toHaveCount(0);
  await openForm(page); await fill(page, '<script>Untrusted name</script>'); await submit(page);
  expect(await page.locator('#client-id').textContent() !== firstId).toBe(true);
  await page.reload(); await expect(page.getByRole('heading', { name: 'My applications', exact: true })).toBeVisible();
  await expect(page.locator('.application-list > li')).toHaveCount(2); await expect(page.locator('#client-secret')).toHaveCount(0);
  const listText = await page.locator('.application-list').textContent(); expect(listText!.includes(secret!)).toBe(false);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in with MetaMask', exact: true })).toBeVisible();
  await signUi(page); await expect(page.locator('.application-list > li')).toHaveCount(2);
});

test('field errors reject HTTP callbacks and preserve editable form values', async ({ page }) => {
  await loginApi(page); await page.goto('/#applications'); await openForm(page); await submit(page);
  await expect(page.getByRole('alert')).toContainText('1–100');
  await expect(page.getByLabel('Application name', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await fill(page); await page.getByLabel('Redirect URIs', { exact: true }).fill('http://localhost:4000/callback'); await submit(page);
  await expect(page.getByRole('alert')).toContainText('HTTPS on a non-loopback');
  await expect(page.getByLabel('Application name', { exact: true })).toHaveValue('Example application');
  await expect(page.getByLabel('Redirect URIs', { exact: true })).toHaveAttribute('aria-invalid', 'true');
});

test('a lost creation response reconciles to one application without retrieving its secret', async ({ page }) => {
  await loginApi(page); await page.goto('/#applications'); await openForm(page); await fill(page);
  let creates = 0;
  await page.route('**/api/applications', async route => {
    if (route.request().method() === 'POST') { creates++; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await submit(page); await expect(page.getByRole('alert')).toContainText('uncertain');
  await expect(page.getByLabel('Application name', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Check registration', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Application registered', exact: true })).toBeVisible();
  await expect(page.locator('#client-secret')).toHaveCount(0); await expect(page.locator('.applications p[role="status"]')).toContainText('cannot be recovered');
  expect(creates).toBe(1);
  expect((await (await page.request.get('/api/applications')).json()).applications).toHaveLength(1);
});

test('double click while pending sends only one creation request', async ({ page }) => {
  await loginApi(page); await page.goto('/#applications'); await openForm(page); await fill(page);
  let creates = 0; let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/applications', async route => { if (route.request().method() === 'POST') { creates++; await held; } await route.continue(); });
  await page.getByRole('button', { name: 'Register application', exact: true }).dblclick();
  await expect(page.getByRole('button', { name: 'Registering…', exact: true })).toBeDisabled();
  release(); await expect(page.locator('#client-secret')).toBeVisible(); expect(creates).toBe(1);
});

for (const differentOwner of [false, true]) test(`expired submission reauthenticates ${differentOwner ? 'another owner without inherited draft' : 'same owner with retained draft and no autosubmit'}`, async ({ page }) => {
  await provider(page); await page.goto('/#applications'); await signUi(page); await openForm(page); await fill(page, 'Unsaved owner draft');
  await page.request.post('/api/logout', { headers: { origin }, data: {} });
  await submit(page); await expect(page.getByRole('button', { name: 'Sign in with MetaMask', exact: true })).toBeVisible();
  if (differentOwner) await page.evaluate(address => { const eth = (window as any).ethereum; eth.selectedAddress = address; eth.emit('accountsChanged', [address]); }, other.address);
  await signUi(page);
  if (differentOwner) {
    await expect(page.getByRole('heading', { name: 'My applications', exact: true })).toBeVisible();
    await expect(page.locator('.applications')).toContainText(other.address.toLowerCase());
    await openForm(page); await expect(page.getByLabel('Application name', { exact: true })).toHaveValue('');
  } else {
    await expect(page.getByLabel('Application name', { exact: true })).toHaveValue('Unsaved owner draft');
    await expect(page.locator('#client-secret')).toHaveCount(0);
    const before = (await (await page.request.get('/api/applications')).json()).applications.length;
    await submit(page); await expect(page.locator('#client-secret')).toBeVisible();
    expect((await (await page.request.get('/api/applications')).json()).applications.length).toBe(before + 1);
  }
});

for (const theme of ['light', 'dark'] as const) test(`${theme} registration/list/result are accessible, responsive and secrets are redacted`, async ({ page }) => {
  await loginApi(page); await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/#applications'); await openForm(page);
  await fill(page, 'Long application name '.repeat(4));
  const axe = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect((await axe()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `work/US-002/artifacts/form-mobile-${theme}.png`, fullPage: true });
  await page.getByLabel('Application name', { exact: true }).focus(); await page.keyboard.press('Tab');
  await expect(page.getByLabel('Redirect URIs', { exact: true })).toBeFocused();
  await submit(page); await expect(page.locator('#client-secret')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Application registered', exact: true })).toBeFocused();
  expect((await axe()).violations).toEqual([]);
  const id = await page.locator('#client-id').textContent();
  await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();
  await expect(page.locator('#client-id')).toHaveText(id!);
  await page.screenshot({ path: `work/US-002/artifacts/result-mobile-${theme}.png`, fullPage: true, mask: [page.locator('#client-secret')] });
  await page.getByRole('button', { name: 'Return to applications', exact: true }).click();
  expect((await axe()).violations).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `work/US-002/artifacts/list-desktop-${theme}.png`, fullPage: true });
  // Chromium page-scale plus narrow CSS viewport exercises 200% zoom without losing controls.
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Register application', exact: true })).toBeVisible();
});

test('system theme changes preserve the registration draft without submitting it', async ({ page }) => {
  await loginApi(page); await page.emulateMedia({ colorScheme: 'light' }); await page.goto('/#applications'); await openForm(page); await fill(page);
  let creates = 0; page.on('request', req => { if (req.url().endsWith('/api/applications') && req.method() === 'POST') creates++; });
  await page.emulateMedia({ colorScheme: 'dark' }); await expect(page.locator('html')).toHaveClass('dark');
  await expect(page.getByLabel('Application name', { exact: true })).toHaveValue('Example application'); expect(creates).toBe(0);
});
