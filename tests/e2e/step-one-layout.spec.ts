import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { provider } from './wallet-fixture';

for (const width of [320, 1440]) test(`step one at ${width}px has one action row and no inner scrollbar`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await provider(page, { chain: '0xa' });
  await page.goto('/');
  const content=page.locator('.card-content');
  const noScrollbar=async()=>{
    expect(await content.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  };
  await expect(page.getByRole('button',{name:'Use your phone',exact:true})).toBeVisible();
  await expect(page.locator('.wallet-shortcuts')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await noScrollbar();
  const card=page.locator('.sign-in-card');
  const initial=await card.boundingBox();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const compactFooter=async()=>{
    const body=await content.boundingBox();
    const footer=await card.locator('.privacy-note').boundingBox();
    expect(footer!.y-(body!.y+body!.height)).toBeLessThanOrEqual(16);
  };
  await compactFooter();
  await page.getByRole('button',{name:'Sign in with MetaMask',exact:true}).click();
  const alert=page.getByRole('alert');
  await expect(alert).toContainText('Ethereum Mainnet');
  await expect(card.getByRole('alert')).toHaveCount(0);
  await expect(card).toHaveAttribute('aria-describedby','signin-error');
  const box=await card.boundingBox(),errorBox=await alert.boundingBox();
  expect(errorBox!.y).toBeGreaterThanOrEqual(box!.y+box!.height+8);
  expect(errorBox!.width).toBeCloseTo(box!.width,0);
  if(width>=768) expect(box!.height).toBe(initial!.height);
  else expect(box!.height-initial!.height).toBeLessThanOrEqual(60); // Only the new recovery button row adds height.
  await compactFooter();
  const actions=page.locator('.step-one-actions .button');
  await expect(actions).toHaveCount(2);
  const [retry,cancel]=await actions.all();
  const first=await retry.boundingBox(),second=await cancel.boundingBox();
  expect(first!.y).toBe(second!.y);
  expect(first!.x+first!.width).toBeLessThanOrEqual(second!.x);
  await noScrollbar();
  for(const theme of ['light','dark'] as const) {
    await page.emulateMedia({colorScheme:theme});
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:`work/US-001-05/artifacts/outside-error-${theme}-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Cancel sign-in',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(card).not.toHaveAttribute('aria-describedby');
  await page.getByRole('button',{name:'Use your phone',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Use your phone',exact:true});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByAltText('QR code to open WalletGate phone approval')).toBeVisible();
  expect((await page.request.get('/api/session')).status()).toBe(401);
  await page.getByRole('button',{name:'Close phone approval'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Use your phone',exact:true})).toBeFocused();
  await noScrollbar();
});
