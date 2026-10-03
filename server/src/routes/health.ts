import { Router, Request, Response } from "express";
import { pythonScraperConfigured } from "../services/scraper";

const router = Router();
const bootedAt = new Date().toISOString();

router.get("/health", (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    status: "ok",
    message: "Backend is running!",
    uptimeSec: Math.round(process.uptime()),
    bootedAt,
    scrape: {
      concurrency: 3,
      pythonFallback: pythonScraperConfigured(),
    },
    keepAlive:
      "Ping GET /api/health about every 10 minutes. Render free/starter web services sleep after roughly 15 minutes idle. Always-on (min instances) is a paid dashboard setting and is not enabled from this repo.",
  });
});

export default router;
