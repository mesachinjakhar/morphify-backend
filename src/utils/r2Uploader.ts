// utils/r2Uploader.ts
import { Readable } from "stream";
import s3 from "../config/s3";
import { ObjectCannedACL, PutObjectCommand } from "@aws-sdk/client-s3";

// Load from env or config
const R2_BUCKET_NAME = process.env.BUCKET_NAME!;
const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL!; // e.g. https://<bucket>.r2.dev/

export async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  mimeType = "image/png"
): Promise<string> {
  const uploadParams: {
    Bucket: string;
    Key: string;
    Body: Readable;
    ContentType: string;
    ACL: ObjectCannedACL;
  } = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: Readable.from(buffer),
    ContentType: mimeType,
    ACL: "public-read",
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `${R2_PUBLIC_URL_BASE}/converted/${key}`;
}
