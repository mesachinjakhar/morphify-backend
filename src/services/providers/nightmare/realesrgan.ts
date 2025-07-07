import { preprocessImage } from "../../../utils/preprocessImage";
import { convertToPng } from "../../../utils/convertToPng";
import {
  IProvider,
  GenerateImageInput,
  GenerateImageOutput,
  ValidationResult,
} from "../provider.interface";
import Replicate from "replicate";

export class RealEsrganProvider implements IProvider {
  private replicate: Replicate;

  // Supported image extensions
  private supportedExtensions = ["png", "jpg", "webp"];

  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  validateInput(input: GenerateImageInput): ValidationResult {
    if (!input.imageUrl) {
      return { isValid: false, message: "Missing required field: imageUrl" };
    }
    return { isValid: true, message: "Valid input." };
  }

  private getExtension(url: string): string {
    const cleanUrl = url.split("?")[0]; // remove query params
    return cleanUrl
      .slice(((cleanUrl.lastIndexOf(".") - 1) >>> 0) + 1)
      .toLowerCase();
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    let imageUrl = input.imageUrl;

    imageUrl = await preprocessImage(imageUrl, this.supportedExtensions);

    const prediction = await this.replicate.predictions.create({
      model: "nightmareai/real-esrgan",
      version:
        "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa", // the correct version hash for Real-ESRGAN
      input: {
        image: imageUrl,
        scale: 2, // 2x upscale
        face_enhance: true, // optional, you can also expose to users
      },
    });

    console.log("👉 Created Real-ESRGAN prediction:", prediction);

    let finalPrediction = prediction;
    while (
      finalPrediction.status !== "succeeded" &&
      finalPrediction.status !== "failed" &&
      finalPrediction.status !== "canceled"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      finalPrediction = await this.replicate.predictions.get(
        finalPrediction.id
      );
      console.log(`👉 Polled status [${finalPrediction.status}]`);
    }

    if (finalPrediction.status === "succeeded" && finalPrediction.output) {
      console.log("✅ Final output:", finalPrediction.output);

      if (typeof finalPrediction.output === "string") {
        return { type: "url", data: finalPrediction.output };
      }
      if (
        Array.isArray(finalPrediction.output) &&
        typeof finalPrediction.output[0] === "string"
      ) {
        return { type: "url", data: finalPrediction.output[0] };
      }
      throw new Error(
        `Final output in unexpected format: ${JSON.stringify(finalPrediction.output)}`
      );
    }

    throw new Error(
      `Real-ESRGAN prediction failed: ${JSON.stringify(finalPrediction)}`
    );
  }
}
