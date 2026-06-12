const baseConfig = require("../../jest.config.base");

module.exports = {
  ...baseConfig,
  displayName: "@omega-flow/store-aws",
  transformIgnorePatterns: ["node_modules/(?!.*nanoid)"],
  transform: {
    ...baseConfig.transform,
    "^.+\\.ts$": "ts-jest",
    "^.+\\.js$": "ts-jest",
  },
};
