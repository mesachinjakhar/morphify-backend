// utils/imageFormatConverter.ts
import axios from "axios";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadBufferToR2 } from "./r2Uploader";

/**
 * Always converts the input image URL to PNG and uploads to Cloudflare R2.
 * Returns a public URL of the uploaded PNG.
 */
export async function convertToPng(imageUrl: string): Promise<string> {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data);

  const pngBuffer = await sharp(buffer).png().toBuffer();
  const fileName = `${uuidv4()}.png`;

  return await uploadBufferToR2(pngBuffer, fileName, "image/png");
}
