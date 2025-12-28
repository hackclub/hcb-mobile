#!/usr/bin/env node
/* eslint-disable */

/**
 * This script downloads merchant and category data from GitHub's yellow_pages
 * repository and bundles it into a JSON file that's included in the JS bundle.
 *
 * This prevents runtime fetch failures in regions where GitHub is blocked (e.g., China)
 * and makes the data available offline.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const yaml = require("js-yaml");

const MERCHANTS_URL =
  "https://raw.githubusercontent.com/hackclub/yellow_pages/main/lib/yellow_pages/merchants.yaml";
const CATEGORIES_URL =
  "https://raw.githubusercontent.com/hackclub/yellow_pages/main/lib/yellow_pages/categories.yaml";

const OUTPUT_DIR = path.join(__dirname, "..", "src", "lib", "yellowpages");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "data.json");
const TIMESTAMP_FILE = path.join(OUTPUT_DIR, ".last-updated");

// only refetch if older than 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function shouldUpdate() {
  if (process.env.CI || process.env.EAS_BUILD) {
    return true;
  }

  if (!fs.existsSync(OUTPUT_FILE)) {
    return true;
  }

  if (!fs.existsSync(TIMESTAMP_FILE)) {
    return true;
  }

  try {
    const lastUpdated = parseInt(fs.readFileSync(TIMESTAMP_FILE, "utf8"), 10);
    return Date.now() - lastUpdated > CACHE_DURATION_MS;
  } catch {
    return true;
  }
}

function processCategories(categoriesData) {
  const result = {};

  if (typeof categoriesData === "object" && categoriesData !== null) {
    for (const [code, value] of Object.entries(categoriesData)) {
      if (value && typeof value === "object") {
        result[code] = {
          name: value.name || code,
        };
      }
    }
  }

  return result;
}

function processMerchants(merchantsData) {
  const result = [];

  if (Array.isArray(merchantsData)) {
    for (const merchant of merchantsData) {
      if (!merchant || !merchant.name) continue;

      const networkIds = merchant.network_ids || [];
      const normalizedIds = Array.isArray(networkIds) ? networkIds : [];

      result.push({
        name: merchant.name,
        network_ids: normalizedIds,
        icon: merchant.icon || null,
        website: merchant.website || null,
      });
    }
  }

  return result;
}

async function main() {
  console.log("📦 Bundling yellow_pages data...");

  if (!shouldUpdate()) {
    console.log("✅ Using cached yellow_pages data (less than 1 hour old)");
    return;
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    console.log("⬇️  Fetching merchants and categories from GitHub...");

    const [merchantsYaml, categoriesYaml] = await Promise.all([
      fetch(MERCHANTS_URL),
      fetch(CATEGORIES_URL),
    ]);

    console.log("🔄 Parsing YAML data...");

    const merchantsRaw = yaml.load(merchantsYaml);
    const categoriesRaw = yaml.load(categoriesYaml);

    const merchants = processMerchants(merchantsRaw);
    const categories = processCategories(categoriesRaw);

    const bundledData = {
      merchants,
      categories,
      bundledAt: new Date().toISOString(),
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bundledData, null, 2));
    fs.writeFileSync(TIMESTAMP_FILE, Date.now().toString());

    console.log(
      `✅ Bundled ${merchants.length} merchants and ${Object.keys(categories).length} categories`,
    );
    console.log(`📁 Output: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("⚠️  Failed to fetch yellow_pages data:", error.message);

    if (fs.existsSync(OUTPUT_FILE)) {
      console.log("📦 Using existing bundled data as fallback");
      return;
    }

    console.log("📦 Creating empty fallback data");
    const fallbackData = {
      merchants: [],
      categories: {},
      bundledAt: new Date().toISOString(),
      fallback: true,
    };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fallbackData, null, 2));
  }
}

main().catch(console.error);
