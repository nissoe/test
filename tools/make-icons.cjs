// Renders tools/icon/icon.html into the app icons (public/icon-*.png). Run: node tools/make-icons.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  // Android "maskable" icons get cropped to a circle, so that variant keeps everything inside the safe zone.
  for (const [size, mask] of [[180, false], [192, false], [512, false], [1024, false], [512, true]]) {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 });
    await page.goto('file://' + path.resolve(__dirname, 'icon/icon.html') + (mask ? '#mask' : ''));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.resolve(__dirname, `../public/icon-${mask ? 'maskable-' : ''}${size}.png`) });
    await page.close();
  }
  await browser.close();
})();
