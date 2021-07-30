"use strict";
import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";
import Bluebird from "bluebird";

import { withBrowser, withPage } from "./utils/browser.mjs";
import { getFormMethod } from "./utils/commonUtils.mjs";
import METHOD from "./constants/method.mjs";

dotenv.config();

const TARGET_URL = "http://localhost:8000/vulnerabilities/xss_r/";
const COOKIES = "PHPSESSID=8uvchrases5b5g7tfii24urs84; security=low";
const FILE_NAME = "./payloads/payload.txt";

(async () => {
  try {
    const payloads = await (
      await fs.promises.readFile(FILE_NAME, "utf-8")
    ).split("\n");

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_EXECUTABLE_PATH,
    });
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({ Cookie: COOKIES });

    const response = await page
      .goto(TARGET_URL, {
        waitUntil: "networkidle2",
      })
      .catch(() => {
        console.log("Invalid URL or The Web is not found");
        process.exit(1);
      });

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

    console.log("Running Reflected XSS Scanner");
    // checking if the page is exist
    if (response.status() === 200) {
      try {
        // checking form
        console.log("Searching possibility reflected XSS");
        const forms = await page.$$("form");

        if (forms.length > 0) {
          const method = await page.$eval("form", getFormMethod);
          if (method.toUpperCase() === METHOD.GET) {
            const queries = [];
            payloads.forEach((payload) => {
              const inputQueries = filteredInputName
                .map((item) => {
                  return `${item}=${payload}&`;
                })
                .join();
              if (inputQueries.length > 0) {
                queries.push(`?${inputQueries.slice(0, -1)}`);
              }
              const submitQueries = filteredSubmitName
                .map((item) => {
                  return `${item}=${payload}&`;
                })
                .join();
              if (submitQueries.length > 0) {
                queries.push(`?${submitQueries.slice(0, -1)}`);
              }
              const selectQueries = filteredSelectName
                .map((item) => {
                  return `${item}=${payload}&`;
                })
                .join();
              if (selectQueries.length > 0) {
                queries.push(`?${selectQueries.slice(0, -1)}`);
              }
            });

            const cases = queries.map((query, index) => {
              const testedUrl = `${TARGET_URL}${query}`;
              return {
                payload: payloads[index],
                url: testedUrl,
              };
            });

            // Testing generated urls
            // handling multiple tab processing
            // using concurrency
            const results = await withBrowser(async (browser) => {
              return Bluebird.map(
                cases,
                async ({ url, payload }) => {
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

                    return {
                      result: value,
                      payload: payload,
                    };
                  });
                },
                { concurrency: 5 }
              );
            });
            console.log(results, " results");
          }
        }
      } catch {
        console.log("There is no possibility for reflected XSS");
      }
    }

    await browser.close();
  } catch (err) {
    console.log(err);
  }
})();
