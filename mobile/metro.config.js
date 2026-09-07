const { getDefaultConfig } = require("expo/metro-config");
const { handleBarcodeApi } = require("./metro.barcode-api");

const config = getDefaultConfig(__dirname);
const previous = config.server && config.server.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const nextMw = previous ? previous(middleware, server) : middleware;
    return (req, res, next) => {
      const path = String(req.url || "").split("?")[0];
      if (path === "/api/barcode") {
        return handleBarcodeApi(req, res);
      }
      return nextMw(req, res, next);
    };
  },
};

module.exports = config;
