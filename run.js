const { chromium } = require('playwright');
const path = require('path');

const URL = 'https://grinding.tnstats.dev/';
const RUN_MS = parseInt(process.env.RUN_MINUTES || '340', 10) * 60 * 1000;

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.text().includes('[AutoGrinder]')) console.log(msg.text());
    });
    page.on('crash', () => {
        console.error('Strona się wywaliła, kończę.');
        process.exit(1);
    });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Wstrzyknij userscript i wciśnij START
    await page.addScriptTag({ path: path.join(__dirname, 'auto-grinder.user.js') });
    await page.locator('button', { hasText: /^START$/ }).click({ timeout: 15000 });
    console.log('Skrypt wystartowany, działam przez', RUN_MS / 60000, 'minut.');

    const end = Date.now() + RUN_MS;
    let minutes = 0;
    while (Date.now() < end) {
        await page.waitForTimeout(60000);
        minutes++;
        if (minutes % 10 === 0) console.log(`Działa już ${minutes} min`);
    }

    await browser.close();
    console.log('Koniec cyklu.');
})().catch(err => {
    console.error(err);
    process.exit(1);
});
