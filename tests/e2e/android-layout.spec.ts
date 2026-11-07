import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const theme of ['light','dark'] as const) for (const [width,height] of [[320,740],[390,720],[412,915]]) {
  test(`Android viewport ${width}x${height} ${theme} uses compact margins and card`,async({browser})=>{
    const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,colorScheme:theme,
      userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36'});
    try {
      const page=await context.newPage();await page.goto('/');
      await expect(page.getByRole('button',{name:'Use your phone',exact:true})).toBeVisible();
      const card=await page.locator('.sign-in-card').boundingBox();
      const header=await page.locator('.page-header').boundingBox();
      expect(card!.height).toBeLessThanOrEqual(460);
      const label=await page.locator('.sign-in-card .mini-label').boundingBox();
      const privacy=await page.locator('.sign-in-card .privacy-note').boundingBox();
      expect(label!.y-card!.y).toBeLessThanOrEqual(22);
      expect(card!.y+card!.height-privacy!.y-privacy!.height).toBeLessThanOrEqual(22);
      expect(card!.x).toBe(12);expect(card!.width).toBe(width-24);
      expect(card!.y-(header!.y+header!.height)).toBeLessThanOrEqual(20);
      expect(await page.locator('.sign-in-card').evaluate(el=>getComputedStyle(el).paddingTop)).toBe('20px');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
      for(const icon of await page.locator('.wallet-shortcut').all()) {
        const box=await icon.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
      await page.screenshot({path:`work/US-001-04/artifacts/android-compact-${theme}-${width}.png`,fullPage:true});
    }finally{await context.close();}
  });
}
