import axios from "axios";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadBufferToR2 } from "./r2Uploader";

/**
 * Formats that may contain EXIF orientation
 */
const exifFormats = ["jpeg", "jpg", "heic", "tiff"];

/**
 * Extracts the file extension from a URL (without query strings)
 */
function getFileExtension(url: string): string {
  const cleanUrl = url.split("?")[0];
  const parts = cleanUrl.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Processes the image based on model-supported formats and EXIF rotation.
 *
 * @param imageUrl URL of the image
 * @param supportedFormats Array of formats this model supports (e.g. ["png", "jpeg"])
 * @returns final usable image URL (either original or uploaded PNG)
 */
export async function preprocessImage(
  imageUrl: string,
  supportedFormats: string[]
): Promise<string> {
  const extFromUrl = getFileExtension(imageUrl);
  console.log("passed Url: ", imageUrl);
  console.log("extFromUrl:", extFromUrl);
  console.log("supportedFromat: ", supportedFormats);
  const isExtensionSupported = supportedFormats.includes(extFromUrl);
  const shouldCheckRotation = exifFormats.includes(extFromUrl);

  // 🔁 CASE 1: Supported format & no rotation needed → return original
  if (isExtensionSupported && !shouldCheckRotation) {
    console.log(
      "✅ CASE 1: Supported format with no rotation required. Skipping processing."
    );
    return imageUrl;
  }

  // 📥 Download image for inspection
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const inputBuffer = Buffer.from(response.data);
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  const actualFormat = metadata.format ?? extFromUrl;
  const isActualFormatSupported = supportedFormats.includes(actualFormat);
  const hasExifRotation = metadata.orientation && metadata.orientation !== 1;

  const needsRotation = exifFormats.includes(actualFormat) && hasExifRotation;
  const needsConversion = !isActualFormatSupported;

  // 🌀 CASE 2: Supported format, but needs rotation
  if (isActualFormatSupported && needsRotation) {
    console.log("🔁 CASE 2: Rotation needed for supported format.");
    const rotatedBuffer = await image
      .rotate()
      .toFormat(actualFormat)
      .toBuffer();
    const fileName = `${uuidv4()}.${actualFormat}`;
    return await uploadBufferToR2(
      rotatedBuffer,
      fileName,
      `image/${actualFormat}`
    );
  }

  // 🎨 CASE 3: Unsupported format, no rotation needed
  if (!isActualFormatSupported && !needsRotation) {
    console.log(
      "🎨 CASE 3: Format not supported, no rotation needed. Converting."
    );
    const convertedBuffer = await image.png().toBuffer();
    const fileName = `${uuidv4()}.png`;
    return await uploadBufferToR2(convertedBuffer, fileName, "image/png");
  }

  // 🔄 CASE 4: Unsupported format and needs rotation
  if (!isActualFormatSupported && needsRotation) {
    console.log(
      "🔄 CASE 4: Format not supported and rotation required. Rotating + converting."
    );
    const processedBuffer = await image.rotate().png().toBuffer();
    const fileName = `${uuidv4()}.png`;
    return await uploadBufferToR2(processedBuffer, fileName, "image/png");
  }

  // 🛑 Fallback: format is supported, no rotation — but we couldn't detect properly
  console.log("⚠️ Unexpected fallback triggered. Returning original image.");
  return imageUrl;
}
