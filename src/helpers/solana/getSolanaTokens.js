const getTokensFromCurrentList = require("../getTokensFromCurrentList");
const getTokensFromList = require("../getTokensFromList");
const getSolanaTokensFromJup = require("./getSolanaTokensFromJup");

module.exports = async function getSolanaTokens() {
  const tokensByAddress = new Map();

  // Fetch from current version
  const currentTokens = await getTokensFromCurrentList("solana");
  currentTokens.forEach((token) => {
    tokensByAddress.set(token.address, token);
  });

  // Add from jup (overwrites current tokens with fresh data)
  const jupTokens = await getSolanaTokensFromJup();
  jupTokens.forEach((token) => {
    tokensByAddress.set(token.address, token);
  });

  // Add from json
  const listTokens = getTokensFromList("solana");
  listTokens.forEach((token) => {
    tokensByAddress.set(token.address, token);
  });

  return Array.from(tokensByAddress.values());
};
