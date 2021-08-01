"use strict";
import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";
import Bluebird from "bluebird";

import { getFormMethod } from "./utils/commonUtils.mjs";
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

    // variable for checking if the xss is found
    var isFound = false;
    await page.on("dialog", async (dialog) => {
      try {
        console.log(dialog.message(), " dialog message");
        isFound = true;
        await dialog.accept();
        if (dialog.message()) {
          console.log("XSS Stored is found");
          await browser.close();
        }
      } catch {
        console.log("no alert");
      }
    });
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
            // generate cases
            const cases = payloads.map((payload) => {
              return {
                url: TARGET_URL,
                payload,
                tags: inputName,
              };
            });

            const results = await Bluebird.map(
              cases,
              async ({ tags, payload }) => {
                await tags.forEach(async (item) => {
                  const typedTag = `${item.tag}[name=${item.name}]`;
                  const buttonTag = filteredSubmit?.[0];
                  const clickedButton = `${buttonTag.tag}[name=${buttonTag.name}]`;
                  console.log(typedTag, " typed tag");
                  await page
                    .evaluate(
                      ({ typedTag, payload }) => {
                        document.querySelector(typedTag).value = payload;
                      },
                      {
                        typedTag,
                        payload,
                      }
                    )
                    .catch((err) => {
                      // console.log(err, " err typing payload");
                      console.log(" err typing payload");
                    });

                  const waitSubmitBtn = await page
                    .waitForSelector(clickedButton)
                    .catch(() => {
                      console.log(" err select button");
                    });

                  try {
                    await waitSubmitBtn.click();

                    await page.waitForNavigation();
                  } catch {
                    console.log("failed to click btn");
                  }
                });

                return isFound;
              }
            );

            console.log(results, " results");
          }
        }
      } catch {
        console.log("There is no possibility for Stored XSS");
      }
    }

    await browser.close();
  } catch (err) {
    console.log(err);
  }
})();
