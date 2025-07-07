/**
 * Always converts the input image URL to PNG and uploads to Cloudflare R2.
 * Returns a public URL of the uploaded PNG.
 */
import axios from "axios";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadBufferToR2 } from "./r2Uploader";

export async function convertToPng(imageUrl: string): Promise<string> {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const inputBuffer = Buffer.from(response.data);

  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error("Downloaded image buffer is empty.");
  }

  const pngBuffer = await sharp(inputBuffer).png().toBuffer();

  if (!pngBuffer || pngBuffer.length === 0) {
    throw new Error("PNG conversion failed. Output buffer is empty.");
  }

  const fileName = `${uuidv4()}.png`;
  return await uploadBufferToR2(pngBuffer, fileName, "image/png");
}
