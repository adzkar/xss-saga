import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

import { fileNameGenerator } from "./utils/file.mjs";

dotenv.config();

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
    });
    const page = await browser.newPage();
    await page.goto("https://google.com");
    await page.screenshot({
      path: `${process.env.SCREENSHOTS_PATH}/${fileNameGenerator({
        name: "ss",
      })}`,
    });

    await browser.close();
  } catch (err) {
    console.log(err);
  }
})();
