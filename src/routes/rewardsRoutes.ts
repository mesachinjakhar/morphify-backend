import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

// --- Type Definitions for Clarity ---

// Defines the structure of the expected query parameters from Google's callback
interface AdMobSSVQuery {
  ad_network: string;
  ad_unit: string;
  custom_data: string;
  reward_amount: string;
  reward_item: string;
  timestamp: string;
  transaction_id: string;
  user_id: string; // This is the userId you set in serverSideVerificationOptions
  signature: string;
  key_id: string;
}

// Defines the structure of Google's public key object
interface GooglePublicKey {
  keyId: string;
  pem: string;
}

// **FIX**: Defines the structure of the overall JSON response from Google's key server
interface GoogleKeysResponse {
  keys: GooglePublicKey[];
}

// --- In-Memory Cache for Public Keys ---
let publicKeyCache: GooglePublicKey[] = [];
let lastKeyFetchTimestamp = 0;
const KEY_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const GOOGLE_PUBLIC_KEYS_URL =
  "https://www.gstatic.com/admob/reward/verifier-keys.json";

/**
 * Fetches and caches Google's public keys for signature verification.
 */
async function getPublicKeys(): Promise<GooglePublicKey[]> {
  const now = Date.now();
  if (
    publicKeyCache.length > 0 &&
    now - lastKeyFetchTimestamp < KEY_CACHE_DURATION_MS
  ) {
    return publicKeyCache;
  }
  try {
    const response = await fetch(GOOGLE_PUBLIC_KEYS_URL);
    if (!response.ok)
      throw new Error(`Failed to fetch keys: ${response.statusText}`);
    // **FIX**: Cast the JSON response to our defined type to resolve the 'unknown' error.
    const keysJson = (await response.json()) as GoogleKeysResponse;
    if (!keysJson.keys || !Array.isArray(keysJson.keys)) {
      throw new Error("Invalid key format received from Google.");
    }
    publicKeyCache = keysJson.keys;
    lastKeyFetchTimestamp = now;
    return publicKeyCache;
  } catch (error) {
    console.error(
      "Could not fetch public keys. Using stale cache if available.",
      error
    );
    return publicKeyCache;
  }
}

// --- Prisma Database/Wallet Interaction ---

/**
 * Checks if a transaction has already been processed using Prisma.
 * @param {string} transactionId - The unique ID for the ad reward.
 * @returns {Promise<boolean>} True if the transaction has been processed, false otherwise.
 */
async function hasProcessedTransaction(
  transactionId: string
): Promise<boolean> {
  const existingTransaction = await prisma.adRewardTransaction.findUnique({
    where: { id: transactionId },
  });
  // Returns true if a transaction is found (not null), false otherwise.
  return !!existingTransaction;
}

/**
 * Atomically updates the user's wallet and records the ad transaction using Prisma.
 * @param {string} transactionId - The unique ID for the ad reward.
 * @param {string} userId - The user's unique identifier.
 * @param {number} amount - The amount to add to the wallet (e.g., 0.25).
 */
async function grantRewardAndRecordTransaction(
  transactionId: string,
  userId: string,
  amount: number
): Promise<void> {
  // Prisma's $transaction API ensures that both database operations succeed or both fail together.
  // This is crucial for preventing inconsistent data, like a user getting a reward
  // without the transaction being recorded.
  await prisma.$transaction([
    // Operation 1: Update the user's wallet by incrementing the 'mstar' field.
    prisma.user.update({
      where: { id: userId },
      data: { mstarsBalance: { increment: amount } },
    }),
    // Operation 2: Create the ad reward transaction record to prevent replay attacks.
    prisma.adRewardTransaction.create({
      data: {
        id: transactionId,
        userId: userId,
      },
    }),
  ]);
  console.log(
    `Successfully recorded transaction ${transactionId} and updated wallet for user ${userId}`
  );
}

// --- Express Router ---

const router = Router();

router.get("/verify", async (req: Request, res: Response) => {
  console.log("Received verification request with params: ", req.query);

  const query = req.query as unknown as AdMobSSVQuery;

  try {
    // 1. Basic validation for required parameters
    if (!query.signature || !query.key_id) {
      res.status(400).send("Signature or key_id missing.");
      return;
    }

    // 2. Prevent Replay Attacks by checking if the transaction is already processed
    const alreadyProcessed = await hasProcessedTransaction(
      query.transaction_id
    );
    if (alreadyProcessed) {
      console.warn(
        `Attempted to replay transaction_id: ${query.transaction_id}`
      );
      // Respond with 200 OK to not give attackers information, but do not grant the reward.
      res.status(200).send("Request already processed.");
      return;
    }

    // 3. Fetch Google's Public Keys (from cache or network)
    const publicKeys = await getPublicKeys();
    const publicKey = publicKeys.find(
      (key) => key.keyId.toString() === query.key_id
    );

    if (!publicKey) {
      console.error(`Could not find public key for key_id: ${query.key_id}`);
      res.status(400).send("Cannot verify signature; public key not found.");
      return;
    }

    // 4. Construct the message to verify
    // The content is the full query string, *excluding* the `signature` and `key_id` parameters.
    const messageToVerify = Object.entries(query)
      .filter(([key]) => key !== "signature" && key !== "key_id")
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const verifier = crypto.createVerify("sha256");
    verifier.update(messageToVerify);

    // The signature is in a URL-safe base64 format and needs conversion.
    const signatureBase64 = query.signature
      .replace(/_/g, "/")
      .replace(/-/g, "+");
    const isVerified = verifier.verify(
      publicKey.pem,
      signatureBase64,
      "base64"
    );

    // 5. Grant Reward if Signature is Valid
    if (isVerified) {
      console.log("Signature successfully verified!");

      const userId = query.user_id; // The user ID from the SSV callback
      const rewardAmount = 0.25; // The specified reward amount

      // This single function handles both database operations atomically.
      await grantRewardAndRecordTransaction(
        query.transaction_id,
        userId,
        rewardAmount
      );

      res
        .status(200)
        .json({ status: "success", message: `Reward granted to ${userId}.` });
    } else {
      console.error("Signature verification failed.");
      res.status(400).send("Signature verification failed.");
    }
  } catch (error) {
    // Prisma can throw specific errors (e.g., if a user doesn't exist during the update).
    // It's good practice to log the specific error for debugging.
    console.error("An error occurred during verification:", error);
    res.status(500).send("Internal server error.");
  }
});

export default router;
