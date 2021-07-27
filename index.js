import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

const TARGET_URL = "http://localhost:8000/vulnerabilities/xss_d/";
// const TARGET_URL = "https://google.com";
const COOKIES = "PHPSESSID=8uvchrases5b5g7tfii24urs84; security=low";

(async () => {
  try {
    let filteredInputTags = [];
    let filteredSubmitButton = [];
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

    console.log("Running Reflected XSS Scanner");
    // checking if the page is exist
    if (response.status() === 200) {
      try {
        // checking form
        console.log("Searching possibility reflected XSS");
        const forms = await page.$$("form");

        if (forms.length > 0) {
          const method = await page.$eval("form", (el) => {
            return el.getAttribute("method");
          });
          console.log(method);
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
