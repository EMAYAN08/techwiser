const http = require("http");
const { getDefaultConfig } = require("expo/metro-config");
const { handleBarcodeApi } = require("./metro.barcode-api");

const API_PORT = Number(process.env.API_PROXY_PORT || 3000);

function proxyToBackend(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${API_PORT}` };
  delete headers.connection;
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers,
      timeout: 300000,
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    }
  );
  upstream.on("timeout", () => {
    upstream.destroy();
    if (!res.headersSent) {
      res.statusCode = 504;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Backend timed out" }));
    }
  });
  upstream.on("error", () => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Backend unavailable" }));
    }
  });
  req.pipe(upstream);
}

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
      if (path.startsWith("/api/")) {
        return proxyToBackend(req, res);
      }
      return nextMw(req, res, next);
    };
  },
};

module.exports = config;
