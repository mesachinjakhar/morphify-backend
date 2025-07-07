import { preprocessImage } from "../../../utils/preprocessImage";
import { preprocessWithCache } from "../../../utils/preprocessWithCache";
import { convertToPng } from "../../../utils/convertToPng";
import {
  IProvider,
  GenerateImageInput,
  GenerateImageOutput,
  ValidationResult,
} from "../provider.interface";
import Replicate from "replicate";

export class GfpganProvider implements IProvider {
  private replicate: Replicate;

  private supportedExtensions = ["png", "jpg", "webp"];

  private getExtension(url: string): string {
    const cleanUrl = url.split("?")[0]; // remove query params
    return cleanUrl
      .slice(((cleanUrl.lastIndexOf(".") - 1) >>> 0) + 1)
      .toLowerCase();
  }

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

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    let imageUrl = input.imageUrl;

    imageUrl = await preprocessWithCache(imageUrl, this.supportedExtensions);

    // create prediction
    const prediction = await this.replicate.predictions.create({
      model: "tencentarc/gfpgan",
      input: {
        img: imageUrl,
        scale: 2, // upscaling factor
        version: 1.4, // you can pin a version if needed
      },
    });

    console.log("👉 Created GFPGAN prediction:", prediction);

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
      `GFPGAN prediction failed: ${JSON.stringify(finalPrediction)}`
    );
  }
}
