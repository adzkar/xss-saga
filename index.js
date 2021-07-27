import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

import { getFormMethod } from "./utils/commonUtils.mjs";
import METHOD from "./constants/method.mjs";

dotenv.config();

const TARGET_URL = "http://localhost:8000/vulnerabilities/xss_d/";
// const TARGET_URL = "https://google.com";
const COOKIES = "PHPSESSID=8uvchrases5b5g7tfii24urs84; security=low";

(async () => {
  try {
    let filteredSelectTags = [];
    let rawJsFiles = [];

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
    });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ Cookie: COOKIES });
    const response = await page.goto(TARGET_URL);

    if (page.url() !== TARGET_URL) {
      console.log("You need the credential");
      process.exit(1);
    }

    // get all input, select tag
    const filteredInputName = await page.evaluate(() => {
      const types = document.querySelectorAll("input");

      return Array.prototype.reduce.call(
        types,
        (obj, node) => {
          if (node.type !== "submit" && node?.name) {
            obj.push(node?.name);
          }
          return obj;
        },
        []
      );
    });

    const filteredSubmitName = await page.evaluate(() => {
      const types = document.querySelectorAll("input");

      return Array.prototype.reduce.call(
        types,
        (obj, node) => {
          if (node.type === "submit" && node?.name) {
            obj.push(node.name);
          }
          return obj;
        },
        []
      );
    });

    const filteredSelectName = await page.evaluate(() => {
      const types = document.querySelectorAll("select");

      return Array.prototype.reduce.call(
        types,
        (obj, node) => {
          if (node?.name) {
            obj.push(node.name);
          }

          return obj;
        },
        []
      );
    });

    console.log(filteredInputName);
    console.log(filteredSubmitName);
    console.log(filteredSelectName);
    debugger;

    console.log("Running Reflected XSS Scanner");
    // checking if the page is exist
    if (response.status() === 200) {
      try {
        // checking form
        console.log("Searching possibility reflected XSS");
        const forms = await page.$$("form");

        if (forms.length > 0) {
          const method = await page.$eval("form", getFormMethod);
          if (method === METHOD.GET) {
          }
        }
      } catch {
        console.log("There is no possibility for reflected XSS");
      }
    }

    debugger;

    // await page.screenshot({
    //   path: `${process.env.SCREENSHOTS_PATH}/${fileNameGenerator({
    //     name: "ss",
    //   })}`,
    // });

    await browser.close();
  } catch (err) {
    console.log(err);
  }
})();
