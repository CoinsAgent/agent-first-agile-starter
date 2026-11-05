import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { provider } from './wallet-fixture';

test('sun toggle follows system initially and allows keyboard overrides without replacing SIWE', async ({page}) => {
  await provider(page, {eip6963:true});
  await page.emulateMedia({colorScheme:'light'}); await page.goto('/');
  const toggle = page.getByRole('button', {name:/Switch to (light|dark) mode/});
  await expect(toggle).toHaveCount(1);
  await expect(toggle.locator('svg')).toBeVisible();
  await expect(toggle).toHaveAccessibleName('Switch to dark mode');
  await page.emulateMedia({colorScheme:'dark'}); await expect(page.locator('html')).toHaveClass('dark');
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(toggle).toHaveAccessibleName('Switch to dark mode'); await expect(page.locator('html')).not.toHaveClass('dark');
  await page.emulateMedia({colorScheme:'light'}); await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).not.toHaveClass('dark');
  await toggle.click();
  await page.emulateMedia({colorScheme:'light'}); await expect(page.locator('html')).toHaveClass('dark');
  await page.reload(); await expect(page.locator('html')).not.toHaveClass('dark');
  await page.getByRole('button',{name:'Sign in with MetaMask',exact:true}).click();
  const message = await page.getByLabel('Sign-in message', {exact:true}).textContent();
  await page.emulateMedia({colorScheme:'dark'}); await expect(page.locator('html')).toHaveClass('dark');
  await expect(page.getByLabel('Sign-in message', {exact:true})).toHaveText(message!);
  await page.getByRole('button',{name:'Sign message & continue'}).click();
  await expect(page.getByTestId('verified-address')).toBeVisible();
  const address=await page.getByTestId('verified-address').textContent();
  await toggle.click();
  await expect(page.getByTestId('verified-address')).toHaveText(address!);
  expect(await page.evaluate(()=>(window as any).ethereum.connectionRequests)).toBe(1);
});

test('authentication content grows on desktop and reflows on small screens in both themes', async ({page}) => {
  await page.setViewportSize({width:1024,height:900}); await page.goto('/');
  await expect(page.getByRole('heading',{name:'Sign in with your wallet.'})).toBeVisible();
  const compact = await page.locator('.auth-card').boundingBox();
  await page.setViewportSize({width:1920,height:1080});
  const desktop = await page.locator('.auth-card').boundingBox();
  expect(desktop!.width).toBeGreaterThan(compact!.width + 100);
  expect(await page.locator('h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(44);
  for (const theme of ['Light','Dark']) {
    const toggle=page.getByRole('button',{name:/Switch to (light|dark) mode/});
    if (await page.locator('html').evaluate(el=>el.classList.contains('dark')) !== (theme === 'Dark')) await toggle.click();
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:`work/US-001-01/artifacts/adaptive-desktop-${theme.toLowerCase()}.png`,fullPage:true});
    for (const width of [960,768,640,375,320]) {
      await page.setViewportSize({width,height:740});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(toggle).toBeVisible();
      const box=await toggle.boundingBox();
      const badge=await page.locator('.network').boundingBox();
      expect(Math.abs(box!.height - badge!.height)).toBeLessThan(1);
      expect(box!.width).toBeLessThanOrEqual(30);
      expect(await toggle.evaluate(el=>getComputedStyle(el,'::before').height)).toBe('44px');
      await expect(page.getByRole('button',{name:'Sign in with MetaMask',exact:true})).toBeVisible();
    }
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:`work/US-001-01/artifacts/adaptive-mobile-${theme.toLowerCase()}.png`,fullPage:true});
    await page.setViewportSize({width:1920,height:1080});
  }
});
