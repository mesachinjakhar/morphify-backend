/**
 * PhotoAI Scraper (v9 - Skip Existing)
 * This script uses Puppeteer to reliably scrape dynamically loaded content from photoai.com.
 *
 * How it works:
 * 1.  Checks if a pack's folder already exists in the output directory. If so, it skips that pack.
 * 2.  Launches a headless Chromium browser using Puppeteer.
 * 3.  Navigates to the homepage, waits for it to load, and extracts pack page URLs
 * along with their descriptions from the main pack listing.
 * 4.  For each new pack page (e.g., /tinder):
 * a. Navigates to the page and waits for the photo grid to render.
 * b. Scrapes all links to individual photo detail pages (e.g., /photos/...).
 * c. Extracts the text prompt from every single photo detail page.
 * d. Randomly selects 3 of these photo page links for image download.
 * 5.  For each of the 3 selected photo pages:
 * a. Navigates to the page and waits for the main image to load.
 * b. Finds and extracts the final, high-resolution image URL.
 * 6.  Downloads the 3 final images and saves them into a pack-specific folder,
 * along with a file for the pack description and a file containing all collected photo prompts.
 *
 * Dependencies: puppeteer, axios
 */

const puppeteer = require("puppeteer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://photoai.com";
const ROOT_OUTPUT_FOLDER = path.join(__dirname, "packs");

/**
 * Ensures a directory exists, creating it recursively if it doesn't.
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // This can happen if the directory is created between the check and mkdir, which is fine.
    if (error.code !== "EEXIST") {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }
}

/**
 * Downloads an image from a URL and saves it to a specified file path.
 */
const downloadImage = (url, filePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      await ensureDirectoryExists(path.dirname(filePath));
      const response = await axios({
        method: "GET",
        url,
        responseType: "stream",
        timeout: 30000,
      });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    } catch (err) {
      console.error(`Failed to download image from ${url}:`, err.message);
      reject(err);
    }
  });
};

/**
 * Uses Puppeteer to fetch all pack URLs and their descriptions from the homepage.
 * @param {puppeteer.Browser} browser - The Puppeteer browser instance.
 * @returns {Promise<{url: string, description: string}[]>} A promise that resolves to an array of pack objects.
 */
async function getAllPackUrls(browser) {
  console.log(`Fetching pack list from ${BASE_URL}...`);
  const page = await browser.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle2" });

    // Wait for dynamic content to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const packsData = await page.evaluate((baseUrl) => {
      const data = [];
      const processedHrefs = new Set(); // To avoid duplicate packs
      const excludedKeywords = [
        "/pricing",
        "/faq",
        "/login",
        "/billing",
        "/gallery",
        "/ideas",
        "/blog",
        "/terms",
        "/privacy",
        "/photos/",
        "/photo/",
        "/help",
        "/contact",
        "/about",
      ];

      // Find all links that are likely pack links
      document.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href");

        if (!href || !href.startsWith("/") || processedHrefs.has(href)) {
          return; // Skip if no href, not a root link, or already processed
        }

        const pathParts = href.split("/").filter((part) => part.length > 0);

        // A pack URL is one level deep (e.g., /tinder), not in excluded list, and contains an image
        if (
          pathParts.length === 1 &&
          !excludedKeywords.some((k) => href.includes(k)) &&
          a.querySelector("img")
        ) {
          const descriptionElement = a.querySelector(
            ".div_template_description"
          );
          const description = descriptionElement
            ? descriptionElement.textContent.trim().replace(/\s\s+/g, " ")
            : "No description found.";

          data.push({
            url: `${baseUrl}${href}`,
            description: description,
          });

          processedHrefs.add(href);
        }
      });

      return data;
    }, BASE_URL);

    console.log(`Found ${packsData.length} unique packs.`);
    if (packsData.length > 0) {
      console.log("Example pack data:", packsData[0]);
    }
    return packsData;
  } finally {
    await page.close();
  }
}

/**
 * Shuffles an array in place.
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Scrapes a single pack page, but only if it hasn't been scraped before.
 * @param {puppeteer.Browser} browser - The Puppeteer browser instance.
 * @param {string} packUrl - The URL of the pack page to scrape.
 * @param {string} packDescription - The description for this pack.
 */
async function scrapePack(browser, packUrl, packDescription) {
  const packName = packUrl.split("/").pop();
  if (!packName) {
    console.warn(`Could not determine pack name for URL: ${packUrl}`);
    return;
  }

  // **MODIFICATION**: Check if the pack directory already exists.
  const packDir = path.join(ROOT_OUTPUT_FOLDER, packName);
  if (fs.existsSync(packDir)) {
    console.log(
      `--- Skipping pack: ${packName} (directory already exists) ---`
    );
    return; // Exit the function for this pack.
  }

  console.log(`\n--- Scraping new pack: ${packName} ---`);

  const page = await browser.newPage();
  try {
    await page.goto(packUrl, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const photoPageLinks = await page.evaluate((baseUrl) => {
      const links = new Set();
      document
        .querySelectorAll('a[href^="/photo/"], a[href^="/photos/"]')
        .forEach((a) => {
          const href = a.getAttribute("href");
          if (href) {
            links.add(`${baseUrl}${href}`);
          }
        });
      return Array.from(links);
    }, BASE_URL);

    console.log(`  - Found ${photoPageLinks.length} photo links on pack page`);

    if (photoPageLinks.length === 0) {
      console.warn(`  - No photo links found for pack: ${packName}`);
      return;
    }

    console.log(
      `  - Extracting prompts from all ${photoPageLinks.length} photos...`
    );
    const allPrompts = [];

    for (let i = 0; i < photoPageLinks.length; i++) {
      const photoLink = photoPageLinks[i];
      console.log(`    - Getting prompt ${i + 1}/${photoPageLinks.length}`);

      try {
        await page.goto(photoLink, { waitUntil: "networkidle2" });
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const prompt = await page.evaluate(() => {
          const img = document.querySelector("img.main");
          let promptText = null;
          if (img) promptText = img.alt || img.title;
          if (!promptText) {
            const fallbackImg = document.querySelector(
              "img.output_image, .img-fluid, img[class*='main']"
            );
            if (fallbackImg) promptText = fallbackImg.alt || fallbackImg.title;
          }
          if (!promptText) {
            const promptSelectors = [
              '[class*="prompt"]',
              '[id*="prompt"]',
              ".description",
              "h1",
              "h2",
            ];
            for (const selector of promptSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent.trim()) {
                promptText = element.textContent.trim();
                break;
              }
            }
          }
          return promptText || "No prompt available";
        });

        allPrompts.push(prompt);
        console.log(`      - Prompt: ${prompt.substring(0, 60)}...`);
      } catch (err) {
        console.error(
          `      - Failed to get prompt from ${photoLink}: ${err.message}`
        );
        allPrompts.push("Error extracting prompt");
      }
    }

    const numPhotosToDownload = Math.min(3, photoPageLinks.length);
    shuffle(photoPageLinks);
    const selectedPhotoLinks = photoPageLinks.slice(0, numPhotosToDownload);

    console.log(`  - Selected ${numPhotosToDownload} photos for download`);
    const finalImageUrls = [];

    for (let i = 0; i < selectedPhotoLinks.length; i++) {
      const photoLink = selectedPhotoLinks[i];
      console.log(
        `  - Processing download ${i + 1}/${selectedPhotoLinks.length}: ${photoLink}`
      );

      try {
        await page.goto(photoLink, { waitUntil: "networkidle2" });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const imageUrl = await page.evaluate(() => {
          const img = document.querySelector("img.main");
          if (img && img.src) return img.src;
          const fallbackImg = document.querySelector(
            "img.output_image, .img-fluid, img[class*='main']"
          );
          return fallbackImg ? fallbackImg.src : null;
        });

        if (imageUrl) {
          console.log(`    - Found image URL for download`);
          finalImageUrls.push({ url: imageUrl, link: photoLink });
        } else {
          console.warn(`    - Could not find main image on ${photoLink}`);
        }
      } catch (err) {
        console.error(
          `    - Failed to process photo page ${photoLink}: ${err.message}`
        );
      }
    }

    if (finalImageUrls.length === 0) {
      console.warn(`  - No images could be extracted for pack: ${packName}`);
      return;
    }

    console.log(
      `  - Successfully extracted ${finalImageUrls.length} image URLs`
    );

    // Create pack directory (we already know it doesn't exist)
    await ensureDirectoryExists(packDir);

    if (packDescription && packDescription !== "No description found.") {
      console.log(`  - Saving pack description`);
      const descriptionPath = path.join(packDir, "description.txt");
      await fs.promises.writeFile(descriptionPath, packDescription, "utf8");
    }

    if (allPrompts.length > 0) {
      console.log(`  - Saving ${allPrompts.length} prompts from all photos`);
      const promptsPath = path.join(packDir, "prompts.txt");
      await fs.promises.writeFile(
        promptsPath,
        JSON.stringify(allPrompts, null, 2),
        "utf8"
      );
    }

    for (let i = 0; i < finalImageUrls.length; i++) {
      const { url: imageUrl, link: photoLink } = finalImageUrls[i];
      try {
        const photoId = photoLink.split("/").pop();
        let ext = ".jpg";
        const urlPath = new URL(imageUrl).pathname;
        const match = urlPath.match(/\.(jpg|jpeg|png|webp|gif)$/i);
        if (match) ext = match[0].toLowerCase();

        const fileName = `${photoId}${ext}`;
        const filePath = path.join(packDir, fileName);

        console.log(`    - Downloading image ${i + 1} as ${fileName}`);
        await downloadImage(imageUrl, filePath);
        console.log(`    - ✓ Downloaded successfully`);
      } catch (err) {
        console.error(
          `    - Failed to download image ${i + 1}: ${err.message}`
        );
      }
    }

    console.log(
      `--- ✓ Finished pack: ${packName} (${finalImageUrls.length} images downloaded, ${allPrompts.length} prompts collected) ---`
    );
  } catch (error) {
    console.error(`Failed to scrape pack at ${packUrl}: ${error.message}`);
  } finally {
    await page.close();
  }
}

/**
 * Main function to orchestrate the scraping process.
 */
async function main() {
  console.log("Starting PhotoAI scraper (v9 - Skip Existing)...");
  let browser;
  try {
    await ensureDirectoryExists(ROOT_OUTPUT_FOLDER);
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1920, height: 1080 },
    });

    const allPacks = await getAllPackUrls(browser);

    if (allPacks.length === 0) {
      console.log("No packs found. Exiting.");
      return;
    }

    console.log(
      `\nFound ${allPacks.length} packs. Starting scraping process...\n`
    );

    for (let i = 0; i < allPacks.length; i++) {
      const { url: packUrl, description: packDescription } = allPacks[i];
      console.log(`Processing pack ${i + 1}/${allPacks.length}: ${packUrl}`);
      await scrapePack(browser, packUrl, packDescription);

      if (i < allPacks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log("\n🎉 Scraping process completed successfully!");
  } catch (error) {
    console.error("An error occurred during the main process:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

process.on("SIGINT", () => {
  console.log("\n⚠️  Process interrupted. Cleaning up...");
  process.exit(0);
});

main();
