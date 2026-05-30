import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating to Vercel app...');
  await page.goto('https://proyecto-tesis-block-chain.vercel.app/', { waitUntil: 'networkidle0' });
  
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'NO ROOT ELEMENT');
  console.log('ROOT HTML LENGTH:', rootHtml.length);
  if (rootHtml.length < 500) {
      console.log('ROOT HTML CONTENT:', rootHtml);
  }

  await browser.close();
})();
