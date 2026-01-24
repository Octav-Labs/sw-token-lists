const { default: axios } = require("axios");
const fs = require("fs");
const path = require("path");
const sleep = require("./sleep");

const CACHE_DIR = path.join(__dirname, "../../.cache");
const CACHE_FILE = path.join(CACHE_DIR, "coingecko-coins-list.json");
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hour

module.exports = async function getCoingeckoCoinsList() {
  // Check cache first
  if (fs.existsSync(CACHE_FILE)) {
    const stat = fs.statSync(CACHE_FILE);
    const age = Date.now() - stat.mtimeMs;
    if (age < CACHE_TTL) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  }

  try {
    const coinsListRes = await axios.get(
      "https://api.coingecko.com/api/v3/coins/list",
      {
        params: {
          include_platform: "true",
        },
        timeout: 50000,
      }
    );
    // Write to cache
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(coinsListRes.data));
    return coinsListRes.data;
  } catch (error) {
    await sleep(180000);
    if (error.response) {
      throw new Error(
        `Failed to fetch Coingecko's coins list (${error.response.status})`
      );
    } else {
      throw error;
    }
  }
};
