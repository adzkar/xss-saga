import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

export const withBrowser = async (fn) => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE_PATH,
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
};

export const withPage = (browser) => async (fn) => {
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
};
