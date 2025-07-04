import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import authMiddleware from "../middlewares/authMiddleware";
import {
  verifyGoogleProductPurchase,
  verifyGoogleSubscriptionPurchase,
} from "../utils/verifyGooglePurchase";

const router = Router();

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const user = req.user as { id: string };

  if (!user || !user.id) {
    res.status(400).json({ status: "fail", message: "Missing userId" });
    return;
  }

  const userId = user.id;

  const { productId, purchaseToken } = req.body;

  if (!purchaseToken || !productId) {
    res
      .status(400)
      .json({ status: "fail", message: "Missing purchaseToken or productId" });
    return;
  }

  let isValid = false;

  if (productId === "no_ads_monthly") {
    isValid = await verifyGoogleSubscriptionPurchase(purchaseToken, productId);
  } else {
    isValid = await verifyGoogleProductPurchase(purchaseToken, productId);
  }

  if (!isValid) {
    res.status(400).json({ status: "fail", message: "Invalid purchase token" });
    return;
  }

  try {
    // look up product credits
    const product = await prisma.iapProduct.findUnique({
      where: { productId },
    });

    if (!product || !product.active) {
      res
        .status(400)
        .json({ status: "fail", message: "Invalid or inactive productId" });
      return;
    }

    if (productId === "no_ads_monthly") {
      // grant ad-free for 1 month from today
      const adFreeUntil = new Date();
      adFreeUntil.setMonth(adFreeUntil.getMonth() + 1);

      await prisma.user.update({
        where: { id: userId },
        data: { showAds: false, adFreeUntil },
      });

      res.status(200).json({
        status: "success",
        message: "Ad-free subscription activated",
        adFreeUntil,
        type: "ads-subscription",
      });
      return;
    }

    const creditsToGrant = product.credits;

    // increment user balance
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        mstarsBalance: { increment: creditsToGrant },
      },
    });

    res.status(200).json({
      status: "success",
      message: "Credits granted",
      creditsGranted: creditsToGrant,
      newBalance: user.mstarsBalance,
    });
  } catch (err) {
    console.error("purchase route error", err);
    res.status(500).json({ status: "fail", message: "Server error" });
  }
});

export default router;
