const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { default: axios } = require("axios");
const saveImage = require("../saveImage");
const listStaticConfigs = require("../../../src/assets/listStaticConfigs.json");
const runInBatch = require("../runInBatch");
const uriSchema = require("../../schemas/uriSchema");
const getCoingeckoCoinsList = require("../getCoingeckoCoinsList");
const coingeckoPlatformFromNetworkId = require("../coingeckoPlatformFromNetworkId");
const sleep = require("../sleep");
const checkFileExists = require("../checkFileExists");

const uriValidate = addFormats(new Ajv()).compile(uriSchema);

// export type JupToken = {
//   address:          string;
//   name:             string;
//   symbol:           string;
//   decimals:         number;
//   logoURI:          null | string;
//   tags:             string[];
//   daily_volume:     number | null;
//   freeze_authority: null | string;
//   mint_authority:   null | string;
// }

const JUP_V1_API_URL = "https://tokens.jup.ag";
const JUP_LITE_V2_API_URL = "https://lite-api.jup.ag";

async function jupApiGet(baseUrl, path) {
  const response = await axios
    .get(`${baseUrl}/${path}`, { timeout: 90000 })
    .catch((e) => {
      throw new Error(`Unable to fetch jup list: ${path}`, e);
    });
  if (!response || !response.data) return [];
  return response.data;
}

module.exports = async function getSolanaTokensFromJup(currentTokensSet) {
  const tokensWithMarket = await jupApiGet(
    JUP_V1_API_URL,
    "tokens_with_markets"
  );
  await sleep(5000);
  const tokensVerified = await jupApiGet(
    JUP_LITE_V2_API_URL,
    "tokens/v2/tag?query=verified"
  );
  const jupTokensMap = new Map();
  [...tokensWithMarket, ...tokensVerified].forEach((t) => {
    jupTokensMap.set(t.address, t);
  });
  const jupTokens = Array.from(jupTokensMap.values());

  const geckoList = await getCoingeckoCoinsList();
  const solanaGeckoPlatform = coingeckoPlatformFromNetworkId("solana");
  const geckoIds = new Map();
  geckoList.forEach((item) => {
    if (item.platforms && item.platforms[solanaGeckoPlatform] && item.id) {
      geckoIds.set(item.platforms[solanaGeckoPlatform], item.id);
    }
  });

  const tokens = new Map();
  const tokenImagesToFetch = [];

  for (let i = 0; i < jupTokens.length; i++) {
    const jupToken = jupTokens[i];
    const geckoId = geckoIds.get(jupToken.address);
    const extensions = geckoId ? { coingeckoId: geckoId } : undefined;

    // logoURI
    const f = await checkFileExists(`images/solana/${jupToken.address}.webp`);
    const isUriValid = uriValidate(jupToken.logoURI);
    const logoURI =
      f || !jupToken.logoURI || !isUriValid
        ? `https://raw.githubusercontent.com/sonarwatch/token-lists/main/images/solana/${jupToken.address}.webp`
        : jupToken.logoURI;

    tokens.set(jupToken.address, {
      address: jupToken.address,
      chainId: listStaticConfigs.solana.chainId,
      decimals: jupToken.decimals,
      name: jupToken.name,
      symbol: jupToken.symbol,
      logoURI: logoURI,
      extensions,
    });

    // TEMPORARILY DISABLED
    // if (!currentTokensSet.has(jupToken.address) || Math.random() < 0.01) {
    //   tokenImagesToFetch.push(jupToken);
    // }
  }

  runInBatch(
    tokenImagesToFetch.map((jupToken) => {
      return async () => {
        if (!jupToken.logoURI) return;
        await saveImage(
          jupToken.logoURI,
          `images/solana/${jupToken.address}.webp`
        );
      };
    }),
    10
  );

  return Array.from(tokens.values());
};
