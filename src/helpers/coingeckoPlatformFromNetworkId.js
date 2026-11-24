const platforms = {
  aptos: "aptos",
  avalanche: "avalanche",
  bnb: "binance-smart-chain",
  arbitrum: "arbitrum-one",
  base: "base",
  cronos: "cronos",
  elysium: "elysium-kinetiq",
  fraxtal: "fraxtal",
  gnosis: "xdai",
  hyperevm: "hyperevm",
  linea: "linea",
  manta: "manta-pacific",
  mode: "mode",
  monad: "monad",
  opbnb: "opbnb",
  scroll: "scroll",
  zksync: "zksync",
  "polygon-zkevm": "polygon-zkevm",
  ethereum: "ethereum",
  optimism: "optimistic-ethereum",
  polygon: "polygon-pos",
  plasma: "plasma",
  plume: "plume-network",
  solana: "solana",
  sonic: "sonic",
  starknet: "starknet",
  sui: "sui",
  sei: "sei",
  tron: "tron",
};

module.exports = function coingeckoPlatformFromNetworkId(networkId) {
  const platform = platforms[networkId];
  if (!platform) throw new Error("Platform is missing");
  return platform;
};
