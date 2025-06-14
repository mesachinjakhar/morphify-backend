/**
 * src/services/s3.service.ts
 * * This service encapsulates all logic for interacting with an S3-compatible
 * object storage service (like AWS S3, Cloudflare R2, or MinIO).
 */
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import s3 from "../config/s3";

// --- Initialize the S3 Client ---
// For Cloudflare R2, you need to provide the specific endpoint.
// The SDK will automatically pick up credentials from environment variables
// (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).

let BUCKET_NAME = process.env.BUCKET_NAME;

if (!BUCKET_NAME) {
  BUCKET_NAME = "morphify";
}

if (!BUCKET_NAME) {
  throw new Error("AWS_S3_BUCKET_NAME environment variable is not set.");
}

/**
 * Uploads a buffer to S3.
 * @param buffer The file content as a Buffer.
 * @param contentType The MIME type of the file (e.g., 'image/png').
 * @returns The final URL of the uploaded object.
 */
const uploadBufferToS3 = async (
  buffer: Buffer,
  contentType: string
): Promise<string> => {
  const key = `generated-images/${uuidv4()}.png`; // Create a unique filename

  const params: PutObjectCommandInput = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // ACL is not typically used with R2 in the same way. Bucket permissions are handled in the Cloudflare dashboard.
  };

  try {
    const command = new PutObjectCommand(params);
    await s3.send(command);
    console.log(`Successfully uploaded to R2. Key: ${key}`);
    // Construct the public URL using your custom Cloudflare domain.
    return `https://morphify-cdn.botcmd.com/${key}`;
  } catch (error) {
    console.error("Error uploading buffer to R2:", error);
    throw new Error("Failed to upload image to storage.");
  }
};

/**
 * Downloads an image from a public URL and uploads it to S3.
 * @param imageUrl The public URL of the image to download.
 * @returns The final URL of the uploaded object in S3.
 */
const downloadAndUploadToS3 = async (imageUrl: string): Promise<string> => {
  try {
    console.log(`[DEBUG] Attempting to download from URL: ${imageUrl}`);

    // 1. Download the image from the provided URL
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });

    // --- DEBUGGING LOGS ---
    // Let's inspect the response to see what we actually received.
    console.log(`[DEBUG] Download response status: ${response.status}`);
    console.log(
      `[DEBUG] Response content-type header: ${response.headers["content-type"]}`
    );
    console.log(
      `[DEBUG] Response content-length header: ${response.headers["content-length"]}`
    );

    // The conversion from an ArrayBuffer to a Node.js Buffer is correct.
    const imageBuffer = Buffer.from(response.data);

    console.log(
      `[DEBUG] Created buffer with size: ${imageBuffer.length} bytes.`
    );

    // --- SANITY CHECK ---
    // A valid image will be more than a few hundred bytes. If it's this small,
    // the source URL likely returned an error message instead of an image.
    if (imageBuffer.length < 100) {
      throw new Error(
        `Downloaded file is only ${imageBuffer.length} bytes. This is not a valid image. Please check the source URL.`
      );
    }

    const contentType =
      response.headers["content-type"]?.toString() || "image/png";

    // 2. Upload the downloaded buffer to S3
    return await uploadBufferToS3(imageBuffer, contentType);
  } catch (error: any) {
    // Log the full error for better insight
    console.error(
      `[ERROR] Failed to download or process from URL ${imageUrl}:`,
      error.message
    );
    // Re-throw to ensure the job is marked as failed.
    throw new Error(
      `Failed to process image from URL. Reason: ${error.message}`
    );
  }
};

/**
 * Decodes a Base64 string and uploads the resulting buffer to S3.
 * @param b64Json The Base64 encoded image string.
 * @returns The final URL of the uploaded object in S3.
 */
const uploadB64ToS3 = async (b64Json: string): Promise<string> => {
  try {
    const imageBuffer = Buffer.from(b64Json, "base64");

    // --- SANITY CHECK for Base64 as well ---
    if (imageBuffer.length < 100) {
      throw new Error(
        `Decoded Base64 data is only ${imageBuffer.length} bytes. This is not a valid image.`
      );
    }

    return await uploadBufferToS3(imageBuffer, "image/png");
  } catch (error: any) {
    console.error("Error decoding or uploading Base64 string:", error.message);
    throw new Error(
      `Failed to process Base64 image data. Reason: ${error.message}`
    );
  }
};

// Export the functions to be used by our workers
export const S3Service = {
  downloadAndUploadToS3,
  uploadB64ToS3,
};
