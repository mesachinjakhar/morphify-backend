import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import authMiddleware from "../middlewares/authMiddleware";

const router = Router();

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const user = req.user as { id: string };

  if (!user || !user.id) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  const userId = user.id;

  const { productId } = req.body;

  if (!userId || !productId) {
    res.status(400).json({ error: "Missing userId or productId" });
    return;
  }

  try {
    // look up product credits
    const product = await prisma.iapProduct.findUnique({
      where: { productId },
    });

    if (!product || !product.active) {
      res.status(400).json({ error: "Invalid or inactive productId" });
      return;
    }

    const creditsToGrant = product.credits;

    // increment user balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        mstarsBalance: { increment: creditsToGrant },
      },
    });

    res.status(200).json({
      message: "Credits granted",
      creditsGranted: creditsToGrant,
    });
    return;
  } catch (err) {
    console.error("purchase route error", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
