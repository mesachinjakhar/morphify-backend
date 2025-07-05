// src/services/providers/flux/fluxRestoreImageProvider.ts

import {
  IProvider,
  GenerateImageInput,
  GenerateImageOutput,
  ValidationResult,
} from "../provider.interface";
import Replicate from "replicate";

export class RestoreImageProvider implements IProvider {
  private replicate: Replicate;

  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  validateInput(input: GenerateImageInput): ValidationResult {
    if (!input.imageUrl) {
      return { isValid: false, message: "Missing required field: imageUrl" };
    }

    // optionally validate allowed values for output_format and safety_tolerance
    // if (
    //   input.output_format && !["png", "jpeg", "webp"].includes(input.output_format)
    // ) {
    //   return {
    //     isValid: false,
    //     message: "Invalid output_format, must be png, jpeg or webp.",
    //   };
    // }

    // if (
    //   input.safety_tolerance !== undefined &&
    //   (input.safety_tolerance < 0 || input.safety_tolerance > 2)
    // ) {
    //   return {
    //     isValid: false,
    //     message: "safety_tolerance must be 0, 1, or 2.",
    //   };
    // }

    return { isValid: true, message: "Valid input." };
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    // create the prediction
    const prediction = await this.replicate.predictions.create({
      version: "flux-kontext-apps/restore-image", // confirm correct version string if needed
      input: {
        input_image: input.imageUrl,
        seed: input.seed,
        output_format: "png",
        safety_tolerance: 2,
      },
      // optionally you can add: prefer: "wait=60"
    });

    console.log("👉 Created Replicate prediction:", prediction);

    // poll until finished
    let finalPrediction = prediction;
    while (
      finalPrediction.status !== "succeeded" &&
      finalPrediction.status !== "failed" &&
      finalPrediction.status !== "canceled"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 sec
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
      `Replicate prediction failed: ${JSON.stringify(finalPrediction)}`
    );
  }
}
