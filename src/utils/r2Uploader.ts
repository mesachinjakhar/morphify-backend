import { Readable } from "stream";
import s3 from "../config/s3";
import { ObjectCannedACL, PutObjectCommand } from "@aws-sdk/client-s3";

// Load from env or config
const R2_BUCKET_NAME = process.env.BUCKET_NAME!;
const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL!; // e.g. https://morphify-cdn.botcmd.com

export async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  mimeType = "image/png"
): Promise<string> {
  // ✅ Prepend proper folder structure to key
  const fullKey = `/converted/${key}`;

  const uploadParams = {
    Bucket: R2_BUCKET_NAME,
    Key: fullKey,
    Body: Readable.from(buffer),
    ContentType: mimeType,
    ACL: "public-read" as ObjectCannedACL,
    ContentLength: buffer.length,
  };

  console.log("Uploading converted image to R2:", fullKey);
  await s3.send(new PutObjectCommand(uploadParams));

  const publicUrl = `${R2_PUBLIC_URL_BASE}${fullKey}`;
  console.log("✅ Uploaded converted image to R2 at:", publicUrl);

  return publicUrl;
}
