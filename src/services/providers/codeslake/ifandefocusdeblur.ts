import { preprocessImage } from "../../../utils/preprocessImage";
import { convertToPng } from "../../../utils/convertToPng";
import { preprocessWithCache } from "../../../utils/preprocessWithCache";

import {
  IProvider,
  GenerateImageInput,
  GenerateImageOutput,
  ValidationResult,
} from "../provider.interface";
import Replicate from "replicate";

export class IfanDefocusDeblurProvider implements IProvider {
  private replicate: Replicate;

  private supportedExtensions = ["png", "jpeg"];

  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  private getExtension(url: string): string {
    const cleanUrl = url.split("?")[0]; // remove query params
    return cleanUrl
      .slice(((cleanUrl.lastIndexOf(".") - 1) >>> 0) + 1)
      .toLowerCase();
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

    const prediction = await this.replicate.predictions.create({
      version:
        "ea3b2e163e2ad629fb23e81a1cc9e485c32aa4a53eba4fe08b7dbdd39e6e381e",
      model: "codeslake/ifan-defocus-deblur",
      input: {
        image: imageUrl,
      },
    });

    console.log("👉 Created IfanDefocusDeblur prediction:", prediction);

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
      `IfanDefocusDeblur prediction failed: ${JSON.stringify(finalPrediction)}`
    );
  }
}
