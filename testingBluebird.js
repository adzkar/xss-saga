"use strict";
import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import bluebird from "bluebird";

dotenv.config();
const COOKIES = "PHPSESSID=8uvchrases5b5g7tfii24urs84; security=low";

const withBrowser = async (fn) => {
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

const withPage = (browser) => async (fn) => {
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
};

const urls = [
  "http://localhost:8000/vulnerabilities/xss_d/?default=hola",
  "http://localhost:8000/vulnerabilities/xss_d/?default=abc",
  "http://localhost:8000/vulnerabilities/xss_d/?default=kata kunci",
  'http://localhost:8000/vulnerabilities/xss_d/?default=<img onerror=`alert(1)` src="">',
  'http://localhost:8000/vulnerabilities/xss_d/?default=<img onerror="alert(1)" src="">',
  "http://localhost:8000/vulnerabilities/xss_d/?default=<script>alert(1)</script>",
];

(async () => {
  //   await withBrowser(async (browser) => {
  //     for (const url of urls) {
  //       const result = await withPage(browser)(async (page) => {
  //         console.log(`Current Testing: \n ${url}`);
  //         await page.setExtraHTTPHeaders({ Cookie: COOKIES });
  //         await page.goto(url, {
  //           waitUntil: "networkidle2",
  //         });
  //         await page.on("dialog", async (dialog) => {
  //           console.log(`Dialog Message: ${dialog.message()}`);
  //         });
  //         // page.evaluate(() => {

  //         // });
  //         return 1;
  //       });

  //       results.push(result);
  //     }
  //   });
  const results = await withBrowser(async (browser) => {
    return bluebird.map(
      urls,
      async (url) => {
        return withPage(browser)(async (page) => {
          let value = false;
          await page.setExtraHTTPHeaders({ Cookie: COOKIES });
          await page.on("dialog", async (dialog) => {
            console.log(`Dialog Message: ${dialog.message()}`);
            value = true;
            await dialog.accept();
          });
          await page.goto(url, {
            waitUntil: "networkidle2",
          });

          return value;
        });
      },
      { concurrency: 5 }
    );
  });
  console.log(results, " results");
})();
