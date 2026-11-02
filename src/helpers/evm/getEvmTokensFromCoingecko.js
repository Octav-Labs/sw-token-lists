const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const axios = require("axios");
const { getAddress } = require("@ethersproject/address");
const { StaticJsonRpcProvider } = require("@ethersproject/providers");
const listStaticConfigs = require("../../assets/listStaticConfigs.json");
const coingeckoPlatformFromNetworkId = require("../coingeckoPlatformFromNetworkId");
const getErc20Decimals = require("./getErc20Decimals");
const uriSchema = require("../../schemas/uriSchema");
const getCoingeckoCoinsList = require("../getCoingeckoCoinsList");

const uriValidate = addFormats(new Ajv()).compile(uriSchema);

async function getBulkTokensByAddress(platform) {
  const res = await axios.get(
    `https://tokens.coingecko.com/${platform}/all.json`,
    { timeout: 120000 }
  );
  if (!res.data || !res.data.tokens)
    throw new Error(`Failed to fetch Coingecko's token list: ${platform}`);

  const bulkTokensByAddress = new Map();
  res.data.tokens.forEach((token) => {
    try {
      bulkTokensByAddress.set(getAddress(token.address), token);
    } catch (error) {
      // Skip invalid addresses
    }
  });
  return bulkTokensByAddress;
}

// The bulk list links to thumbnails, the published lists use the small size
function getSmallLogoURI(logoURI) {
  if (!logoURI) return undefined;
  const smallLogoURI = logoURI
    .replace("https://assets.coingecko.com/", "https://coin-images.coingecko.com/")
    .replace("/thumb/", "/small/");
  return uriValidate(smallLogoURI) ? smallLogoURI : undefined;
}

module.exports = async function getEvmTokensFromCoingecko(
  networkId,
  currentTokensMap
) {
  const coinsList = await getCoingeckoCoinsList();
  const tokensByAddress = new Map();
  const platform = coingeckoPlatformFromNetworkId(networkId);
  const chainId = listStaticConfigs[networkId]?.chainId;
  if (!chainId) throw new Error("List static config or chainId is missing ");
  const rpcEndpoint = listStaticConfigs[networkId]?.rpcEndpoint;
  if (!rpcEndpoint)
    throw new Error("List static config or rpcEndpoint is missing ");
  const provider = new StaticJsonRpcProvider(
    {
      url: rpcEndpoint,
    },
    chainId
  );
  const bulkTokensByAddress = await getBulkTokensByAddress(platform);

  for (let i = 0; i < coinsList.length; i++) {
    const coin = coinsList[i];
    if (!coin.id || !coin.platforms || !coin.platforms[platform]) continue;
    let address;
    try {
      address = getAddress(coin.platforms[platform]);
    } catch (error) {
      continue;
    }

    const existingToken = currentTokensMap.get(address);

    if (existingToken && Math.random() > 0.05) {
      tokensByAddress.set(address, existingToken);
      continue;
    }
    if (tokensByAddress.get(address)) continue;
    const bulkToken = bulkTokensByAddress.get(address);
    let decimals = bulkToken?.decimals || null;
    if (bulkToken && decimals === null)
      decimals = await getErc20Decimals(address, provider);
    if (decimals === null) {
      if (existingToken) tokensByAddress.set(address, existingToken);
      continue;
    }
    const token = {
      chainId,
      address,
      decimals,
      name: coin.name,
      symbol: (coin.symbol || bulkToken.symbol).toUpperCase(),
      logoURI: getSmallLogoURI(bulkToken.logoURI),
      extensions: {
        coingeckoId: coin.id,
      },
    };
    tokensByAddress.set(address, token);
  }
  return Array.from(tokensByAddress.values());
};
