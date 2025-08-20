const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const axios = require("axios");
const listStaticConfigs = require("../assets/listStaticConfigs.json");
const coingeckoPlatformFromNetworkId = require("./coingeckoPlatformFromNetworkId");
const sleep = require("./sleep");
const uriSchema = require("../schemas/uriSchema");
const getCoingeckoCoinsList = require("./getCoingeckoCoinsList");
const getTokenDecimals = require("./getTokenDecimals");
const formatTokenAddress = require("./formatTokenAddress");

const uriValidate = addFormats(new Ajv()).compile(uriSchema);

module.exports = async function getTokensFromCoingecko(
  networkId,
  currentTokensMap
) {
  const coinsList = await getCoingeckoCoinsList();
  const tokensByAddress = new Map();
  const platform = coingeckoPlatformFromNetworkId(networkId);
  const chainId = listStaticConfigs[networkId]?.chainId;
  if (!chainId) throw new Error("List static config or chainId is missing");

  for (let i = 0; i < coinsList.length; i++) {
    const coin = coinsList[i];
    if (!coin.id || !coin.platforms || !coin.platforms[platform]) continue;
    let address;
    try {
      address = formatTokenAddress(coin.platforms[platform], networkId);
    } catch (error) {
      continue;
    }
    const existingToken = currentTokensMap.get(address);

    if (existingToken && Math.random() > 0.05) {
        tokensByAddress.set(address, existingToken);
        continue;
    }
    if (tokensByAddress.get(address)) continue;
    const coinDetailsResponse = await axios
      .get(`https://api.coingecko.com/api/v3/coins/${coin.id}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: false,
          sparkline: false,
        },
      })
      .catch(() => null);
    await sleep(5000);
    if (!coinDetailsResponse || !coinDetailsResponse.data) {
        if (existingToken) tokensByAddress.set(address, existingToken);
        continue;
    }
    const coinDetails = coinDetailsResponse.data;

    // Decimals
    let decimals =
      coinDetails.detail_platforms?.[platform].decimal_place || null;
    if (decimals === null)
      decimals = await getTokenDecimals(networkId, address);
    if (decimals === null) continue;

    const isUriValid = uriValidate(coinDetails.image.small);
    const logoURI = isUriValid ? coinDetails.image.small : undefined;
    const token = {
      chainId,
      address,
      decimals,
      name: coinDetails.name,
      symbol: coinDetails.symbol,
      logoURI,
      extensions: {
        coingeckoId: coinDetails.id,
      },
    };
    tokensByAddress.set(address, token);
  }
  await sleep(30000);
  return Array.from(tokensByAddress.values());
};
