import { google } from "googleapis";

export async function verifyGooglePurchase(
  purchaseToken: string,
  productId: string
): Promise<boolean> {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: "./google-service-account.json", // your service account JSON
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidpublisher = google.androidpublisher({
      version: "v3",
      auth,
    });

    const packageName = "com.morphify"; // replace with your real app package name

    const result = await androidpublisher.purchases.products.get({
      packageName,
      productId,
      token: purchaseToken,
    });

    console.log("Google Play verification response", result.data);

    /**
     * purchaseState
     * 0: Purchased
     * 1: Canceled
     * 2: Pending
     */
    if (result.data.purchaseState === 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("verifyGooglePurchase error", error);
    return false;
  }
}
