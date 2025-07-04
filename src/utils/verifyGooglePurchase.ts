import { google } from "googleapis";
import path from "path";

export async function verifyGoogleProductPurchase(
  purchaseToken: string,
  productId: string
): Promise<boolean> {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(__dirname, "../../google-service-account.json"),
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidpublisher = google.androidpublisher({
      version: "v3",
      auth,
    });

    const packageName = "com.morphify";

    const result = await androidpublisher.purchases.products.get({
      packageName,
      productId,
      token: purchaseToken,
    });

    console.log("verifyProduct result", result.data);

    if (result.data.purchaseState === 0) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("verifyGoogleProductPurchase error", error);
    return false;
  }
}

export async function verifyGoogleSubscriptionPurchase(
  purchaseToken: string,
  subscriptionId: string
): Promise<boolean> {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(__dirname, "../../google-service-account.json"),
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const androidpublisher = google.androidpublisher({
      version: "v3",
      auth,
    });

    const packageName = "com.morphify";

    const result = await androidpublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    console.log("verifySubscription result", result.data);

    if (
      result.data.paymentState === 1 || // Payment received
      result.data.paymentState === 2 // Payment pending but in trial
    ) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("verifyGoogleSubscriptionPurchase error", error);
    return false;
  }
}
