import puppeteer from 'puppeteer';
import fs from 'fs';
import os from 'os';

function getExecutablePath() {
  // If running in Docker/Render, use the environment variable provided by the Docker image
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  // If local Windows, fallback to standard Chrome installations to bypass corporate firewall block
  if (os.platform() === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
  }
  
  // Let puppeteer resolve bundled Chromium as last resort
  return undefined;
}

export async function scrapeUrl(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: getExecutablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage', // Essential for Docker/Render environments
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Rotate User-Agents
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const innerText = await page.evaluate(() => {
      const elementsToRemove = document.querySelectorAll('script, style, svg, noscript, iframe');
      elementsToRemove.forEach(el => el.remove());
      return document.body.innerText;
    });

    return innerText;
  } finally {
    await browser.close();
  }
}
