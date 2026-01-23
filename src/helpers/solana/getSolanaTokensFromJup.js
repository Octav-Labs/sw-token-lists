require("dotenv").config();
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

async function jupApiGet(tag) {
  const response = await axios
    .get(`https://api.jup.ag/tokens/v2/tag`, {
      params: { query: tag },
      headers: { "x-api-key": process.env.JUP_API_KEY },
      timeout: 90000,
    })
    .catch((e) => {
      throw new Error(`Unable to fetch jup list: ${tag}`, e);
    });
  if (!response || !response.data) return [];
  return response.data.map((t) => ({
    address: t.id,
    name: t.name,
    symbol: t.symbol,
    decimals: t.decimals,
    logoURI: t.icon,
    tags: t.tags,
  }));
}

module.exports = async function getSolanaTokensFromJup() {
  const tokensVerified = await jupApiGet("verified");
  await sleep(2000);
  const tokensLst = await jupApiGet("lst");
  const jupTokensMap = new Map();
  [...tokensVerified, ...tokensLst].forEach((t) => {
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
