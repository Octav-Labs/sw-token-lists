const evmSchema = require("./evmSchema");

const tronSchema = JSON.parse(JSON.stringify(evmSchema));
tronSchema.definitions.TokenInfo.properties.address.pattern =
  "^T[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{33}$";
tronSchema.definitions.TokenInfo.properties.address.examples = [
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
];
module.exports = tronSchema;
