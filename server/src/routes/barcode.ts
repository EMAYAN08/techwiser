import { Router, Request, Response } from "express";
import { lookupBarcode, resolveProductNames } from "../services/barcode";

const router = Router();

router.post("/barcode", async (req: Request, res: Response) => {
  try {
    const code = String(req.body?.code || req.body?.upc || req.body?.ean || "").trim();
    if (!code) {
      res.status(400).json({ error: "A UPC or EAN code is required." });
      return;
    }
    const data = await lookupBarcode(code);
    res.json({ data });
  } catch (error: unknown) {
    console.error("Unexpected error in /api/barcode:", error);
    res.status(500).json({ error: "Failed to look up that barcode." });
  }
});

router.post("/resolve-names", async (req: Request, res: Response) => {
  try {
    const { names } = req.body;
    console.log(`[resolve-names] Received request to resolve ${names?.length || 0} names:`, names);

    if (!names || !Array.isArray(names) || names.length === 0) {
      console.warn(`[resolve-names] Invalid request payload:`, req.body);
      res.status(400).json({ error: "An array of product names is required." });
      return;
    }

    const urls = await resolveProductNames(names);
    console.log(`[resolve-names] Successfully resolved ${urls.length} URLs:`, urls);
    res.json({ urls });
  } catch (error: unknown) {
    console.error(`[resolve-names] Unexpected error processing request for names:`, req.body?.names, error);
    res.status(500).json({ error: "Failed to resolve product names." });
  }
});

export default router;
