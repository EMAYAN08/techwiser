import { Router, Request, Response } from "express";
import { explainSpecAi, findAlternativesAi } from "../services/ai";

const router = Router();

router.post("/explain-spec", async (req: Request, res: Response) => {
  try {
    const { productNames, specLabel, specValues } = req.body;

    if (!productNames || !Array.isArray(productNames) || !specLabel || !specValues || !Array.isArray(specValues)) {
      res.status(400).json({ error: "Invalid payload. Required: productNames (array), specLabel (string), specValues (array)." });
      return;
    }

    const explanation = await explainSpecAi(productNames, specLabel, specValues);
    res.json(explanation);
  } catch (error: unknown) {
    console.error("Unexpected error in /api/explain-spec:", error);
    res.status(500).json({ error: "An unexpected error occurred while explaining spec." });
  }
});

router.post("/alternatives", async (req: Request, res: Response) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      res.status(400).json({ error: "Invalid payload. Required: products (array)." });
      return;
    }

    const alternatives = await findAlternativesAi(products);
    res.json(alternatives);
  } catch (error: unknown) {
    console.error("Unexpected error in /api/alternatives:", error);
    res.status(500).json({ error: "An unexpected error occurred while finding alternatives." });
  }
});

export default router;
