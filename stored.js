"use strict";
import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";
import Bluebird from "bluebird";

import { getFormMethod } from "./utils/commonUtils.mjs";
import { withBrowser, withPage } from "./utils/browser.mjs";
import METHOD from "./constants/method.mjs";

dotenv.config();

const TARGET_URL = "http://localhost:8000/vulnerabilities/xss_s/";
const COOKIES = "PHPSESSID=8uvchrases5b5g7tfii24urs84; security=low";
const FILE_NAME = "./payloads/payload.txt";

const CANCELED_BUTTONS = ["clear", "reset", "cancel"];

(async () => {
  try {
    const payloads = await (
      await fs.promises.readFile(FILE_NAME, "utf-8")
    ).split("\n");

    const browser = await puppeteer.launch({
      headless: false,
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
      b;
    }

    const filteredInput = await page.evaluate(() => {
      const types = document.querySelectorAll("input");

      return Array.prototype.reduce.call(
        types,
        (obj, node) => {
          if (node.type !== "submit" && node?.name) {
            obj.push({
              name: node?.name,
              tag: node?.tagName.toLowerCase(),
            });
          }
          return obj;
        },
        []
      );
    });

    const filteredTextArea = await page.evaluate(() => {
      const types = document.querySelectorAll("textarea");

      return Array.prototype.reduce.call(
        types,
        (obj, node) => {
          obj.push({
            name: node?.name,
            tag: node?.tagName.toLowerCase(),
          });
          return obj;
        },
        []
      );
    });

    let filteredSubmit = await page.evaluate(() => {
      const types = document.querySelectorAll("form input", "form button");

      return Array.prototype.reduce.call(
        types,
        (obj, node) => {
          if (node.type === "submit" && node?.name) {
            obj.push({
              name: node?.name,
              tag: node?.tagName.toLowerCase(),
            });
          }
          return obj;
        },
        []
      );
    });
    filteredSubmit = filteredSubmit.filter((item) => {
      const name = item?.name?.toLowerCase();
      return !CANCELED_BUTTONS.some((x) => {
        return name.includes(x);
      });
    });

    const filteredSelect = await page.evaluate(() => {
      const types = document.querySelectorAll("select");

      return Array.prototype.reduce.call(
        types,
        (obj, node) => {
          if (node?.name) {
            obj.push({
              name: node?.name,
              tag: node?.tagName.toLowerCase(),
            });
          }

          return obj;
        },
        []
      );
    });
    const inputName = Array.from(
      new Set(
        filteredInput.concat(filteredInput, filteredSelect, filteredTextArea)
      )
    );

    console.log("Running Stored XSS Scanner");
    // checking if the page is exist
    if (response.status() === 200) {
      try {
        // checking form
        console.log("Searching possibility Stored XSS");
        const forms = await page.$$("form");

        if (forms.length > 0) {
          const method = await page.$eval("form", getFormMethod);
          if (method.toUpperCase() === METHOD.POST) {
            // handling multiple tab processing
            // using concurrency
            const results = await withBrowser(async (browser) => {
              return Bluebird.map(
                payloads,
                async (payload) => {
                  return withPage(browser)(async (currentPage) => {
                    let value = false;
                    await currentPage.setExtraHTTPHeaders({ Cookie: COOKIES });
                    await inputName.forEach(async (item) => {
                      await page.evaluate(
                        ({ item, payload }) => {
                          const typedTag = `${item.tag}[name=${item.name}]`;
                          document.querySelector(typedTag).value = payload;
                        },
                        { item, payload }
                      );
                    });
                    //   await page.on("dialog", async (dialog) => {
                    //     console.log(`Dialog Message: ${dialog.message()}`);
                    //     value = true;
                    //     await dialog.accept();
                    //   });
                    //   await page.goto(TARGET_URL, {
                    //     waitUntil: "networkidle2",
                    //   });
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

            // await filteredSubmit.forEach(async (item) => {
            //   const clickedTag = `${item.tag}[name=${item.name}]`;
            // });
          }
        }
      } catch {
        console.log("There is no possibility for Stored XSS");
      }
    }

    // await browser.close();
  } catch (err) {
    console.log(err);
  }
})();
