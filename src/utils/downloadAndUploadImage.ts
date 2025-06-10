import s3 from "../config/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import axios from "axios";

async function downloadAndUploadImage(
  imageUrl: string,
  requestId: string,
  index: number
): Promise<string> {
  try {
    // 1. Download the image as a buffer
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(response.data);
    const contentType = response.headers["content-type"] || "image/png";
    const extension = contentType.split("/")[1] || "png";

    // 2. Generate a unique file name to avoid collisions
    const timestamp = Date.now();
    const uniqueFileName = `generated-images/${requestId}-${index}-${timestamp}.${extension}`;
    // 3. Prepare the upload command for S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: uniqueFileName,
      Body: imageBuffer,
      ContentType: contentType,
      ACL: "public-read", // Make the object publicly accessible
    });

    // 4. Execute the upload
    await s3.send(uploadCommand);

    // 5. Return the new public URL of the image in your R2 bucket
    return `${process.env.R2_PUBLIC_URL}/${uniqueFileName}`;
  } catch (error: any) {
    console.error(
      `Failed to process image at index ${index} from ${imageUrl}:`,
      error.message
    );
    // Propagate the error to be caught by the main transaction logic
    throw new Error(`Could not process image ${index}`);
  }
}

export default downloadAndUploadImage;
