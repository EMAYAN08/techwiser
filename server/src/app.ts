import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import barcodeRouter from "./routes/barcode";
import compareRouter from "./routes/compare";
import scrapeRouter from "./routes/scrape";
import specsRouter from "./routes/specs";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", barcodeRouter);
  app.use("/api", compareRouter);
  app.use("/api", scrapeRouter);
  app.use("/api", specsRouter);

  return app;
}
